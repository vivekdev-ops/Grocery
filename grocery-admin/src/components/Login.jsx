// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';

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

    // 1. Authenticate with Supabase Auth (Email & Password)
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

    // 3. Check if user is Staff (Delivery Partner, Manager, or Admin)
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (staff) {
      if (staff.role === 'delivery' || staff.role === 'delivery_man') {
        navigate('/delivery');
      } else if (staff.role === 'manager') {
        navigate('/manager');
      } else {
        navigate('/admin');
      }
      return;
    }

    // 4. Default fallback for standard customers
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your email and password</p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-green-600 outline-none transition"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Password</label>
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
            className="w-full bg-[#0c831f] hover:bg-[#0b6f1a] text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
          </button>

          {/* Forgot Password Button matching the Login style */}
          <Link 
            to="/forgot-password" 
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer block text-center"
          >
            <KeyRound size={16} className="text-gray-600" />
            Forgot Password?
          </Link>
        </form>

        <div className="mt-6 text-center border-t pt-4">
          <Link to="/" className="text-xs font-bold text-gray-600 hover:text-green-700 transition">
            ← Back to Customer Storefront
          </Link>
        </div>

      </div>
    </div>
  );
}