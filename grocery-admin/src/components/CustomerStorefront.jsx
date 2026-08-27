// src/components/CustomerStorefront.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Package, Plus, Minus, CheckCircle, Search, ShieldCheck, X, User, MapPin, Timer, ChevronRight, ChevronDown, LogOut, Trash2, FileText, Heart, ArrowRight, Store, Zap, Flame, Navigation, MessageSquarePlus, Ban } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import TestimonialsSection from './TestimonialsSection';
import Footer from './Footer';
import CustomerFeedbackModal from './CustomerFeedbackModal';
import ValueGoLogo from './ValueGoLogo';
import { calculateDistanceKm } from '../utils/distance';

export default function CustomerStorefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // Store & Sale Data
  const [storeLocation, setStoreLocation] = useState({ latitude: 26.7900, longitude: 82.6000 });
  const [activeFlashSale, setActiveFlashSale] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // User & Profile Drawer State
  const [session, setSession] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Profile Collapsible Accordion & Detail States
  const [openSection, setOpenSection] = useState(null);
  const [selectedProfileOrder, setSelectedProfileOrder] = useState(null);

  // Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Addresses State with Default Location Values
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddAddressBox, setShowAddAddressBox] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    title: 'Home',
    house_no: '',
    ward_no_name: '',
    city: 'Harraiya',
    district: 'Basti',
    state: 'Uttar Pradesh',
    pincode: '272155',
    phone: '',
    latitude: null,
    longitude: null
  });
  const [addressForm, setAddressForm] = useState({ phone: '', address: '' });

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
    fetchStoreLocation();
    fetchDeliveryRules();
    fetchBanners();
    fetchActiveFlashSale();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const fetchStoreLocation = async () => {
    const { data } = await supabase.from('store_settings').select('*').limit(1).single();
    if (data) setStoreLocation(data);
  };

  const fetchActiveFlashSale = async () => {
    const { data } = await supabase.from('flash_sales').select('*').eq('is_active', true).single();
    if (data) {
      setActiveFlashSale(data);
      const difference = new Date(data.end_time).getTime() - new Date().getTime();
      setTimeLeft(Math.max(0, Math.floor(difference / 1000)));
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
        const relationalVariants = rawVariants.filter(v => v.product_id === p.id);
        const jsonVariants = p.variants || [];
        const mergedVariants = relationalVariants.length > 0 ? relationalVariants : jsonVariants;

        if (mergedVariants.length > 0) {
          setSelectedVariants(prev => ({ ...prev, [p.id]: mergedVariants[0].id || mergedVariants[0].label }));
        }

        const mergedImages = p.images || p.gallery || (p.image_url ? [p.image_url] : []);

        return { 
          ...p, 
          images: mergedImages,
          variants: mergedVariants 
        };
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
      .select('*, order_items(*, products(name, image_url, images, gallery))')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (!error) setMyOrders(data || []);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancellation_remark: 'Cancelled by customer'
      })
      .eq('id', orderId);

    if (!error) {
      alert("Order cancelled successfully.");
      setSelectedProfileOrder(null);
      if (session) fetchMyOrders(session.user.email);
      fetchStoreData();
    } else {
      alert("Failed to cancel order: " + error.message);
    }
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
        handleSelectAddress(data[0]);
      }
    }
  };

  const detectCustomerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewAddressForm(prev => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
          alert("GPS location captured successfully!");
        },
        (err) => {
          alert("Unable to retrieve location: " + err.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!session) return;

    const fullFormattedAddress = `${newAddressForm.house_no}, ${newAddressForm.ward_no_name}, ${newAddressForm.city}, ${newAddressForm.district}, ${newAddressForm.state} - ${newAddressForm.pincode}`;

    const { error } = await supabase.from('customer_addresses').insert([{
      user_id: session.user.id,
      title: newAddressForm.title,
      house_no: newAddressForm.house_no,
      ward_no_name: newAddressForm.ward_no_name,
      city: newAddressForm.city,
      district: newAddressForm.district,
      state: newAddressForm.state,
      pincode: newAddressForm.pincode,
      phone: newAddressForm.phone,
      latitude: newAddressForm.latitude,
      longitude: newAddressForm.longitude,
      address: fullFormattedAddress
    }]);

    if (!error) {
      setNewAddressForm({
        title: 'Home',
        house_no: '',
        ward_no_name: '',
        city: 'Harraiya',
        district: 'Basti',
        state: 'Uttar Pradesh',
        pincode: '272155',
        phone: '',
        latitude: null,
        longitude: null
      });
      setShowAddAddressBox(false);
      fetchSavedAddresses(session.user.id);
    } else {
      alert("Error adding address: " + error.message);
    }
  };

  const handleDeleteAddress = async (id) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    if (session) fetchSavedAddresses(session.user.id);
  };

  const calculateFee = (subtotal, distKm) => {
    if (!deliveryRules || deliveryRules.length === 0) return 40;

    const matchedRule = deliveryRules.find(r => {
      const minCart = r.min_cart_value || 0;
      const maxCart = r.max_cart_value || 999999;
      const minDst = r.min_distance_km || 0;
      const maxDst = r.max_distance_km || 999;

      return subtotal >= minCart && subtotal <= maxCart && distKm >= minDst && distKm <= maxDst;
    });

    if (matchedRule) return matchedRule.delivery_fee;

    const cartOnlyRule = deliveryRules.find(r => subtotal >= (r.min_cart_value || 0) && subtotal <= (r.max_cart_value || 999999));
    return cartOnlyRule ? cartOnlyRule.delivery_fee : 40;
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));

    const lat = addrObj.latitude || storeLocation.latitude;
    const lon = addrObj.longitude || storeLocation.longitude;
    const distanceKm = calculateDistanceKm(storeLocation.latitude, storeLocation.longitude, lat, lon);
    
    setSelectedAddressDistance(distanceKm);

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const fee = calculateFee(cartSubtotal, distanceKm);
    
    setDeliveryFee(fee);
  };

  const addToCart = (product) => {
    const variantKey = selectedVariants[product.id];
    const variant = product.variants?.find(v => (v.id === variantKey || v.label === variantKey || v.unit_label === variantKey));
    
    const stockCheck = Number(variant ? variant.stock : product.stock || 0);
    if (stockCheck <= 0) {
      alert("Sorry, this item is currently out of stock.");
      return;
    }

    const cartItemId = variant ? `${product.id}-${variant.id || variant.label || variant.unit_label}` : product.id;
    const itemTitle = variant ? `${product.name} (${variant.unit_label || variant.label})` : product.name;
    const itemPrice = Number(variant ? variant.price : product.price || 0);
    const itemStock = stockCheck;
    
    const productImages = product.images || product.gallery || [product.image_url].filter(Boolean);
    const itemImage = productImages[0] || '';

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId 
            ? { ...item, quantity: Math.min(itemStock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { cartItemId, product, variant, title: itemTitle, price: itemPrice, quantity: 1, stock: itemStock, image: itemImage }];
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
    if (savedAddresses.length > 0 && selectedAddressId) {
      const currentAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (currentAddr) handleSelectAddress(currentAddr);
    } else {
      const fee = calculateFee(cartSubtotal, selectedAddressDistance || 0);
      setDeliveryFee(fee);
    }
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
      for (const item of cart) {
        if (item.variant && item.variant.id) {
          const { data: vData } = await supabase.from('product_variants').select('stock').eq('id', item.variant.id).single();
          if (!vData || vData.stock < item.quantity) {
            alert(`Sorry! "${item.title}" is now out of stock.`);
            setCheckingOut(false);
            return;
          }
        } else {
          const { data: pData } = await supabase.from('products').select('stock').eq('id', item.product.id).single();
          if (!pData || pData.stock < item.quantity) {
            alert(`Sorry! "${item.title}" is now out of stock.`);
            setCheckingOut(false);
            return;
          }
        }
      }

      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const selectedAddrObj = savedAddresses.find(a => a.id === selectedAddressId);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_email: session.user.email,
          customer_id: session.user.id,
          total_amount: cartTotal,
          status: 'pending',
          delivery_address: addressForm.address,
          phone: addressForm.phone,
          otp: generatedOtp,
          latitude: selectedAddrObj?.latitude || null,
          longitude: selectedAddrObj?.longitude || null
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
        if (item.variant && item.variant.id) {
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

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/20 to-stone-100 pb-40 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Sticky Glassmorphic Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-stone-200/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo Component */}
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ValueGoLogo />
          </div>

          {/* Search Bar - Center Focus */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-600 transition" size={18} />
              <input 
                type="text" 
                placeholder='Search fresh vegetables, fruits, dairy & essentials...' 
                className="w-full pl-11 pr-4 py-3 bg-stone-100/70 focus:bg-white rounded-2xl text-sm font-medium text-stone-900 outline-none border-2 border-transparent focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/10 transition"
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right Actions: Profile & Cart */}
          <div className="flex items-center gap-2.5">
            {session ? (
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="w-11 h-11 bg-white hover:bg-stone-50 text-stone-800 rounded-2xl shadow-xs transition duration-200 flex items-center justify-center border border-stone-200/80 active:scale-95"
                title="My Profile"
              >
                <User size={20} className="text-stone-700" />
              </button>
            ) : (
              <Link to="/login" className="bg-white hover:bg-stone-50 text-stone-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xs transition duration-200 border border-stone-200/80 active:scale-95">
                Login
              </Link>
            )}

            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-11 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/30 transition duration-200 transform active:scale-95 relative"
              title="Cart"
            >
              <ShoppingCart size={20} />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Search Bar Row */}
      <div className="md:hidden px-4 pt-3 pb-1">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder='Search products...' 
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm font-medium text-stone-900 outline-none border border-stone-200/80 shadow-xs"
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Profile & Collapsible Accordion Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-end z-50 transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50/80">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2.5"><User size={20} className="text-emerald-600" /> My Profile & Dashboard</h3>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-stone-200/80 rounded-full text-stone-600 hover:bg-stone-300 transition"><X size={18} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-2xl shadow-xs">
                <p className="text-[10px] text-emerald-800 uppercase font-extrabold tracking-wider">Signed in as</p>
                <p className="font-bold text-stone-900 mt-0.5 truncate text-sm">{session?.user?.email}</p>
              </div>

              {/* Collapsible Accordion: Recent Orders */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'orders' ? null : 'orders')}
                  className="w-full p-4 flex items-center justify-between font-bold text-stone-800 hover:bg-stone-100 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Package size={16} className="text-emerald-600" /> My Orders ({myOrders.length})
                  </span>
                  {openSection === 'orders' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'orders' && (
                  <div className="p-4 pt-0 space-y-3 bg-white border-t border-stone-100">
                    {myOrders.length === 0 ? (
                      <p className="text-stone-400 italic py-2 text-center">No orders found.</p>
                    ) : (
                      myOrders.map(order => (
                        <div key={order.id} className="p-3 bg-stone-50 rounded-xl border space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-stone-900">#{order.id.slice(0, 8)}</span>
                            <span className={`px-2 py-0.5 rounded-full uppercase text-[9px] font-black ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{order.status}</span>
                          </div>
                          <div className="flex justify-between items-center text-stone-600">
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="font-black text-stone-900">₹{order.total_amount}</span>
                          </div>
                          {order.status === 'cancelled' && order.cancellation_remark && (
                            <p className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                              Remark: {order.cancellation_remark}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => setSelectedProfileOrder(order)}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 border border-emerald-200"
                            >
                              <FileText size={12} /> View Full Details
                            </button>
                            {order.status === 'delivered' && (
                              <button 
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-3 py-1.5 rounded-lg font-bold transition"
                              >
                                Invoice
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion: Wishlist */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'wishlist' ? null : 'wishlist')}
                  className="w-full p-4 flex items-center justify-between font-bold text-stone-800 hover:bg-stone-100 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Heart size={16} className="text-rose-600" /> My Wishlist ({wishlistProducts.length})
                  </span>
                  {openSection === 'wishlist' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'wishlist' && (
                  <div className="p-4 pt-0 space-y-2 bg-white border-t border-stone-100">
                    {wishlistProducts.length === 0 ? (
                      <p className="text-stone-400 italic py-2 text-center">Your wishlist is empty.</p>
                    ) : (
                      wishlistProducts.map(p => {
                        const pImages = p.images || p.gallery || [p.image_url].filter(Boolean);
                        const hasVariants = p.variants && p.variants.length > 0;
                        const isWishlistOutOfStock = hasVariants 
                          ? p.variants.every(v => Number(v.stock || 0) <= 0)
                          : Number(p.stock || 0) <= 0;

                        return (
                          <div key={p.id} className="p-2.5 bg-stone-50 rounded-xl border flex items-center justify-between gap-3 relative overflow-hidden">
                            <div className="flex items-center gap-2.5 relative">
                              <img src={pImages[0] || ''} alt="" className="w-10 h-10 object-cover rounded-lg border bg-white" />
                              <div>
                                <span className="font-bold text-stone-900 block line-clamp-1">{p.name}</span>
                                <span className="font-black text-emerald-700">₹{p.price}</span>
                              </div>
                            </div>

                            {isWishlistOutOfStock ? (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                                Sold Out
                              </span>
                            ) : (
                              <button 
                                onClick={() => addToCart(p)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shrink-0 transition"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion: Saved Addresses */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'addresses' ? null : 'addresses')}
                  className="w-full p-4 flex items-center justify-between font-bold text-stone-800 hover:bg-stone-100 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin size={16} className="text-emerald-600" /> Saved Addresses ({savedAddresses.length})
                  </span>
                  {openSection === 'addresses' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'addresses' && (
                  <div className="p-4 pt-0 space-y-3 bg-white border-t border-stone-100">
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-stone-400 uppercase text-[10px]">Your Locations</span>
                      <button onClick={() => setShowAddAddressBox(!showAddAddressBox)} className="text-emerald-600 font-bold hover:underline">
                        {showAddAddressBox ? 'Cancel' : '+ Add New'}
                      </button>
                    </div>

                    {showAddAddressBox && (
                      <form onSubmit={handleAddAddress} className="bg-stone-50 p-3 rounded-xl border space-y-2">
                        <input type="text" placeholder="Title (Home/Work)" required className="w-full border p-2 rounded-lg bg-white" value={newAddressForm.title} onChange={e => setNewAddressForm({...newAddressForm, title: e.target.value})} />
                        <button type="button" onClick={detectCustomerLocation} className="w-full bg-emerald-50 text-emerald-700 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border border-emerald-200">
                          <Navigation size={12} /> Detect GPS
                        </button>
                        <input type="text" placeholder="House No." required className="w-full border p-2 rounded-lg bg-white" value={newAddressForm.house_no} onChange={e => setNewAddressForm({...newAddressForm, house_no: e.target.value})} />
                        <input type="text" placeholder="Ward / Colony Name" required className="w-full border p-2 rounded-lg bg-white" value={newAddressForm.ward_no_name} onChange={e => setNewAddressForm({...newAddressForm, ward_no_name: e.target.value})} />
                        <input type="tel" placeholder="Phone Number" required className="w-full border p-2 rounded-lg bg-white" value={newAddressForm.phone} onChange={e => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                        <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold">Save Address</button>
                      </form>
                    )}

                    {savedAddresses.map(addr => (
                      <div key={addr.id} className="p-3 bg-stone-50 rounded-xl border flex justify-between items-start">
                        <div>
                          <span className="font-bold text-stone-900 block">{addr.title}</span>
                          <span className="text-stone-600 block mt-0.5">{addr.address}</span>
                          <span className="text-stone-400 font-mono text-[10px] block mt-1">Phone: {addr.phone}</span>
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-rose-500 hover:text-rose-700"><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Button inside Profile */}
              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-4 rounded-2xl font-bold flex items-center justify-between border border-emerald-200 transition shadow-2xs"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquarePlus size={16} className="text-emerald-600" /> Send Feedback / Suggestions
                </span>
                <ChevronRight size={16} />
              </button>

            </div>

            <div className="p-6 border-t bg-stone-50">
              <button 
                onClick={() => { supabase.auth.signOut(); setIsProfileOpen(false); }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm shadow-2xs"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Order Details Modal inside Profile (With Product Images, Status Remarks & Cancellation) */}
      {selectedProfileOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-stone-900">Order #{selectedProfileOrder.id.slice(0, 8)} Details</h3>
              <button onClick={() => setSelectedProfileOrder(null)} className="p-1.5 bg-stone-100 rounded-full hover:bg-stone-200"><X size={16}/></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border flex justify-between items-center">
                <span className="text-stone-500 font-bold">Status:</span>
                <span className="font-extrabold uppercase text-emerald-700">{selectedProfileOrder.status}</span>
              </div>

              {selectedProfileOrder.status === 'cancelled' && selectedProfileOrder.cancellation_remark && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 flex justify-between items-center text-rose-700">
                  <span className="font-bold">Remark:</span>
                  <span className="font-extrabold">{selectedProfileOrder.cancellation_remark}</span>
                </div>
              )}

              {selectedProfileOrder.otp && selectedProfileOrder.status !== 'delivered' && selectedProfileOrder.status !== 'cancelled' && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <span className="text-emerald-800 font-bold">Delivery OTP:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{selectedProfileOrder.otp}</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-bold text-stone-400 uppercase text-[10px]">Ordered Items</span>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-stone-50 p-3 rounded-xl border">
                  {selectedProfileOrder.order_items?.map(item => {
                    const itemImages = item.products?.images || item.products?.gallery || [item.products?.image_url].filter(Boolean);
                    const itemImg = itemImages[0] || '';

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-stone-200/50 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <img src={itemImg} alt="" className="w-10 h-10 object-cover rounded-lg border bg-white shrink-0 shadow-xs" />
                          <div>
                            <span className="font-bold text-stone-900 block line-clamp-1">{item.products?.name || 'Item'}</span>
                            <span className="text-stone-500 text-[10px]">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-black text-stone-900 shrink-0">₹{item.price * item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border space-y-1">
                <p className="text-stone-400 font-bold uppercase text-[10px]">Delivery Address</p>
                <p className="text-stone-800 font-medium">{selectedProfileOrder.delivery_address}</p>
              </div>

              <div className="pt-2 border-t flex justify-between items-center font-black text-sm">
                <span>Total Amount Paid:</span>
                <span>₹{selectedProfileOrder.total_amount}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {/* Cancel Button - Only available if status is pending */}
              {selectedProfileOrder.status === 'pending' && (
                <button 
                  onClick={() => handleCancelOrder(selectedProfileOrder.id)}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Ban size={15} /> Cancel Order
                </button>
              )}
              <button 
                onClick={() => setSelectedProfileOrder(null)}
                className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-stone-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-stone-600 text-sm mb-6">Your quick delivery order <span className="font-mono font-bold text-stone-900">#{orderSuccess}</span> has been confirmed.</p>
            <button 
              onClick={() => { setOrderSuccess(null); setIsProfileOpen(true); setOpenSection('orders'); }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold transition duration-200 shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2"
            >
              View My Orders <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Home Screen (Strictly Product Catalog & Shopping Experience) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stunning Banner Slider */}
        {banners.length > 0 && (
          <div className="mb-8 relative rounded-3xl overflow-hidden shadow-2xl h-52 sm:h-72 bg-stone-900 border border-stone-200/50">
            {banners.map((banner, index) => (
              <div 
                key={banner.id} 
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover transform scale-105 transition duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent flex items-end p-6 sm:p-8">
                  {banner.title && (
                    <div className="space-y-1.5">
                      <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">Special Offer</span>
                      <h2 className="text-white font-black text-2xl sm:text-3xl drop-shadow-md tracking-tight">{banner.title}</h2>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admin-Managed Flash Sale Banner */}
        {activeFlashSale && activeFlashSale.is_active && timeLeft > 0 && (
          <div className="mb-8 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between border border-rose-400/30">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md shadow-inner">
                <Flame size={28} className="text-white animate-bounce" />
              </div>
              <div>
                <span className="bg-black/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">Limited Time</span>
                <h3 className="font-black text-xl sm:text-2xl mt-1 tracking-tight">{activeFlashSale.title}</h3>
                <p className="text-xs text-rose-100 font-medium mt-0.5">{activeFlashSale.subtitle}</p>
              </div>
            </div>
            <div className="text-right bg-black/20 px-5 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-200">Sale Ends In</p>
              <div className="font-mono font-black text-2xl sm:text-3xl tracking-wider text-white mt-0.5">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        )}

        {/* Gorgeous Pill Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-none items-center">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition duration-200 transform active:scale-95 shadow-2xs ${activeCategory === 'All' ? 'bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-lg' : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'}`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition duration-200 transform active:scale-95 shadow-2xs ${activeCategory === cat.id ? 'bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-lg' : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24 text-stone-500 font-bold text-sm">Loading fresh catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border shadow-xs space-y-2">
            <Package className="mx-auto text-stone-300 mb-2" size={48} />
            <h3 className="text-lg font-bold text-stone-800">No products found</h3>
            <p className="text-stone-500 text-sm">Try searching for something else or pick another category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {currentProducts.map(product => {
                const currentVariantKey = selectedVariants[product.id];
                const activeVariant = product.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
                
                const displayPrice = Number(activeVariant ? activeVariant.price : product.price || 0);
                const displayMrp = Number(activeVariant ? (activeVariant.mrp || activeVariant.price) : (product.mrp || product.price || 0));
                const displayStock = Number(activeVariant ? activeVariant.stock : product.stock || 0);
                const isOutOfStock = displayStock <= 0;

                const discountPercent = displayMrp > displayPrice ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100) : 0;
                const isWishlisted = wishlistIds.includes(product.id);

                const cartItemId = activeVariant ? `${product.id}-${activeVariant.id || activeVariant.label || activeVariant.unit_label}` : product.id;
                const cartItem = cart.find(item => item.cartItemId === cartItemId);
                const qtyInCart = cartItem ? cartItem.quantity : 0;

                const productImages = product.images || product.gallery || [product.image_url].filter(Boolean);

                return (
                  <div 
                    key={product.id} 
                    onClick={() => {
                      setSelectedProductDetails(product);
                      setActiveGalleryImage(productImages[0] || '');
                    }}
                    className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between relative group cursor-pointer"
                  >
                    
                    {/* Wishlist Button */}
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`absolute top-4 right-4 z-10 p-2 rounded-full shadow-md transition duration-200 ${isWishlisted ? 'bg-rose-50 text-rose-600 scale-110' : 'bg-white/90 backdrop-blur-xs text-stone-400 hover:text-rose-600'}`}
                      title="Wishlist"
                    >
                      <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-800 w-max shadow-2xs border border-emerald-200/50">
                          <Timer size={10} className="text-emerald-600"/> 10 MINS
                        </div>
                      </div>

                      <div className="h-40 bg-stone-50/80 rounded-2xl relative overflow-hidden mb-3.5 flex items-center justify-center border border-stone-100">
                        {productImages.length > 0 ? (
                          <img src={productImages[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <Package size={36} className="text-stone-300" />
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">Sold Out</span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug">{product.name}</h3>
                      
                      {product.variants && product.variants.length > 0 && (
                        <select 
                          className="mt-2.5 w-full border border-stone-200 rounded-xl p-2 text-xs bg-stone-50 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                          value={currentVariantKey || product.variants[0]?.id || product.variants[0]?.label || product.variants[0]?.unit_label || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSelectedVariants({...selectedVariants, [product.id]: e.target.value})}
                        >
                          {product.variants.map((v, vIdx) => (
                            <option key={v.id || vIdx} value={v.id || v.label || v.unit_label}>
                              {v.unit_label || v.label} - ₹{Number(v.price || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-stone-900">₹{displayPrice.toFixed(2)}</p>
                          {displayMrp > displayPrice && (
                            <p className="text-xs text-stone-400 line-through font-medium">₹{displayMrp.toFixed(2)}</p>
                          )}
                        </div>
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block border border-emerald-100">
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
                            className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 font-black px-4 py-2 rounded-xl text-xs transition duration-200 transform active:scale-95 shadow-2xs uppercase tracking-wide"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl p-1 shadow-md">
                            <button onClick={() => updateQuantity(cartItemId, -1)} className="p-1 hover:bg-emerald-700 transition rounded-lg"><Minus size={12} /></button>
                            <span className="font-black text-xs w-5 text-center">{qtyInCart}</span>
                            <button onClick={() => addToCart(product)} disabled={qtyInCart >= displayStock} className="p-1 hover:bg-emerald-700 transition rounded-lg"><Plus size={12} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-12">
                <button 
                  onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold disabled:opacity-40 hover:bg-stone-50 transition shadow-xs"
                >
                  Previous
                </button>

                <span className="text-xs font-bold text-stone-600 px-3 font-mono">
                  Page {currentPage} of {totalPages}
                </span>

                <button 
                  onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold disabled:opacity-40 hover:bg-stone-50 transition shadow-xs"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <TestimonialsSection />
      </main>

      {/* Product Details Modal with Gallery & Stock Guards */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-stone-900">Product Details</h3>
              <button onClick={() => setSelectedProductDetails(null)} className="p-2 rounded-full hover:bg-stone-100 text-stone-500"><X size={18}/></button>
            </div>

            {(() => {
              const modalImages = selectedProductDetails.images || selectedProductDetails.gallery || [selectedProductDetails.image_url].filter(Boolean);
              const currentVariantKey = selectedVariants[selectedProductDetails.id];
              const modalActiveVariant = selectedProductDetails.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
              
              const modalPrice = Number(modalActiveVariant ? modalActiveVariant.price : selectedProductDetails.price || 0);
              const modalStock = Number(modalActiveVariant ? modalActiveVariant.stock : selectedProductDetails.stock || 0);
              const isModalOutOfStock = modalStock <= 0;

              return (
                <>
                  <div className="space-y-3">
                    <div className="h-64 bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center border shadow-inner relative">
                      {activeGalleryImage ? (
                        <img src={activeGalleryImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={48} className="text-stone-300" />
                      )}
                      {isModalOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow">Sold Out</span>
                        </div>
                      )}
                    </div>

                    {modalImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {modalImages.map((imgUrl, i) => (
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
                    <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full w-max flex items-center gap-1 border border-emerald-200">
                      <Store size={12} /> Sold by: {selectedProductDetails.shopkeeper_profiles?.store_name || 'ValueGo'}
                    </p>
                    <p className="text-sm text-stone-600 mt-2">{selectedProductDetails.description || 'No detailed description provided for this fresh item.'}</p>
                  </div>

                  {selectedProductDetails.variants && selectedProductDetails.variants.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Select Variant / Weight</label>
                      <select 
                        className="w-full border p-3 rounded-xl text-xs bg-stone-50 font-bold outline-none"
                        value={currentVariantKey || selectedProductDetails.variants[0]?.id || selectedProductDetails.variants[0]?.label || selectedProductDetails.variants[0]?.unit_label || ''}
                        onChange={(e) => setSelectedVariants({...selectedVariants, [selectedProductDetails.id]: e.target.value})}
                      >
                        {selectedProductDetails.variants.map((v, vIdx) => (
                          <option key={v.id || vIdx} value={v.id || v.label || v.unit_label}>
                            {v.unit_label || v.label} - ₹{Number(v.price || 0).toFixed(2)} (Stock: {v.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Frequently Bought Together Suggestions */}
                  <div className="pt-3 border-t">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider mb-2.5">Frequently Bought Together</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {products
                        .filter(p => p.category_id === selectedProductDetails.category_id && p.id !== selectedProductDetails.id)
                        .slice(0, 3)
                        .map(suggestion => {
                          const suggImages = suggestion.images || suggestion.gallery || [suggestion.image_url].filter(Boolean);
                          return (
                            <div 
                              key={suggestion.id} 
                              onClick={() => {
                                setSelectedProductDetails(suggestion);
                                setActiveGalleryImage(suggImages[0] || '');
                              }}
                              className="bg-stone-50 hover:bg-stone-100 p-2.5 rounded-2xl border text-center cursor-pointer transition shadow-2xs group"
                            >
                              <img src={suggImages[0]} alt="" className="w-12 h-12 object-cover mx-auto mb-1.5 rounded-xl border group-hover:scale-105 transition" />
                              <p className="text-[11px] font-bold text-stone-800 truncate">{suggestion.name}</p>
                              <p className="text-[10px] font-black text-emerald-700 mt-0.5">₹{Number(suggestion.price || 0).toFixed(2)}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-between items-center">
                    <span className="text-xl font-black text-stone-900">
                      ₹{modalPrice.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => { addToCart(selectedProductDetails); setSelectedProductDetails(null); }}
                      disabled={isModalOutOfStock}
                      className={`font-bold px-6 py-3 rounded-2xl text-xs shadow-md transition ${
                        isModalOutOfStock 
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isModalOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-4 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 shadow-2xl z-40 flex items-center justify-between max-w-4xl mx-auto rounded-3xl border border-emerald-400/30 animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="bg-white text-emerald-700 px-3.5 py-1.5 rounded-2xl font-black text-xs shadow-md">
              {totalItemsCount} ITEMS
            </div>
            <span className="font-black text-lg">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 font-black text-xs uppercase tracking-wider bg-stone-900 hover:bg-black px-6 py-3 rounded-2xl transition duration-200 shadow-lg active:scale-95"
          >
            View Cart <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Cart & Checkout Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-end z-50 transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50/80">
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2"><ShoppingCart size={20} className="text-emerald-600" /> My Cart ({totalItemsCount})</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-stone-200/80 rounded-full text-stone-600 hover:bg-stone-300 transition"><X size={18} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex items-center justify-between gap-3 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img src={item.image || ''} alt="" className="w-12 h-12 object-cover rounded-xl border bg-white shrink-0 shadow-xs" />
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-stone-900 block truncate">{item.title}</span>
                        <span className="text-xs text-stone-500 font-medium">₹{Number(item.price || 0).toFixed(2)} each</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-stone-900 shrink-0">₹{(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs shrink-0">
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
                      No saved addresses. Please open your **Profile** menu above to add a delivery address.
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
                {selectedAddressDistance !== null && (
                  <div className="flex justify-between text-stone-500 text-xs font-medium">
                    <span>Distance from Store:</span>
                    <span className="font-bold text-stone-800">{selectedAddressDistance} KM</span>
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
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 rounded-2xl shadow-xl transition duration-200 transform active:scale-95 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
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

      {/* Feedback Modal */}
      <CustomerFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      <Footer />
    </div>
  );
}