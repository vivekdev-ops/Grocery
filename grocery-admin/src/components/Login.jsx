// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        return;
      } else if (role === 'admin' || role === 'manager' || role === 'staff') {
        navigate('/admin');
        return;
      }
    }

    // 4. Check Customer Profiles or default to customer role -> Redirect to home page (/)
    const { data: customer } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (customer || data.user.user_metadata?.role === 'customer' || !staff && !shopkeeper) {
      navigate('/');
      return;
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans text-xs selection:bg-emerald-500 selection:text-white select-none">
      <div className="max-w-sm w-full p-6 space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 text-white font-black text-2xl tracking-tighter">
            R
          </div>
          <div className="space-y-1">
            <h1 className="font-black text-stone-900 text-xl tracking-tight">Welcome Back</h1>
            <p className="text-stone-400 text-xs font-medium">Log in to your account using email or phone</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-[11px] font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="text" 
              required 
              placeholder="Phone Number or Email"
              className="w-full bg-white border-2 border-stone-200/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              placeholder="Password"
              className="w-full bg-white border-2 border-stone-200/80 pl-4 pr-12 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-emerald-500 hover:text-emerald-600 font-extrabold text-xs transition cursor-pointer"
            >
              Forgot Password ?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer uppercase tracking-wider text-xs active:scale-95 flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Register prompt & Storefront Link */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-stone-500 font-medium text-xs">
            Didn't have an account? <Link to="/signup" className="text-emerald-500 font-extrabold hover:underline">Register</Link>
          </p>
          <div className="border-t border-stone-100 pt-3">
            <Link to="/" className="text-stone-400 hover:text-stone-600 font-bold transition text-[11px] inline-block">
              ← Return to Customer Storefront
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}