// src/components/CustomerAuth.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, AlertCircle, Zap } from 'lucide-react';

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

      // 1. Check if user is a Shopkeeper
      const { data: shopkeeper } = await supabase.from('shopkeeper_profiles').select('*').eq('user_id', userId).single();
      if (shopkeeper) {
        navigate('/shopkeeper');
        return;
      }

      // 2. Check Staff Profiles for Role Validation
      const { data: staff } = await supabase.from('staff_profiles').select('*').eq('user_id', userId).single();
      if (staff) {
        const role = (staff.role || '').toLowerCase();
        if (role.includes('delivery') || role.includes('rider') || role.includes('delivery boy')) {
          navigate('/delivery');
        } else if (role === 'admin' || role === 'manager' || role === 'staff') {
          navigate('/admin');
        } else {
          navigate('/');
        }
        return;
      }

      // 3. Check Customer Profiles or metadata
      const { data: customer } = await supabase.from('customer_profiles').select('*').eq('user_id', userId).maybeSingle();
      if (customer || data.user.user_metadata?.role === 'customer' || (!staff && !shopkeeper)) {
        navigate('/');
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-100/40 flex items-center justify-center p-4 font-sans text-xs selection:bg-orange-600 selection:text-white select-none">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-orange-950/5 border border-orange-100 space-y-6">

        {/* Logo and Header matching KD Store dark orange/amber theme */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-600/30 border border-orange-300 mx-auto">
            <Zap size={28} className="fill-amber-300 text-amber-300" />
          </div>
          <div className="space-y-1">
            <h1 className="font-black text-stone-900 text-xl tracking-tight">
              {isLogin ? 'Welcome Back to KD Store' : 'Create New Account'}
            </h1>
            <p className="text-stone-400 text-xs font-medium">
              {isLogin ? 'Log in to your account using email or password' : 'Set up your username and password. You can always change it later.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-2xs">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleAuth} className="space-y-4">

          {!isLogin && (
            <div className="space-y-1">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] px-1">Full Name</label>
              <input 
                type="text" 
                required 
                placeholder="Smith Mate"
                className="w-full bg-stone-50/70 border-2 border-stone-200/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] px-1">Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="smithmate@example.com"
              className="w-full bg-stone-50/70 border-2 border-stone-200/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] px-1">Phone Number</label>
              <input 
                type="tel" 
                required 
                placeholder="(205) 555-0100"
                className="w-full bg-stone-50/70 border-2 border-stone-200/80 px-4 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>
          )}

          <div className="space-y-1 relative">
            <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] px-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="••••••••"
                className="w-full bg-stone-50/70 border-2 border-stone-200/80 pl-4 pr-12 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition cursor-pointer p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1 relative">
              <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] px-1">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-stone-50/70 border-2 border-stone-200/80 pl-4 pr-12 py-3.5 rounded-2xl font-extrabold text-stone-900 outline-none focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition text-sm shadow-2xs placeholder:text-stone-400 placeholder:font-medium"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-orange-600 hover:text-orange-700 font-extrabold text-xs transition cursor-pointer"
              >
                Forgot Password ?
              </Link>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-600/25 transition cursor-pointer uppercase tracking-wider text-xs active:scale-95 flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Signup')}
          </button>
        </form>

        {/* Switch Mode prompt & Storefront Link */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-stone-500 font-medium text-xs">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} 
              className="text-orange-600 font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0 text-xs"
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