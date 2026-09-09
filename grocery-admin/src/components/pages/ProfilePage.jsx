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
  Camera
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-stone-500 font-bold text-xs">Loading profile...</div>;
  }

  const displayName = fullName || session?.user?.user_metadata?.full_name || 'Smith Mate';
  const displayEmail = session?.user?.email || 'smithmate@example.com';
  const activeAvatar = avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-28 select-none flex flex-col">
      
      {activeTab === 'edit' ? (
        <>
          {/* Top Header for Edit Mode */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-stone-100 bg-white sticky top-0 z-30">
            <button 
              type="button"
              onClick={() => setActiveTab('menu')}
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
            </button>
            <h1 className="font-black text-slate-900 text-base tracking-tight">Edit Profile</h1>
            <div className="w-9" />
          </div>

          <main className="flex-1 max-w-md mx-auto px-4 py-6 w-full space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              
              {/* Avatar Section */}
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden border-2 border-emerald-500 shadow-sm flex items-center justify-center">
                    <img src={activeAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition">
                    <Camera size={14} />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-1">
                <label className="block font-black text-emerald-500 uppercase tracking-wider text-[10px] px-1">Name</label>
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
              <div className="space-y-1">
                <label className="block font-black text-emerald-500 uppercase tracking-wider text-[10px] px-1">Email Address</label>
                <input 
                  type="email" 
                  disabled
                  value={displayEmail}
                  className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-stone-50/50 text-stone-500 font-bold text-sm cursor-not-allowed shadow-2xs"
                />
              </div>

              {/* Mobile Number Field */}
              <div className="space-y-1">
                <label className="block font-black text-emerald-500 uppercase tracking-wider text-[10px] px-1">Mobile Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-white outline-none focus:border-emerald-500 font-bold text-stone-900 text-sm transition shadow-2xs"
                  placeholder="(205) 555-0100"
                />
              </div>

              {/* Enter Address Field */}
              <div className="space-y-1">
                <label className="block font-black text-emerald-500 uppercase tracking-wider text-[10px] px-1">Enter Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-4 py-3.5 border-2 border-emerald-400 rounded-2xl bg-white outline-none focus:border-emerald-500 font-bold text-stone-900 text-sm transition shadow-2xs"
                  placeholder="8502 Preston Rd. Inglewood, USA"
                />
              </div>

              {/* Update Button */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer uppercase tracking-wider text-xs active:scale-95 flex items-center justify-center"
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>

            </form>
          </main>
        </>
      ) : (
        <>
          {/* Top Green Banner */}
          <div className="bg-emerald-500 text-white rounded-b-[2.5rem] p-6 pt-10 shadow-lg space-y-6">
            <h1 className="text-center font-black text-lg tracking-tight">My Profile</h1>

            <div className="flex items-center gap-4 pb-2">
              <div className="relative">
                <img 
                  src={activeAvatar} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/80 shadow-md bg-white"
                />
                <button 
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs cursor-pointer"
                >
                  <Edit3 size={12} />
                </button>
              </div>

              <div className="min-w-0">
                <h2 className="font-black text-base truncate tracking-tight">{displayName}</h2>
                <p className="text-xs text-emerald-100 font-medium truncate mt-0.5">{displayEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Options List */}
          <main className="max-w-md mx-auto px-4 mt-6 space-y-4">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden divide-y divide-stone-100 text-xs">
              
              <button 
                type="button"
                onClick={() => setActiveTab('edit')}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900">Edit Profile</span>
                </div>
                <ChevronRight size={18} className="text-stone-400" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/account/orders')}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900">My Orders</span>
                </div>
                <ChevronRight size={18} className="text-stone-400" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900">Privacy Policy</span>
                </div>
                <ChevronRight size={18} className="text-stone-400" />
              </button>

              <button 
                type="button"
                onClick={() => navigate('/terms')}
                className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900">Terms & Conditions</span>
                </div>
                <ChevronRight size={18} className="text-stone-400" />
              </button>

            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </main>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Home"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Home size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Wishlist"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Heart size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Cart"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <ShoppingBag size={20} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Profile"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500 shadow-xs">
              <User size={20} />
            </div>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}