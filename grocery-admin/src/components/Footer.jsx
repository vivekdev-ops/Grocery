// src/components/store/Footer.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ShieldCheck, Clock, Headphones, ArrowRight, Heart, Download, Sparkles, Send, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer({ onSelectCategory, onNavigate }) {
  const [footerCategories, setFooterCategories] = useState([]);

  useEffect(() => {
    fetchFooterCategories();
  }, []);

  const fetchFooterCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
        .limit(5);

      if (!error && data) {
        setFooterCategories(data);
      }
    } catch (err) {
      console.error('Error fetching footer categories:', err);
    }
  };

  return (
    <footer className="bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 text-white font-sans pt-20 pb-32 md:pb-16 mt-20 relative overflow-hidden border-t border-purple-500/20">
      
      {/* Decorative background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Top Interactive Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12 border-b border-purple-900/50">
          <motion.div 
            whileHover={{ y: -4 }}
            className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-purple-500/20 backdrop-blur-md shadow-lg transition group"
          >
            <div className="w-12 h-12 bg-purple-600/20 text-purple-300 rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/30 group-hover:scale-110 transition-transform">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-white">Lightning Fast</h4>
              <p className="text-[11px] text-purple-200/70 mt-0.5">Delivered in 13 minutes flat.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-purple-500/20 backdrop-blur-md shadow-lg transition group"
          >
            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-300 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-500/30 group-hover:scale-110 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-white">100% Authentic</h4>
              <p className="text-[11px] text-purple-200/70 mt-0.5">Sourced from trusted partners.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-purple-500/20 backdrop-blur-md shadow-lg transition group"
          >
            <div className="w-12 h-12 bg-pink-600/20 text-pink-300 rounded-2xl flex items-center justify-center shrink-0 border border-pink-500/30 group-hover:scale-110 transition-transform">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-white">Best Prices</h4>
              <p className="text-[11px] text-purple-200/70 mt-0.5">Massive daily discounts.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-purple-500/20 backdrop-blur-md shadow-lg transition group"
          >
            <div className="w-12 h-12 bg-teal-600/20 text-teal-300 rounded-2xl flex items-center justify-center shrink-0 border border-teal-500/30 group-hover:scale-110 transition-transform">
              <Headphones size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-white">24/7 Support</h4>
              <p className="text-[11px] text-purple-200/70 mt-0.5">Always here to help you out.</p>
            </div>
          </motion.div>
        </div>

        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Info & APK Download Banner */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-xl text-sm">
                KD
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white block">KD Store</span>
                <span className="inline-flex items-center gap-1 text-[9px] text-purple-300 font-extrabold bg-purple-900/50 px-2 py-0.5 rounded-full border border-purple-700/50">
                  <Sparkles size={9} className="animate-pulse" /> Quick Commerce
                </span>
              </div>
            </div>
            <p className="text-xs text-purple-200/70 leading-relaxed">
              Your ultimate quick-commerce platform delivering groceries, dairy, fresh produce, and essentials in minutes.
            </p>

            {/* Glowing APK Download Card */}
            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="/downloads/kd-store.apk" 
              download="KDStore.apk"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-400/30 hover:border-purple-400 text-white transition shadow-lg group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0 group-hover:rotate-12 transition-transform">
                  <Download size={16} />
                </div>
                <div>
                  <span className="font-black text-xs block text-purple-100">Get Android App</span>
                  <span className="text-[10px] text-purple-300/80 font-medium">Download APK Direct</span>
                </div>
              </div>
              <ExternalLink size={14} className="text-purple-300 group-hover:translate-x-0.5 transition-transform" />
            </motion.a>
          </div>

          {/* Admin Managed Categories */}
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" /> Top Categories
            </h4>
            <ul className="space-y-2.5 text-xs font-bold">
              {footerCategories.length === 0 ? (
                <li className="text-purple-400/50 italic">No categories available</li>
              ) : (
                footerCategories.map(cat => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(cat.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-purple-200/70 hover:text-white transition flex items-center gap-2 cursor-pointer text-left group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 group-hover:bg-purple-400 transition-colors shrink-0" />
                      <span className="group-hover:translate-x-1 transition-transform">{cat.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Useful Links */}
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" /> Customer Links
            </h4>
            <ul className="space-y-2.5 text-xs font-bold">
              <li>
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-purple-200/70 hover:text-white transition cursor-pointer hover:translate-x-1 inline-block duration-150 text-left"
                >
                  Explore Catalog
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('profile');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-purple-200/70 hover:text-white transition cursor-pointer hover:translate-x-1 inline-block duration-150 text-left"
                >
                  My Orders & Profile
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('wishlist');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-purple-200/70 hover:text-white transition cursor-pointer hover:translate-x-1 inline-block duration-150 text-left"
                >
                  My Wishlist
                </button>
              </li>
              
              <li>
                <a href="/privacy" onClick={(e) => { e.preventDefault(); if(onNavigate) onNavigate('privacy'); else window.location.href='/privacy'; window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-purple-200/70 hover:text-white transition hover:translate-x-1 inline-block duration-150">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" onClick={(e) => { e.preventDefault(); if(onNavigate) onNavigate('terms'); else window.location.href='/terms'; window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-purple-200/70 hover:text-white transition hover:translate-x-1 inline-block duration-150">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter / Quick Contact */}
          <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-purple-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" /> Stay Connected
            </h4>
            <p className="text-xs text-purple-200/70">Subscribe to get instant updates on flash sales and discount drops.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed successfully! Welcome to KD Store."); e.target.reset(); }} className="space-y-2.5">
              <div className="relative">
                <input 
                  type="email" 
                  required 
                  placeholder="Enter your email..." 
                  className="w-full bg-white/5 border border-purple-500/30 rounded-2xl px-4 py-3 text-xs outline-none focus:border-purple-400 text-white placeholder-purple-300/40 shadow-inner backdrop-blur-sm transition"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs py-3 rounded-2xl transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Subscribe"
              >
                <ShoppingBag size={14} /> Subscribe <ArrowRight size={14} />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-purple-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-purple-300/60">
          <p className="flex items-center gap-1.5 font-medium">
            Crafted with <Heart size={14} className="fill-rose-500 text-rose-500 animate-pulse" /> for instant deliveries.
          </p>
          <div className="flex items-center gap-6 font-bold">
            <span className="text-purple-200/40 font-mono">© {new Date().getFullYear()} KD Store Inc.</span>
            <span className="cursor-pointer hover:text-white transition" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top ↑</span>
          </div>
        </div>

      </div>
    </footer>
  );
}