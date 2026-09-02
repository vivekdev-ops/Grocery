// src/components/store/CustomerProfileModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, User, Mail, Heart, Phone, Save, LogOut } from 'lucide-react';

export default function CustomerProfileModal({ isOpen, onClose, session }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [interests, setInterests] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchCustomerProfile(session.user.id);
    }
  }, [isOpen, session]);

  const fetchCustomerProfile = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone || '');
        setInterests(data.interests || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);

    const updates = {
      user_id: session.user.id,
      full_name: fullName,
      phone: phoneNumber,
      interests: interests,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    const { error } = await supabase
      .from('customer_profiles')
      .upsert(updates, { onConflict: 'user_id' });

    if (error) {
      alert('Failed to update profile: ' + error.message);
    } else {
      alert('Profile updated successfully!');
      onClose();
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 relative space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">My Account</h2>
              <p className="text-[11px] text-stone-400 truncate max-w-[220px]">{session?.user?.email}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs font-medium">Loading your profile...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            
            {/* Avatar URL Input */}
            <div className="space-y-1">
              <label className="block font-bold text-stone-600 uppercase tracking-wider text-[10px]">Profile Picture URL</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 overflow-hidden shrink-0 flex items-center justify-center text-emerald-700">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <input 
                  type="url" 
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded-xl font-medium outline-none focus:border-emerald-600 transition"
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)} 
                />
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="block font-bold text-stone-600 uppercase tracking-wider text-[10px]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="text" 
                  required 
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium outline-none focus:border-emerald-600 transition"
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="block font-bold text-stone-600 uppercase tracking-wider text-[10px]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="text" 
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium outline-none focus:border-emerald-600 transition"
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                />
              </div>
            </div>

            {/* Interests & Preferences */}
            <div className="space-y-1">
              <label className="block font-bold text-stone-600 uppercase tracking-wider text-[10px]">Interests & Preferences</label>
              <div className="relative">
                <Heart className="absolute left-3.5 top-3 text-stone-400" size={16} />
                <textarea 
                  rows="2"
                  placeholder="e.g. Organic fruits, dairy, snacks..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium outline-none focus:border-emerald-600 transition resize-none"
                  value={interests} 
                  onChange={e => setInterests(e.target.value)} 
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving changes...' : 'Save Profile'}
              </button>

              <button 
                type="button"
                onClick={handleSignOut}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}