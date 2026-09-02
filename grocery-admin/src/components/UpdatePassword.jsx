import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, ShieldCheck } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Listen for the recovery state token exchange in the URL hash
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is authenticated via recovery link and ready to update password
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      alert("Password successfully updated!");
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Set New Password</h1>
          <p className="text-xs text-gray-500 mt-1">Please enter your new secure password below.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-green-600 outline-none transition"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#0c831f] hover:bg-[#0b6f1a] text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <ShieldCheck size={18} />
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}