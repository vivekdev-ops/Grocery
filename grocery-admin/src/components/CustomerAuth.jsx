// src/components/CustomerAuth.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ArrowLeft, KeyRound } from 'lucide-react';

export default function CustomerAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isSignUp && !acceptedTerms) {
      alert("Please accept the Terms and Conditions to sign up.");
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else {
        alert("Registration successful! You can now log in.");
        setIsSignUp(false);
        setAcceptedTerms(false);
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

          {/* Terms and Conditions Checkbox (Shown only during sign up) */}
          {isSignUp && (
            <div className="flex items-start gap-2.5 pt-1">
              <input 
                type="checkbox" 
                id="terms" 
                required
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-green-600 font-bold hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" target="_blank" className="text-green-600 font-bold hover:underline">
                  Privacy Policy
                </Link>.
              </label>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || (isSignUp && !acceptedTerms)} 
            className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
          <button 
            onClick={() => { 
              setIsSignUp(!isSignUp); 
              setAcceptedTerms(false); 
            }} 
            className="text-green-700 font-medium hover:underline cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}