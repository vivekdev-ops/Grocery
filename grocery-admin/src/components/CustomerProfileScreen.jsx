// src/components/CustomerProfileScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  User,
  Lock,
  CreditCard,
  Package,
  ShieldCheck,
  FileText,
  LogOut,
  ChevronRight,
  Edit3,
  Home,
  Heart,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Footer from './Footer';

export default function CustomerProfileScreen() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || 'Smith Mate';
  const displayEmail = session?.user?.email || 'smithmate@example.com';
  const avatarUrl = profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-28 select-none">
      
      {/* Top Green Banner */}
      <div className="bg-emerald-500 text-white rounded-b-[2.5rem] p-6 pt-10 shadow-lg space-y-6">
        <h1 className="text-center font-black text-lg tracking-tight">My Profile</h1>

        <div className="flex items-center gap-4 pb-2">
          <div className="relative">
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-16 h-16 rounded-full object-cover border-2 border-white/80 shadow-md bg-white"
            />
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs cursor-pointer">
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
      <main className="max-w-md mx-auto px-4 mt-6 space-y-3">
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden divide-y divide-stone-100">
          
          <button 
            onClick={() => navigate('/account')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <User size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">Edit Profile</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

          <button 
            onClick={() => navigate('/account')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">Change Password</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

          <button 
            onClick={() => navigate('/account')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">Payment Method</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

          <button 
            onClick={() => navigate('/account/orders')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Package size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">My Orders</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

          <button 
            onClick={() => navigate('/')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">Privacy Policy</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

          <button 
            onClick={() => navigate('/')}
            className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <span className="font-extrabold text-xs text-slate-900">Terms & Conditions</span>
            </div>
            <ChevronRight size={18} className="text-stone-400" />
          </button>

        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Home"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Home size={20} />
            </div>
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Wishlist"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <Heart size={20} />
            </div>
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Cart"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 transition">
              <ShoppingBag size={20} />
            </div>
          </button>

          <button
            onClick={() => {}}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Profile"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-500 shadow-xs">
              <User size={20} />
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}