// src/components/pages/WishlistPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Search, Heart, ShoppingBag } from 'lucide-react';
import PortalBottomNav from '../PortalBottomNav';
import CartDrawer from '../store/CartDrawer';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart & Drawer State Synchronization
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
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
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchWishlist(session.user.id);
        fetchSavedAddresses(session.user.id);
        fetchDeliveryRules();
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    const handleOpenCartEvent = () => setIsCartOpen(true);
    window.addEventListener('openCartDrawer', handleOpenCartEvent);

    const handleCartUpdate = (e) => {
      if (e.detail) {
        setCart(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('cart_items');
          setCart(saved ? JSON.parse(saved) : []);
        } catch (err) {
          setCart([]);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('openCartDrawer', handleOpenCartEvent);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [navigate]);

  const fetchWishlist = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          products (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (err) {
      console.error('Error fetching wishlist from database:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async (userId) => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setSavedAddresses(data);
      handleSelectAddress(data[0]);
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponInput.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        alert("Invalid or inactive coupon code.");
        return;
      }
      setAppliedCoupon(data);
      setCouponInput('');
      alert("Coupon applied successfully!");
    } catch (err) {
      alert("Failed to apply coupon.");
    }
  };

  const handleCheckout = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!session?.user) { navigate('/login'); return; }

    if (!cart || cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setCheckingOut(true);
    try {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;

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
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: discountAmount,
          delivery_fee: deliveryFee,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item?.product?.id || item?.id || item?.product_id,
        variant_id: item?.variant?.id || null,
        variant_label: item?.variant?.unit_label || item?.variant?.label || null,
        quantity: Number(item?.quantity) || 1,
        price: Number(item?.price) || 0
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      setCart([]);
      localStorage.removeItem('cart_items');
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
      window.dispatchEvent(new Event('storage'));
      setIsCartOpen(false);
      alert("Order placed successfully!");
      navigate('/account/orders');
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
    } catch (err) {
      console.error('Error removing item:', err.message);
    }
  };

  const addToCart = (product) => {
    const cartItemId = `${product.id}-default`;
    const itemPrice = Number(product.price) || 0;
    const itemImage = product.image_url || product.image || '';

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        cartItemId,
        product,
        variant: null,
        id: product.id,
        product_id: product.id,
        title: product.name,
        price: itemPrice,
        quantity: 1,
        stock: 99,
        image: itemImage
      }];
    });

    setTimeout(() => {
      const currentCart = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const existing = currentCart.find(item => item.cartItemId === cartItemId);
      const updatedCart = existing
        ? currentCart.map(item =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...currentCart, {
            cartItemId,
            product,
            variant: null,
            id: product.id,
            product_id: product.id,
            title: product.name,
            price: itemPrice,
            quantity: 1,
            stock: 99,
            image: itemImage
          }];
      localStorage.setItem('cart_items', JSON.stringify(updatedCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updatedCart }));
    }, 0);

    alert(`Added ${product.name} to cart!`);
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 font-sans text-stone-900 pb-36 select-none flex flex-col w-full selection:bg-orange-600 selection:text-white">
      
      {/* Smaller Top Header matching dark orange aesthetic */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 md:px-12 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <button 
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer border border-white/30"
          title="Back"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
        </button>
        <h1 className="font-black text-white text-sm md:text-base tracking-tight">My Wishlist</h1>
        <button 
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer border border-white/30"
          title="Search"
        >
          <Search size={16} className="stroke-[2.5]" />
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 w-full">
        {loading ? (
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 p-12 text-center shadow-xl">
            <p className="text-stone-500 font-bold text-xs">Loading wishlist...</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 p-12 text-center shadow-xl space-y-3">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto border border-orange-100 shadow-inner">
              <Heart size={28} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-sm">Your wishlist is empty</h3>
              <p className="text-stone-400 text-xs mt-1">Explore items and save your favorites here.</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="mt-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black shadow-lg shadow-orange-600/20 cursor-pointer transition active:scale-95 uppercase tracking-wider text-xs"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {wishlistItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              const prodImage = product.image_url || product.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

              return (
                <div 
                  key={item.id} 
                  className="bg-white/95 backdrop-blur-xl border border-orange-100 rounded-3xl p-4 flex flex-col justify-between relative shadow-xl shadow-orange-950/5 group hover:shadow-2xl transition duration-300"
                >
                  {/* Wishlist Heart Button */}
                  <button 
                    onClick={() => handleRemoveFromWishlist(item.id)}
                    className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 transition cursor-pointer z-10 hover:bg-orange-100 shadow-2xs"
                    title="Remove from wishlist"
                  >
                    <Heart size={15} className="fill-orange-600" />
                  </button>

                  {/* Product Image */}
                  <div className="w-full h-32 bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-3 border border-stone-100">
                    <img 
                      src={prodImage} 
                      alt={product.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300" 
                    />
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1 mb-3">
                    <h2 className="font-bold text-stone-900 text-xs line-clamp-2 leading-tight">{product.name}</h2>
                    <p className="text-[11px] text-stone-400 font-medium">{product.unit || ''}</p>
                  </div>

                  {/* Price and Add Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-orange-50">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-slate-900 text-xs">₹{product.price}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-[10px] text-stone-400 line-through font-bold">₹{product.mrp}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black px-4 py-2 rounded-xl text-[11px] transition cursor-pointer shadow-md shadow-orange-600/20 active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Global Bottom Navigation Bar */}
      <PortalBottomNav 
        totalItemsCount={totalItemsCount}
        totalPrice={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart Drawer Component */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        totalItemsCount={totalItemsCount}
        session={session}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        handleSelectAddress={handleSelectAddress}
        showAddAddressBox={showAddAddressBox}
        setShowAddAddressBox={setShowAddAddressBox}
        newAddressForm={newAddressForm}
        setNewAddressForm={setNewAddressForm}
        detectCustomerLocation={() => {}}
        handleAddAddress={() => {}}
        handleDeleteAddress={() => {}}
        updateQuantity={() => {}}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        handleApplyCoupon={handleApplyCoupon}
        removeCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
        cartSubtotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
        discountAmount={discountAmount}
        selectedAddressDistance={selectedAddressDistance}
        deliveryFee={deliveryFee}
        cartTotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - discountAmount + deliveryFee}
        checkingOut={checkingOut}
        handleCheckout={handleCheckout}
        navigate={navigate}
        addToCart={() => {}}
      />

    </div>
  );
}