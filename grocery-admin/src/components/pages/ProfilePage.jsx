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
  Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        navigate('/login');
      }
    });
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-stone-500 font-bold text-xs bg-stone-50">Loading profile...</div>;
  }

  const displayName = fullName || session?.user?.user_metadata?.full_name || 'Smith Mate';
  const displayEmail = session?.user?.email || 'smithmate@example.com';
  const activeAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-32 select-none flex flex-col w-full selection:bg-emerald-500 selection:text-white">
      
      {activeTab === 'edit' ? (
        <>
          {/* Top Header for Edit Mode */}
          <div className="px-6 md:px-12 py-4 flex items-center justify-between border-b border-stone-100 bg-white sticky top-0 z-30 shadow-xs w-full">
            <button 
              type="button"
              onClick={() => setActiveTab('menu')}
              className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </button>
            <h1 className="font-black text-slate-900 text-base md:text-xl tracking-tight">Edit Profile</h1>
            <div className="w-10" />
          </div>

          <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 w-full space-y-6">
            <div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-stone-200/80 w-full">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center pt-2 pb-4">
                  <div className="relative">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-stone-100 overflow-hidden border-4 border-emerald-500 shadow-md flex items-center justify-center">
                      <img src={activeAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <label className="absolute bottom-0 right-0 w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-600 uppercase tracking-wider text-[10px] px-1">Name</label>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-white outline-none focus:border-emerald-500 font-bold text-stone-900 text-sm transition shadow-2xs"
                      placeholder="Smith Mate"
                    />
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-600 uppercase tracking-wider text-[10px] px-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={displayEmail}
                      className="w-full px-4 py-3.5 border-2 border-stone-200 rounded-2xl bg-stone-50/70 text-stone-500 font-bold text-sm cursor-not-allowed shadow-2xs"
                    />
                  </div>

                  {/* Mobile Number Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-600 uppercase tracking-wider text-[10px] px-1">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-white outline-none focus:border-emerald-500 font-bold text-stone-900 text-sm transition shadow-2xs"
                      placeholder="(205) 555-0100"
                    />
                  </div>

                  {/* Enter Address Field */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-emerald-600 uppercase tracking-wider text-[10px] px-1">Enter Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-white outline-none focus:border-emerald-500 font-bold text-stone-900 text-sm transition shadow-2xs"
                      placeholder="8502 Preston Rd. Inglewood, USA"
                    />
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer uppercase tracking-wider text-xs md:text-sm active:scale-95 flex items-center justify-center"
                  >
                    {saving ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>

              </form>
            </div>
          </main>
        </>
      ) : (
        <>
          {/* Top Green Banner / Header */}
          <div className="bg-emerald-500 text-white rounded-b-[3rem] px-6 md:px-16 py-12 md:py-16 shadow-lg space-y-6 w-full">
            <div className="max-w-4xl mx-auto w-full">
              <h1 className="text-center font-black text-xl md:text-3xl tracking-tight mb-8">My Profile</h1>

              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-2 text-center md:text-left">
                <div className="relative">
                  <img 
                    src={activeAvatar} 
                    alt="Profile" 
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-white/90 shadow-xl bg-white"
                  />
                  <button 
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                <div className="min-w-0 space-y-1">
                  <h2 className="font-black text-xl md:text-2xl truncate tracking-tight">{displayName}</h2>
                  <p className="text-xs md:text-sm text-emerald-100 font-medium truncate">{displayEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Options List */}
          <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 mt-8 md:mt-10 w-full space-y-6">
            <div className="bg-white rounded-[2rem] border border-stone-200/85 shadow-xs overflow-hidden divide-y divide-stone-100 text-xs md:text-sm">
              
              <button 
                type="button"
                onClick={() => setActiveTab('edit')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <User size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">Edit Profile</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/account/address')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <MapPin size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">My Address</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/account/orders')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Package size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">My Orders</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/about')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Info size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">About Us</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={handleShareApp}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <Share2 size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">Share App</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <ShieldCheck size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">Privacy Policy</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/terms')}
                className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <FileText size={22} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm md:text-base">Terms & Conditions</span>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition" />
              </button>

            </div>

            {/* Logout Button */}
            <div className="pt-2 pb-10">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </main>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Home"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Home size={22} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/wishlist')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Wishlist"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Heart size={22} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Cart"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <ShoppingBag size={22} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Profile"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500 shadow-xs">
              <User size={22} />
            </div>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}