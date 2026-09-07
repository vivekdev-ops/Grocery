// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 2. Check if user is a Shopkeeper
    const { data: shopkeeper } = await supabase
      .from('shopkeeper_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (shopkeeper) {
      navigate('/shopkeeper');
      return;
    }

    // 3. Check Staff Profiles for Role Validation (Admin, Manager, Delivery, etc.)
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (staff) {
      const role = (staff.role || '').toLowerCase();
      
      if (role === 'delivery' || role === 'delivery_partner' || role === 'rider' || role === 'delivery boy') {
        navigate('/delivery');
      } else if (role === 'admin' || role === 'manager' || role === 'staff') {
        navigate('/admin');
      } else {
        navigate('/admin');
      }
      return;
    }

    // 4. Default fallback for standard customers
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-xs">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-8 border border-stone-200/80 space-y-5">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20 font-black text-lg">
            KD
          </div>
          <h1 className="font-black text-stone-900 text-base">KD Store Sign In</h1>
          <p className="text-stone-400 text-[11px]">Sign in to access your account or portal</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-[11px] font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block font-bold text-stone-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input 
                type="email" 
                required 
                placeholder="name@example.com"
                className="w-full bg-stone-50 border border-stone-200 pl-10 pr-3 py-2.5 rounded-xl font-bold outline-none focus:border-emerald-500"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full bg-stone-50 border border-stone-200 pl-10 pr-3 py-2.5 rounded-xl font-bold outline-none focus:border-emerald-500"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={14} />
          </button>

          <Link 
            to="/forgot-password" 
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer block text-center"
          >
            <KeyRound size={14} className="text-stone-500" />
            Forgot Password?
          </Link>
        </form>

        <div className="text-center pt-2 border-t border-stone-100">
          <Link to="/" className="text-emerald-600 font-bold hover:underline cursor-pointer">
            ← Return to Customer Storefront
          </Link>
        </div>

      </div>
    </div>
  );
}