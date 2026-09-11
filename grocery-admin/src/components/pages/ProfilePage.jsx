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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        navigate('/login');
      }
    });

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
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [navigate]);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);
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
      
      alert('Profile updated successfully!');
      setActiveTab('menu');
    } catch (err) {
      console.error('Profile update failed:', err);
      alert('Error updating profile: ' + (err.message || err));
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
      alert('App link copied to clipboard!');
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-teal-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-bold text-xs">Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayName = fullName || session?.user?.user_metadata?.full_name || 'Vivek Kumar';
  const displayEmail = session?.user?.email || 'customer@yopmail.com';
  const activeAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/40 via-emerald-50/20 to-teal-50/30 font-sans text-stone-900 pb-36 select-none flex flex-col w-full selection:bg-emerald-500 selection:text-white">
      
      {activeTab === 'edit' ? (
        <>
          {/* Top Header for Edit Mode */}
          <header className="px-6 md:px-12 py-4 flex items-center justify-between border-b border-emerald-900/10 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs w-full">
            <button 
              type="button"
              onClick={() => setActiveTab('menu')}
              className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-600 text-stone-700 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </button>
            <div className="w-10" />
          </header>

          <main className="flex-1 max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-10 w-full space-y-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-emerald-900/5 border border-emerald-100 w-full">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                  <div className="relative group">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-stone-100 overflow-hidden border-4 border-emerald-500 shadow-xl flex items-center justify-center">
                      <img src={activeAvatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg cursor-pointer transition transform hover:scale-110 active:scale-95">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-700 uppercase tracking-wider text-[10px] px-1">Name</label>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-2xl bg-stone-50/50 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold text-stone-900 text-xs md:text-sm transition shadow-2xs"
                      placeholder="Vivek Kumar"
                    />
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-stone-400 uppercase tracking-wider text-[10px] px-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={displayEmail}
                      className="w-full px-4 py-3.5 border-2 border-stone-200 rounded-2xl bg-stone-100/70 text-stone-500 font-bold text-xs md:text-sm cursor-not-allowed shadow-2xs"
                    />
                  </div>

                  {/* Mobile Number Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-700 uppercase tracking-wider text-[10px] px-1">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-2xl bg-stone-50/50 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold text-stone-900 text-xs md:text-sm transition shadow-2xs"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  {/* Enter Address Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-700 uppercase tracking-wider text-[10px] px-1">Enter Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-200 rounded-2xl bg-stone-50/50 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-bold text-stone-900 text-xs md:text-sm transition shadow-2xs"
                      placeholder="Sector 3, Kataria Market"
                    />
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition transform active:scale-95 cursor-pointer uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2"
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
          {/* Top Banner matching modern Store aesthetics */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-b-[3.5rem] px-6 md:px-16 pt-10 pb-16 md:pb-20 shadow-xl relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            
            <div className="max-w-xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
            
              

              <div className="flex flex-col items-center gap-4 w-full">
                <div className="relative group">
                  <img 
                    src={activeAvatar} 
                    alt="Profile" 
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-white shadow-2xl bg-white"
                  />
                  <button 
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-900 hover:bg-emerald-950 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer transition transform hover:scale-110 active:scale-95"
                    title="Edit Avatar"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="font-black text-lg md:text-xl truncate tracking-tight text-white">{displayName}</h2>
                  <p className="text-xs text-emerald-100 font-medium truncate opacity-90">{displayEmail}</p>
                </div>

                
              </div>
            </div>
          </div>

          {/* Floating Menu Card Overlay */}
          <main className="flex-1 max-w-xl mx-auto px-4 md:px-0 -mt-8 md:-mt-10 w-full relative z-20 space-y-5 mb-10">
            <div className="bg-white rounded-[2.5rem] border border-stone-200/90 shadow-2xl shadow-stone-200/50 overflow-hidden divide-y divide-stone-100 text-xs md:text-sm">
              
              

              

              <button 
                type="button"
                onClick={() => navigate('/account/address')}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <CreditCard size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">Address</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/account/orders')}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <Package size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">My Orders</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/about')}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <Info size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">About Us</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={handleShareApp}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <Share2 size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">Share App</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">Privacy Policy</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/terms')}
                className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-emerald-50/40 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs border border-emerald-100">
                    <FileText size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">Terms & Conditions</span>
                </div>
                <ChevronRight size={17} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-sm transition duration-200 flex items-center justify-center gap-2 cursor-pointer border border-rose-200"
              >
                <LogOut size={16} /> Logout Account
              </button>
            </div>
          </main>
        </>
      )}

      {/* Global Bottom Navigation Bar */}
      <PortalBottomNav 
        totalItemsCount={totalItemsCount}
        totalPrice={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

    </div>
  );
}