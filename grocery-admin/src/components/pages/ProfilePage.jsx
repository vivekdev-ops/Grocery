// src/components/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Phone, Mail, Save, UserCircle } from 'lucide-react';
import StoreHeader from '../store/StoreHeader';
import Footer from '../Footer';

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
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      <StoreHeader session={session} customerProfile={customerProfile} showSearch={false} />

      <main className="flex-1 max-w-xl mx-auto px-4 py-8 w-full space-y-6">
        <div>
          <h1 className="text-xl font-black text-stone-900">My Profile</h1>
          <p className="text-xs text-stone-500 mt-0.5">Manage your account details and preferences.</p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-2xs">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
              <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-full h-full text-stone-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block font-bold text-stone-600 mb-1">Avatar Image URL</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatar_url}
                  onChange={e => setForm({ ...form, avatar_url: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl p-2.5 bg-stone-50 outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-600">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input 
                  type="text" 
                  required
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-emerald-500 font-bold"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-600">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input 
                  type="tel" 
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-emerald-500 font-bold"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-600">Email Address (Locked)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input 
                  type="email" 
                  disabled
                  value={session?.user?.email || ''}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl bg-stone-100 text-stone-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-md transition cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}