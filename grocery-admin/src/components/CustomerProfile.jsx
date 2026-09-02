// src/components/CustomerProfile.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User, Mail, Heart, Save, ArrowLeft, Camera } from 'lucide-react';

export default function CustomerProfile() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [interests, setInterests] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        navigate('/login');
      }
    });
  }, []);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setInterests(data.interests || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);

    const updates = {
      user_id: session.user.id,
      full_name: fullName,
      phone: phone,
      interests: interests,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    // Upsert profile data
    const { error } = await supabase
      .from('customer_profiles')
      .upsert(updates, { onConflict: 'user_id' });

    if (error) {
      alert('Error updating profile: ' + error.message);
    } else {
      alert('Profile updated successfully!');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 font-medium">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="text-gray-600 font-bold flex items-center gap-1.5 hover:text-green-700 transition text-sm">
            <ArrowLeft size={16} /> Back to Storefront
          </Link>
          <h1 className="text-lg font-black text-gray-900">Account Settings</h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200 space-y-6">
          
          {/* Avatar / Picture Section */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center overflow-hidden border-2 border-green-200 shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} />
              )}
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Profile Picture URL</label>
              <input 
                type="url" 
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-green-600 outline-none"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  required 
                  placeholder="Vivek Kumar"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-green-600 outline-none transition"
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Email Address (Read-only)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="email" 
                  disabled 
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 cursor-not-allowed"
                  value={session?.user?.email || ''} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Phone Number</label>
              <input 
                type="text" 
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-green-600 outline-none transition"
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Interests & Preferences (e.g. Organic, Snacks, Dairy)</label>
              <div className="relative">
                <Heart className="absolute left-3.5 top-3 text-gray-400" size={16} />
                <textarea 
                  rows="3"
                  placeholder="Enter your favorite categories or preferences..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-green-600 outline-none transition resize-none"
                  value={interests} 
                  onChange={e => setInterests(e.target.value)} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-[#0c831f] hover:bg-[#0b6f1a] text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer mt-4"
            >
              <Save size={16} />
              {saving ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}