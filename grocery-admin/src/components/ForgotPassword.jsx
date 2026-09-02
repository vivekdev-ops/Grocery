// src/components/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h1>
          <p className="text-xs text-gray-500 mt-1">Enter your email and we'll send you a password recovery link.</p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
            <h3 className="font-bold text-emerald-900 text-sm">Check your inbox</h3>
            <p className="text-xs text-emerald-700">
              We've sent a password reset link to <span className="font-semibold">{email}</span>.
            </p>
            <div className="pt-2">
              <Link to="/login" className="text-xs font-bold text-emerald-600 hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

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

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#0c831f] hover:bg-[#0b6f1a] text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Sending Link...' : 'Send Recovery Link'} <ArrowRight size={16} />
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-bold text-gray-600 hover:text-green-700 transition">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}