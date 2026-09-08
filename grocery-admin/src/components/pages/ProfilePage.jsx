// src/components/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Phone, Mail, Save, UserCircle, Upload, Sparkles } from 'lucide-react';
import StoreHeader from '../store/StoreHeader';
import Footer from '../Footer';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const [session, setSession] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', avatar_url: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
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
        setCustomerProfile(data);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setForm(prev => ({ ...prev, avatar_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);

    try {
      const updates = {
        user_id: session.user.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        avatar_url: form.avatar_url.trim(),
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('customer_profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;
      setCustomerProfile(updates);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50/50 to-white font-sans text-stone-900 flex flex-col selection:bg-emerald-500 selection:text-white text-xs">
      <StoreHeader session={session} customerProfile={customerProfile} showSearch={false} />

      <main className="flex-1 max-w-xl mx-auto px-3 sm:px-4 py-6 w-full space-y-6">
        
        {/* =================================================
            PAGE HEADER BANNER
        ================================================= */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <User size={180} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] tracking-wider uppercase">
              <Sparkles size={12} /> Account Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Profile</h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-md font-medium">
              Manage your personal information, contact phone, and account profile picture.
            </p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs"
        >
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-stone-100 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-stone-100 overflow-hidden border-2 border-emerald-100 shrink-0 shadow-inner flex items-center justify-center">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-full h-full text-stone-400" />
                )}
              </div>
              <div className="space-y-2 flex-1 w-full">
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Profile Picture</label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input 
                    type="url" 
                    placeholder="https://example.com/avatar.jpg"
                    value={form.avatar_url}
                    onChange={e => setForm({ ...form, avatar_url: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 bg-stone-50 outline-none focus:border-emerald-500 font-medium truncate"
                  />
                  <label className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white px-4 py-3 rounded-xl font-bold cursor-pointer transition shrink-0 inline-flex items-center justify-center gap-1.5 shadow-xs">
                    <Upload size={14} /> Browse Device
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="text" 
                  required
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-2xl bg-stone-50 outline-none focus:border-emerald-500 focus:bg-white font-bold text-stone-900 transition"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="tel" 
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-2xl bg-stone-50 outline-none focus:border-emerald-500 focus:bg-white font-bold text-stone-900 transition"
                  placeholder="9876543210"
                />
              </div>
            </div>

            {/* Email Address (Locked) */}
            <div className="space-y-1.5">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Email Address (Locked)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="email" 
                  disabled
                  value={session?.user?.email || ''}
                  className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-2xl bg-stone-100 text-stone-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 mt-2 active:scale-95"
            >
              <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}