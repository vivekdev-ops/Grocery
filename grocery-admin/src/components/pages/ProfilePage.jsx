// src/components/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  User, 
  Package, 
  ShieldCheck, 
  FileText, 
  LogOut, 
  ChevronRight, 
  Edit3, 
  Home, 
  Heart, 
  ShoppingBag,
  ArrowLeft,
  Camera,
  MapPin,
  Info,
  Share2,
  Lock,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PortalBottomNav from '../PortalBottomNav';
import CartDrawer from '../store/CartDrawer';
import { showToast } from '../../utils/toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'edit'

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  
  // Cart state for the bottom nav bar synchronization
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout and Address states for CartDrawer
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
        fetchProfile(session.user.id);
        fetchSavedAddresses(session.user.id);
        fetchDeliveryRules();
        fetchWishlistCount(session.user.id);
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

    const handleWishlistUpdate = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) fetchWishlistCount(session.user.id);
      });
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    window.addEventListener('storage', handleCartUpdate);
    window.addEventListener('storage', handleWishlistUpdate);
    return () => {
      window.removeEventListener('openCartDrawer', handleOpenCartEvent);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
      window.removeEventListener('storage', handleCartUpdate);
      window.removeEventListener('storage', handleWishlistUpdate);
    };
  }, [navigate]);

  const fetchWishlistCount = async (userId) => {
    const { count, error } = await supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!error && count !== null) {
      setWishlistCount(count);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
      }

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err.message);
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
        showToast("Invalid or inactive coupon code.");
        return;
      }
      setAppliedCoupon(data);
      setCouponInput('');
      showToast("Coupon applied successfully!");
    } catch (err) {
      showToast("Failed to apply coupon.");
    }
  };

  const handleCheckout = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!session?.user) { navigate('/login'); return; }

    if (!cart || cart.length === 0) {
      showToast("Your cart is empty.");
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
      showToast("Order placed successfully!");
      navigate('/account/orders');
    } catch (err) {
      showToast(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);

    try {
      const updates = {
        user_id: session.user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar_url: avatarUrl.trim(),
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('customer_profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;
      
      showToast('Profile updated successfully!');
      setActiveTab('menu');
    } catch (err) {
      console.error('Profile update failed:', err);
      showToast('Error updating profile: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'KD Store',
        text: 'Check out this amazing grocery and quick commerce store!',
        url: window.location.origin,
      }).catch((err) => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.origin);
      showToast('App link copied to clipboard!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 text-stone-900 pb-36 font-sans text-xs antialiased">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-white/20 animate-pulse" />
          <div className="space-y-1">
            <div className="w-24 h-4 bg-white/30 rounded animate-pulse" />
            <div className="w-36 h-3 bg-white/20 rounded animate-pulse" />
          </div>
        </div>

        <main className="max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 animate-pulse">
          <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 h-40 w-full" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white/70 backdrop-blur-md rounded-2xl border border-orange-100 h-14 w-full" />
            ))}
          </div>
        </main>
        <PortalBottomNav totalItemsCount={totalItemsCount} totalPrice={cartTotal} wishlistCount={wishlistCount} onOpenCart={() => setIsCartOpen(true)} />
      </div>
    );
  }

  const displayName = fullName || session?.user?.user_metadata?.full_name || 'Vivek Kumar';
  const displayEmail = session?.user?.email || 'customer@yopmail.com';
  const activeAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 font-sans text-stone-900 pb-36 select-none flex flex-col w-full selection:bg-orange-600 selection:text-white text-xs antialiased">
      
      {activeTab === 'edit' ? (
        <>
          {/* Smaller Top Header for Edit Mode */}
          <header className="px-4 py-3 flex items-center justify-between border-b border-orange-900/10 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs w-full">
            <button 
              type="button"
              onClick={() => setActiveTab('menu')}
              className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-700 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </button>
            <h1 className="font-black text-slate-900 text-sm tracking-tight">Edit Profile</h1>
            <div className="w-9" />
          </header>

          <main className="flex-1 max-w-xl mx-auto px-3 sm:px-4 py-4 w-full space-y-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-xl border border-orange-100 w-full space-y-5">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center pt-2 pb-1">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border-4 border-orange-600 shadow-lg flex items-center justify-center">
                      <img src={activeAvatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition transform hover:scale-110 active:scale-95">
                      <Camera size={14} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Name Field */}
                  <div className="space-y-1">
                    <label className="block font-black text-orange-700 uppercase tracking-wider text-[10px] px-1">Name</label>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 outline-none focus:border-orange-600 focus:bg-white font-bold text-stone-900 text-xs transition shadow-2xs"
                      placeholder="Vivek Kumar"
                    />
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-1">
                    <label className="block font-black text-stone-400 uppercase tracking-wider text-[10px] px-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={displayEmail}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-stone-100/70 text-stone-500 font-bold text-xs cursor-not-allowed shadow-2xs"
                    />
                  </div>

                  {/* Mobile Number Field */}
                  <div className="space-y-1">
                    <label className="block font-black text-orange-700 uppercase tracking-wider text-[10px] px-1">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 outline-none focus:border-orange-600 focus:bg-white font-bold text-stone-900 text-xs transition shadow-2xs"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  {/* Enter Address Field */}
                  <div className="space-y-1">
                    <label className="block font-black text-orange-700 uppercase tracking-wider text-[10px] px-1">Enter Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 outline-none focus:border-orange-600 focus:bg-white font-bold text-stone-900 text-xs transition shadow-2xs"
                      placeholder="Sector 3, Kataria Market"
                    />
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black py-3 rounded-xl shadow-md shadow-orange-600/20 transition transform active:scale-95 cursor-pointer uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                  >
                    {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>

              </form>
            </div>
          </main>
        </>
      ) : (
        <>
          {/* Top Banner matching modern Store aesthetics with dark orange gradient */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-b-[2.5rem] px-4 pt-8 pb-14 shadow-md relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
            
            <div className="max-w-xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative group">
                  <img 
                    src={activeAvatar} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-lg bg-white"
                  />
                  <button 
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-amber-900 hover:bg-amber-950 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition transform hover:scale-110 active:scale-95"
                    title="Edit Avatar"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h2 className="font-black text-sm md:text-base truncate tracking-tight text-white">{displayName}</h2>
                  <p className="text-[11px] text-amber-100 font-medium truncate opacity-90">{displayEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Menu Card Overlay */}
          <main className="flex-1 max-w-xl mx-auto px-3 sm:px-4 -mt-6 w-full relative z-20 space-y-4 mb-10">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-lg overflow-hidden divide-y divide-orange-50 text-xs">
              
              <button 
                type="button"
                onClick={() => navigate('/account/address')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <CreditCard size={16} />
                  </div>
                  <span className="font-bold text-slate-900">Address</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/account/orders')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <Package size={16} />
                  </div>
                  <span className="font-bold text-slate-900">My Orders</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/about')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <Info size={16} />
                  </div>
                  <span className="font-bold text-slate-900">About Us</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={handleShareApp}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <Share2 size={16} />
                  </div>
                  <span className="font-bold text-slate-900">Share App</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="font-bold text-slate-900">Privacy Policy</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/terms')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-orange-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-orange-100">
                    <FileText size={16} />
                  </div>
                  <span className="font-bold text-slate-900">Terms & Conditions</span>
                </div>
                <ChevronRight size={15} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

            </div>

            {/* Logout Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200"
              >
                <LogOut size={15} /> Logout Account
              </button>
            </div>
          </main>
        </>
      )}

      {/* Global Bottom Navigation Bar */}
      <PortalBottomNav 
        totalItemsCount={totalItemsCount}
        totalPrice={cartTotal}
        wishlistCount={wishlistCount}
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