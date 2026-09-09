// src/components/CustomerAuth.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function CustomerAuth() {
  const [isLogin, setIsLogin] = useState(true); // Defaults to login view
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      setLoading(false);
      return;
    }

    if (isLogin) {
      // Login flow
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

      // Role checks
      const { data: shopkeeper } = await supabase.from('shopkeeper_profiles').select('*').eq('user_id', userId).single();
      if (shopkeeper) {
        navigate('/shopkeeper');
        return;
      }

      const { data: staff } = await supabase.from('staff_profiles').select('*').eq('user_id', userId).single();
      if (staff) {
        const role = (staff.role || '').toLowerCase();
        if (role.includes('delivery') || role.includes('rider')) {
          navigate('/delivery');
        } else {
          navigate('/admin');
        }
        return;
      }

      navigate('/');
    } else {
      // Signup flow setting role explicitly as customer by default in user metadata and customer profiles
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: 'customer'
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        await supabase.from('customer_profiles').upsert({
          user_id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date()
        }, { onConflict: 'user_id' });
      }

      alert('Account created successfully! Please log in.');
      setIsLogin(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans text-xs selection:bg-emerald-500 selection:text-white select-none">
      <div className="max-w-sm w-full p-6 space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 text-white font-black text-2xl tracking-tighter">
            R
          </div>
          <div className="space-y-1">
            <h1 className="font-black text-stone-900 text-xl tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create New Account'}
            </h1>
            <p className="text-stone-400 text-xs font-medium">
              {isLogin ? 'Log in to your account using email or password' : 'Set up your username and password. You can always change it later.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-[11px] font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && (
            <div>
              <input 
                type="text" 
                required 
                placeholder="Smith Mate"
                className="w-full bg-white border-2 border-emerald-400/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
              />
            </div>
          )}

          <div>
            <input 
              type="email" 
              required 
              placeholder="smithmate@example.com"
              className="w-full bg-white border-2 border-emerald-400/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          {!isLogin && (
            <div>
              <input 
                type="tel" 
                required 
                placeholder="(205) 555-0100"
                className="w-full bg-white border-2 border-emerald-400/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>
          )}

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              placeholder="••••••••"
              className="w-full bg-white border-2 border-emerald-400/80 pl-4 pr-12 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
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

          {!isLogin && (
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                placeholder="••••••••"
                className="w-full bg-white border-2 border-emerald-400/80 pl-4 pr-12 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-emerald-500 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {isLogin && (
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-emerald-500 hover:text-emerald-600 font-extrabold text-xs transition cursor-pointer"
              >
                Forgot Password ?
              </Link>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer uppercase tracking-wider text-xs active:scale-95 flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Signup')}
          </button>
        </form>

        {/* Switch Mode prompt & Storefront Link */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-stone-500 font-medium text-xs">
            {isLogin ? "Didn't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} 
              className="text-emerald-500 font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0 text-xs"
            >
              {isLogin ? 'Register' : 'Log in'}
            </button>
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