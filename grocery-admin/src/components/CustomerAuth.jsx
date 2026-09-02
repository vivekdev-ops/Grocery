// src/components/CustomerAuth.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ArrowLeft, KeyRound } from 'lucide-react';

export default function CustomerAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else {
        alert("Registration successful! You can now log in.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative">
      <Link to="/" className="absolute top-4 left-4 text-gray-500 font-medium flex items-center gap-1 hover:text-gray-800 transition">
        <ArrowLeft size={18} /> Back to Store
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{isSignUp ? 'Create Customer Account' : 'Customer Login'}</h1>
        <p className="text-sm text-gray-500 mb-6">{isSignUp ? 'Register to track orders and save addresses' : 'Log in to view your order history'}</p>

        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" required placeholder="you@example.com" 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" required placeholder="••••••••" 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition cursor-pointer">
            {loading ? 'Please wait...' : isSignUp ? 'Register Account' : 'Login'}
          </button>

          {/* Forgot Password Button - shows only in Login mode */}
          {!isSignUp && (
            <Link 
              to="/forgot-password" 
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer block text-center"
            >
              <KeyRound size={16} className="text-gray-600" />
              Forgot Password?
            </Link>
          )}
        </form>

        <div className="mt-6 text-sm">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-green-700 font-medium hover:underline cursor-pointer">
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}