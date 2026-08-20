// src/components/CustomerStorefront.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Package, Plus, Minus, CheckCircle, Search, ShieldCheck, X, User, MapPin, Timer, ChevronRight, LogOut, Trash2, FileText, Heart, Sparkles, ArrowRight, Store } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import TestimonialsSection from './TestimonialsSection';
import Footer from './Footer';

export default function CustomerStorefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // User & View State
  const [session, setSession] = useState(null);
  const [viewTab, setViewTab] = useState('shop');
  const [myOrders, setMyOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Product Details Modal State & Gallery Preview
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState('');

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Selected Variants State for each product
  const [selectedVariants, setSelectedVariants] = useState({});

  // Delivery Fee Rules & Coupons State
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Addresses State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddressForm, setNewAddressForm] = useState({ title: 'Home', address: '', phone: '' });
  const [showAddAddressBox, setShowAddAddressBox] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: '', phone: '', address: '' });

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
      }
    });

    fetchStoreData();
    fetchDeliveryRules();
    fetchBanners();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, varRes] = await Promise.all([
        supabase.from('products').select('*, categories(name), shopkeeper_profiles(store_name)').eq('approval_status', 'approved').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_variants').select('*')
      ]);

      const rawProducts = prodRes.data || [];
      const rawVariants = varRes.data || [];

      const productsWithVariants = rawProducts.map(p => {
        const pVariants = rawVariants.filter(v => v.product_id === p.id);
        if (pVariants.length > 0) {
          setSelectedVariants(prev => ({ ...prev, [p.id]: pVariants[0].id }));
        }
        return { ...p, variants: pVariants };
      });

      setProducts(productsWithVariants);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async (userId) => {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id, products(*, categories(name), shopkeeper_profiles(store_name))')
      .eq('user_id', userId);

    if (!error && data) {
      setWishlistIds(data.map(w => w.product_id));
      setWishlistProducts(data.map(w => w.products).filter(Boolean));
    }
  };

  const toggleWishlist = async (productId, e) => {
    e.stopPropagation();
    if (!session) { navigate('/login'); return; }

    const isAlreadyWishlisted = wishlistIds.includes(productId);

    if (isAlreadyWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', session.user.id).eq('product_id', productId);
      if (!error) {
        setWishlistIds(prev => prev.filter(id => id !== productId));
        setWishlistProducts(prev => prev.filter(p => p.id !== productId));
      }
    } else {
      const { error } = await supabase.from('wishlists').insert([{ user_id: session.user.id, product_id: productId }]);
      if (!error) {
        setWishlistIds(prev => [...prev, productId]);
        const prodToAdd = products.find(p => p.id === productId);
        if (prodToAdd) setWishlistProducts(prev => [...prev, prodToAdd]);
      }
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setBanners(data);
  };

  const fetchMyOrders = async (email) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (!error) setMyOrders(data || []);
  };

  const fetchSavedAddresses = async (userId) => {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedAddresses(data);
      if (data.length > 0) {
        setSelectedAddressId(data[0].id);
        setAddressForm(prev => ({ ...prev, phone: data[0].phone || '', address: data[0].address || '' }));
      }
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase.from('customer_addresses').insert([{
      user_id: session.user.id,
      title: newAddressForm.title,
      address: newAddressForm.address,
      phone: newAddressForm.phone
    }]);

    if (!error) {
      setNewAddressForm({ title: 'Home', address: '', phone: '' });
      setShowAddAddressBox(false);
      fetchSavedAddresses(session.user.id);
    }
  };

  const handleDeleteAddress = async (id) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    if (session) fetchSavedAddresses(session.user.id);
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));
  };

  const addToCart = (product) => {
    const variantId = selectedVariants[product.id];
    const variant = product.variants?.find(v => v.id === variantId);
    
    const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;
    const itemTitle = variant ? `${product.name} (${variant.unit_label})` : product.name;
    const itemPrice = variant ? variant.price : product.price;
    const itemStock = variant ? variant.stock : product.stock;

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId 
            ? { ...item, quantity: Math.min(itemStock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { cartItemId, product, variant, title: itemTitle, price: itemPrice, quantity: 1, stock: itemStock }];
    });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    const matchedRule = deliveryRules.find(r => cartSubtotal >= r.min_cart_value && cartSubtotal <= r.max_cart_value);
    setDeliveryFee(matchedRule ? matchedRule.delivery_fee : (deliveryRules.length > 0 ? 0 : 40));
  }, [cartSubtotal, deliveryRules]);

  useEffect(() => {
    if (appliedCoupon) {
      if (cartSubtotal < (appliedCoupon.min_order_value || 0)) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
      } else {
        let discount = appliedCoupon.discount_type === 'percentage' 
          ? (cartSubtotal * appliedCoupon.discount_value) / 100 
          : appliedCoupon.discount_value;
        setDiscountAmount(Math.min(discount, cartSubtotal));
      }
    }
  }, [cartSubtotal]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponInput.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      alert("Invalid or expired coupon code.");
      return;
    }

    if (cartSubtotal < (data.min_order_value || 0)) {
      alert(`Minimum order value of ₹${data.min_order_value} required for this coupon.`);
      return;
    }

    let discount = data.discount_type === 'percentage' ? (cartSubtotal * data.discount_value) / 100 : data.discount_value;
    setDiscountAmount(Math.min(discount, cartSubtotal));
    setAppliedCoupon(data);
    setCouponInput('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!session) { navigate('/login'); return; }
    if (cart.length === 0) return;
    setCheckingOut(true);

    try {
      // Generate 4-digit OTP for delivery verification
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_email: session.user.email,
          customer_id: session.user.id,
          total_amount: cartTotal,
          status: 'pending',
          delivery_address: addressForm.address,
          phone: addressForm.phone,
          otp: generatedOtp
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      for (const item of cart) {
        if (item.variant) {
          await supabase.from('product_variants').update({ stock: item.variant.stock - item.quantity }).eq('id', item.variant.id);
        } else {
          await supabase.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product.id);
        }
      }

      setOrderSuccess(orderData.id.slice(0, 8));
      setCart([]);
      setIsCartOpen(false);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      fetchStoreData();
      fetchMyOrders(session.user.email);
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50/70 pb-32 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewTab('shop')}>
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl">HS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-stone-900 leading-tight">Harraiya Super Market</span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-max flex items-center gap-1 mt-0.5 border border-emerald-200">
                <Sparkles size={10} /> Quick
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-2 hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-600 transition" size={18} />
              <input 
                type="text" 
                placeholder='Search products...' 
                className="w-full pl-11 pr-4 py-3 bg-stone-50 focus:bg-white rounded-2xl text-sm font-medium text-stone-900 outline-none border-2 border-stone-200 focus:border-emerald-500 transition shadow-inner"
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2.5 rounded-2xl shadow-2xs transition duration-200 flex items-center gap-2.5 font-bold text-sm border border-stone-200 active:scale-95"
              >
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black text-xs shadow-2xs">
                  {session.user.email[0].toUpperCase()}
                </div>
                <span className="hidden md:inline">Account</span>
              </button>
            ) : (
              <Link to="/login" className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-2xs transition duration-200 border border-stone-200 active:scale-95">
                Login
              </Link>
            )}

            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black flex items-center gap-2.5 shadow-md transition duration-200 transform active:scale-95"
            >
              <ShoppingCart size={18} />
              <span>{totalItemsCount > 0 ? `${totalItemsCount} items` : 'Cart'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Profile & Wishlist Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50/80">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2.5"><User size={20} className="text-emerald-600" /> My Profile & Dashboard</h3>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-stone-200/80 rounded-full text-stone-600 hover:bg-stone-300 transition"><X size={18} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl shadow-sm">
                <p className="text-xs text-emerald-800 uppercase font-extrabold tracking-wider">Signed in as</p>
                <p className="font-bold text-stone-900 mt-0.5 truncate text-sm">{session?.user?.email}</p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => { setIsProfileOpen(false); setViewTab('orders'); }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-stone-50 border border-stone-200/80 transition font-bold text-stone-700 text-sm shadow-sm"
                >
                  <span className="flex items-center gap-3"><Package size={18} className="text-emerald-600" /> My Orders & Live Tracking</span>
                  <ChevronRight size={16} className="text-stone-400" />
                </button>
                <button 
                  onClick={() => { setIsProfileOpen(false); setViewTab('wishlist'); }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-stone-50 border border-stone-200/80 transition font-bold text-stone-700 text-sm shadow-sm"
                >
                  <span className="flex items-center gap-3"><Heart size={18} className="text-rose-600" /> My Wishlist ({wishlistProducts.length})</span>
                  <ChevronRight size={16} className="text-stone-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-wider">Saved Addresses ({savedAddresses.length})</h4>
                  <button onClick={() => setShowAddAddressBox(!showAddAddressBox)} className="text-xs text-emerald-600 font-bold hover:underline">
                    {showAddAddressBox ? 'Cancel' : '+ Add Address'}
                  </button>
                </div>

                {showAddAddressBox && (
                  <form onSubmit={handleAddAddress} className="bg-stone-50 p-4 rounded-2xl border space-y-3 shadow-inner">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Label (e.g. Home, Work)</label>
                      <input type="text" required className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={newAddressForm.title} onChange={e => setNewAddressForm({...newAddressForm, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Full Address</label>
                      <textarea required rows="2" className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="House/Flat No, Street, Landmark" value={newAddressForm.address} onChange={e => setNewAddressForm({...newAddressForm, address: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Phone Number</label>
                      <input type="tel" required className="w-full border border-stone-300 p-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="9876543210" value={newAddressForm.phone} onChange={e => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition shadow-md active:scale-95">Save Address</button>
                  </form>
                )}

                {savedAddresses.length === 0 && !showAddAddressBox ? (
                  <p className="text-sm text-stone-500 italic p-4 bg-stone-50 rounded-2xl border text-center">No saved addresses yet.</p>
                ) : (
                  savedAddresses.map(addr => (
                    <div key={addr.id} className="p-3.5 bg-stone-50/80 rounded-2xl border text-sm text-stone-700 flex items-start justify-between gap-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-stone-900 block">{addr.title}</span>
                          <span className="text-xs text-stone-600 mt-0.5 block">{addr.address}</span>
                          <span className="text-[11px] text-stone-400 block mt-1 font-mono">Phone: {addr.phone}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteAddress(addr.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition"><Trash2 size={14}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-stone-50">
              <button 
                onClick={() => { supabase.auth.signOut(); setIsProfileOpen(false); }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-stone-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-stone-600 text-sm mb-6">Your quick delivery order <span className="font-mono font-bold text-stone-900">#{orderSuccess}</span> has been confirmed.</p>
            <button 
              onClick={() => { setOrderSuccess(null); setViewTab('orders'); }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold transition duration-200 shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              Track My Order <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {viewTab === 'orders' ? (
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-stone-900">My Orders & Live Tracking</h2>
            <button onClick={() => setViewTab('shop')} className="text-xs font-bold text-emerald-600 hover:underline bg-emerald-50 px-3 py-1.5 rounded-xl">Back to Shop</button>
          </div>

          {!session ? (
            <div className="bg-white p-12 rounded-3xl border text-center shadow-sm">
              <p className="text-stone-600 mb-4 font-medium">Please log in to view your orders.</p>
              <Link to="/login" className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md inline-block">Login Now</Link>
            </div>
          ) : myOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border text-center text-stone-500 shadow-sm space-y-3">
              <Package className="mx-auto text-stone-300 mb-2" size={48} />
              <p className="font-bold text-stone-800">You haven't placed any orders yet.</p>
              <button onClick={() => setViewTab('shop')} className="text-emerald-600 font-bold hover:underline block mx-auto">Start Shopping Now</button>
            </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm transition duration-300 hover:shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-stone-100 gap-2">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-base">Order #{order.id.slice(0, 8)}</span>
                      <p className="text-xs text-stone-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {order.status === 'delivered' && (
                        <button 
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl font-bold transition duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm"
                        >
                          <FileText size={14} /> Download Invoice
                        </button>
                      )}
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Verification OTP Display */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && order.otp && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Delivery Verification OTP</span>
                        <span className="text-xs text-emerald-600 font-medium">Provide this 4-digit code to the delivery partner upon arrival.</span>
                      </div>
                      <span className="font-mono font-black text-xl text-emerald-700 bg-white px-4 py-1.5 rounded-xl border border-emerald-300 shadow-2xs tracking-widest">
                        {order.otp}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Items Ordered ({order.order_items?.length || 0})</p>
                    <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200/60">
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-200/50 last:border-0">
                          <div className="flex items-center gap-3">
                            {item.products?.image_url && (
                              <img src={item.products.image_url} alt="" className="w-11 h-11 object-cover rounded-xl border bg-white shadow-sm" />
                            )}
                            <div>
                              <span className="font-bold text-stone-900 block">{item.products?.name || 'Product'}</span>
                              <span className="text-xs text-stone-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                    <div>
                      <p className="text-stone-400 font-bold text-xs uppercase tracking-wider">Delivery Address</p>
                      <p className="text-stone-800 mt-1 font-medium">{order.delivery_address || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 font-bold text-xs uppercase tracking-wider">Contact Phone</p>
                      <p className="text-stone-800 mt-1 font-medium">{order.phone || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-between items-center font-bold">
                    <span className="text-stone-600">Total Amount Paid:</span>
                    <span className="text-xl font-black text-stone-900">₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : viewTab === 'wishlist' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-stone-900">My Wishlist</h2>
              <p className="text-xs text-stone-500 mt-0.5">Quickly access items you saved for later.</p>
            </div>
            <button onClick={() => setViewTab('shop')} className="text-xs font-bold text-emerald-600 hover:underline bg-emerald-50 px-3 py-1.5 rounded-xl">Back to Shop</button>
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border text-center text-stone-400 shadow-sm space-y-3">
              <Heart className="mx-auto text-stone-300 mb-2" size={56} />
              <p className="font-bold text-stone-700 text-base">Your wishlist is empty.</p>
              <button onClick={() => setViewTab('shop')} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-md inline-block">Explore Store</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {wishlistProducts.map(product => {
                const currentVariantId = selectedVariants[product.id];
                const activeVariant = product.variants?.find(v => v.id === currentVariantId);
                const displayPrice = activeVariant ? activeVariant.price : product.price;

                return (
                 <div key={product.id} className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-sm flex flex-col justify-between relative group hover:shadow-xl transition duration-300">
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-5 right-5 z-10 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-md text-rose-600 hover:scale-110 transition"
                      title="Remove from wishlist"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>

                    <div>
                      <div className="h-36 bg-stone-50 rounded-2xl relative overflow-hidden mb-3 flex items-center justify-center border border-stone-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        ) : (
                          <Package size={36} className="text-stone-300" />
                        )}
                      </div>
                      <h3 className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug">{product.name}</h3>
                      <p className="text-sm font-black text-stone-900 mt-2">₹{displayPrice.toFixed(2)}</p>
                    </div>

                    <button 
                      onClick={() => addToCart(product)}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-2xl text-xs font-bold shadow-md transition active:scale-95"
                    >
                      Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Stunning Banner Slider */}
          {banners.length > 0 && (
            <div className="mb-8 relative rounded-3xl overflow-hidden shadow-xl h-48 sm:h-64 bg-stone-900 border border-stone-200">
              {banners.map((banner, index) => (
                <div 
                  key={banner.id} 
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover transform scale-105 animate-pulse duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6">
                    {banner.title && (
                      <h2 className="text-white font-black text-xl sm:text-2xl drop-shadow-md">{banner.title}</h2>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sleek Category Pills */}
          <div className="flex gap-2.5 overflow-x-auto pb-4 mb-8 scrollbar-none">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition duration-200 transform active:scale-95 shadow-sm ${activeCategory === 'All' ? 'bg-stone-900 text-white shadow-md' : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition duration-200 transform active:scale-95 shadow-sm ${activeCategory === cat.id ? 'bg-stone-900 text-white shadow-md' : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-24 text-stone-500 font-bold text-sm">Loading fresh catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border shadow-sm space-y-2">
              <Package className="mx-auto text-stone-300 mb-2" size={48} />
              <h3 className="text-lg font-bold text-stone-800">No products found</h3>
              <p className="text-stone-500 text-sm">Try searching for something else or pick another category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(product => {
                const currentVariantId = selectedVariants[product.id];
                const activeVariant = product.variants?.find(v => v.id === currentVariantId);
                
                const displayPrice = activeVariant ? activeVariant.price : product.price;
                const displayMrp = activeVariant ? (activeVariant.mrp || activeVariant.price) : (product.mrp || product.price);
                const displayStock = activeVariant ? activeVariant.stock : product.stock;
                const isOutOfStock = displayStock <= 0;

                const discountPercent = displayMrp > displayPrice ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100) : 0;
                const isWishlisted = wishlistIds.includes(product.id);

                const cartItemId = activeVariant ? `${product.id}-${activeVariant.id}` : product.id;
                const cartItem = cart.find(item => item.cartItemId === cartItemId);
                const qtyInCart = cartItem ? cartItem.quantity : 0;

                return (
                  <div 
                    key={product.id} 
                    onClick={() => {
                      setSelectedProductDetails(product);
                      setActiveGalleryImage(product.images?.[0] || product.image_url || '');
                    }}
                    className="bg-white rounded-3xl border border-stone-200/80 p-3.5 shadow-sm transition duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between relative group cursor-pointer"
                  >
                    
                    {/* Wishlist Button */}
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`absolute top-4 right-4 z-10 p-2 rounded-full shadow-md transition duration-200 ${isWishlisted ? 'bg-rose-50 text-rose-600 scale-110' : 'bg-white/90 backdrop-blur text-stone-400 hover:text-rose-600'}`}
                      title="Wishlist"
                    >
                      <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-800 w-max shadow-2xs">
                          <Timer size={10} className="text-emerald-600"/> INSTANT
                        </div>
                      </div>

                      <div className="h-36 bg-stone-50 rounded-2xl relative overflow-hidden mb-3 flex items-center justify-center border border-stone-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <Package size={36} className="text-stone-300" />
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">Sold Out</span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug">{product.name}</h3>
                      
                      {product.variants && product.variants.length > 0 && (
                        <select 
                          className="mt-2.5 w-full border border-stone-200 rounded-xl p-2 text-xs bg-stone-50 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                          value={currentVariantId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSelectedVariants({...selectedVariants, [product.id]: e.target.value})}
                        >
                          {product.variants.map(v => (
                            <option key={v.id} value={v.id}>{v.unit_label} - ₹{v.price.toFixed(2)}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-stone-900">₹{displayPrice.toFixed(2)}</p>
                          {displayMrp > displayPrice && (
                            <p className="text-xs text-stone-400 line-through font-medium">₹{displayMrp.toFixed(2)}</p>
                          )}
                        </div>
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        {isOutOfStock ? (
                          <button disabled className="bg-stone-100 text-stone-400 font-bold px-3.5 py-2 rounded-xl text-xs cursor-not-allowed">
                            Sold
                          </button>
                        ) : qtyInCart === 0 ? (
                          <button 
                            onClick={() => addToCart(product)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black px-4 py-2 rounded-2xl text-xs transition duration-200 transform active:scale-95 shadow-2xs uppercase tracking-wide"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-2xl p-1 shadow-md">
                            <button onClick={() => updateQuantity(cartItemId, -1)} className="p-1 hover:bg-emerald-700 transition rounded-xl"><Minus size={12} /></button>
                            <span className="font-black text-xs w-5 text-center">{qtyInCart}</span>
                            <button onClick={() => addToCart(product)} disabled={qtyInCart >= displayStock} className="p-1 hover:bg-emerald-700 transition rounded-xl"><Plus size={12} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Testimonials */}
          <TestimonialsSection />
        </main>
      )}

      {/* Product Details Modal with Multiple Image Gallery */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-stone-900">Product Details & Gallery</h3>
              <button onClick={() => setSelectedProductDetails(null)} className="p-2 rounded-full hover:bg-stone-100 text-stone-500"><X size={18}/></button>
            </div>

            {/* Gallery Viewer */}
            <div className="space-y-3">
              <div className="h-64 bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center border shadow-inner">
                {activeGalleryImage ? (
                  <img src={activeGalleryImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={48} className="text-stone-300" />
                )}
              </div>

              {/* Thumbnails Row */}
              {selectedProductDetails.images && selectedProductDetails.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedProductDetails.images.map((imgUrl, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveGalleryImage(imgUrl)}
                      className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition bg-stone-100 ${activeGalleryImage === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-stone-200 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-stone-900">{selectedProductDetails.name}</h2>
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full w-max flex items-center gap-1">
                <Store size={12} /> Sold by: {selectedProductDetails.shopkeeper_profiles?.store_name || 'Harraiya Super Market'}
              </p>
              <p className="text-sm text-stone-600 mt-2">{selectedProductDetails.description || 'No detailed description provided for this fresh item.'}</p>
            </div>

            {selectedProductDetails.variants && selectedProductDetails.variants.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Select Variant / Weight</label>
                <select 
                  className="w-full border p-3 rounded-xl text-xs bg-stone-50 font-bold outline-none"
                  value={selectedVariants[selectedProductDetails.id] || ''}
                  onChange={(e) => setSelectedVariants({...selectedVariants, [selectedProductDetails.id]: e.target.value})}
                >
                  {selectedProductDetails.variants.map(v => (
                    <option key={v.id} value={v.id}>{v.unit_label} - ₹{v.price.toFixed(2)} (Stock: {v.stock})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-4 border-t flex justify-between items-center">
              <span className="text-xl font-black text-stone-900">
                ₹{(selectedProductDetails.variants?.find(v => v.id === selectedVariants[selectedProductDetails.id])?.price || selectedProductDetails.price).toFixed(2)}
              </span>
              <button 
                onClick={() => { addToCart(selectedProductDetails); setSelectedProductDetails(null); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 bg-emerald-600 text-white p-4 shadow-2xl z-40 flex items-center justify-between max-w-4xl mx-auto rounded-3xl border border-emerald-500 animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="bg-white text-emerald-700 px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-md">
              {totalItemsCount} ITEMS
            </div>
            <span className="font-black text-lg">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 font-black text-xs uppercase tracking-wider bg-emerald-900 hover:bg-black px-6 py-3 rounded-2xl transition duration-200 shadow-lg active:scale-95"
          >
            View Cart <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50/80">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2"><ShoppingCart size={20} className="text-emerald-600" /> My Cart ({totalItemsCount})</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-stone-200/80 rounded-full text-stone-600 hover:bg-stone-300 transition"><X size={18} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex items-center justify-between gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm text-stone-900 block truncate">{item.title}</span>
                      <span className="text-xs text-stone-500 font-medium">₹{item.price.toFixed(2)} each</span>
                    </div>
                    <span className="text-sm font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                      <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-stone-100 rounded-lg transition"><Minus size={14}/></button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-stone-100 rounded-lg transition"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>

              {session ? (
                <div className="space-y-4 pt-4 border-t border-stone-200">
                  <h4 className="font-black text-stone-900 text-sm flex items-center gap-2"><MapPin size={18} className="text-emerald-600"/> Select Delivery Address</h4>
                  
                  {savedAddresses.length > 0 ? (
                    <div className="space-y-2">
                      {savedAddresses.map(addr => (
                        <div 
                          key={addr.id} 
                          onClick={() => handleSelectAddress(addr)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition duration-200 shadow-2xs ${selectedAddressId === addr.id ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20' : 'bg-stone-50 hover:bg-stone-100 border-stone-200'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-xs uppercase text-stone-900">{addr.title}</span>
                            {selectedAddressId === addr.id && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Selected</span>}
                          </div>
                          <p className="text-xs text-stone-600">{addr.address}</p>
                          <p className="text-[11px] text-stone-400 mt-1 font-mono">Phone: {addr.phone}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 bg-amber-50 p-4 rounded-2xl border border-amber-200 font-medium">
                      No saved addresses. Please open your **Account** menu above to add a delivery address.
                    </p>
                  )}

                  {/* Coupon Section */}
                  <div className="pt-2 border-t border-stone-200">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider mb-2">Promo Code</h4>
                    {appliedCoupon ? (
                      <div className="flex justify-between items-center bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                        <div>
                          <span className="font-mono font-black text-emerald-800 text-sm">{appliedCoupon.code}</span>
                          <p className="text-xs text-emerald-600">Discount applied successfully!</p>
                        </div>
                        <button onClick={removeCoupon} className="text-xs text-rose-600 font-bold hover:underline">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" placeholder="Enter coupon code" 
                          className="flex-1 border border-stone-300 p-2.5 rounded-xl text-xs uppercase outline-none font-bold focus:ring-2 focus:ring-emerald-500"
                          value={couponInput} onChange={e => setCouponInput(e.target.value)}
                        />
                        <button onClick={handleApplyCoupon} className="bg-stone-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow">Apply</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
                  <p className="text-xs font-bold text-amber-900">Please log in to complete your order checkout.</p>
                  <Link to="/login" className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md">Login Now</Link>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-stone-50 space-y-4 shadow-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Items Total:</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount ({appliedCoupon?.code}):</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Delivery Fee:</span>
                  <span>{deliveryFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-black text-stone-900 pt-3 border-t border-stone-200">
                  <span>To Pay:</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={session ? handleCheckout : () => { setIsCartOpen(false); navigate('/login'); }}
                disabled={checkingOut || (session && savedAddresses.length === 0)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl transition duration-200 transform active:scale-95 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
              >
                <ShieldCheck size={18} />
                {checkingOut ? 'Placing Order...' : session ? 'Place Secure Order' : 'Login to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal 
        order={selectedInvoiceOrder} 
        isOpen={Boolean(selectedInvoiceOrder)} 
        onClose={() => setSelectedInvoiceOrder(null)} 
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}