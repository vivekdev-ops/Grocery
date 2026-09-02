// src/components/store/Footer.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingBag, ShieldCheck, Clock, Headphones, ArrowRight, Heart } from 'lucide-react';

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
        .limit(5); // Strictly cap at 5 categories as requested

      if (!error && data) {
        setFooterCategories(data);
      }
    } catch (err) {
      console.error('Error fetching footer categories:', err);
    }
  };

  return (
    <footer className="bg-gradient-to-b from-white to-emerald-50/40 border-t border-emerald-100 font-sans pt-16 pb-12 mt-20 text-slate-700">
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        
        {/* Top Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-emerald-100">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-emerald-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">Lightning Fast</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Delivered right to your doorstep in minutes.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-emerald-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">100% Authentic</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Fresh grocery items sourced directly from trusted partners.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-emerald-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">Best Prices</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Competitive pricing and massive discounts daily.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-emerald-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
              <Headphones size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">24/7 Support</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Dedicated customer care for smooth assistance.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-black shadow-md">
                V
              </div>
              <span className="font-black text-lg text-slate-900 tracking-tight">KD Store</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your ultimate quick-commerce platform delivering groceries, dairy, fresh produce, and essentials in minutes.
            </p>
            <div className="text-xs text-slate-400 font-mono">
              © {new Date().getFullYear()} KD Store Inc. All rights reserved.
            </div>
          </div>

          {/* Admin Managed Categories (Strictly Top 5) */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Top Categories</h4>
            <ul className="space-y-2 text-xs font-bold">
              {footerCategories.length === 0 ? (
                <li className="text-slate-400 italic">No categories available</li>
              ) : (
                footerCategories.map(cat => (
                  <li key={cat.id}>
                    <button 
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(cat.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-slate-600 hover:text-emerald-700 transition flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {cat.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Useful Links */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Customer Links</h4>
            <ul className="space-y-2 text-xs font-bold">
              <li>
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-slate-600 hover:text-emerald-700 transition cursor-pointer"
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
                  className="text-slate-600 hover:text-emerald-700 transition cursor-pointer"
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
                  className="text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                >
                  My Wishlist
                </button>
              </li>
              <li>
                <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Valuego Privacy Policy: All customer transaction data is securely encrypted."); }} className="text-slate-600 hover:text-emerald-700 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Valuego Terms of Service: Deliveries are bound by our 10-minute SLA window."); }} className="text-slate-600 hover:text-emerald-700 transition">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter / Quick Contact */}
          <div className="space-y-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-900">Stay Connected</h4>
            <p className="text-xs text-slate-500">Subscribe to get instant updates on flash sales and discount drops.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed successfully! Welcome to KD Store."); e.target.reset(); }} className="space-y-2">
              <input 
                type="email" 
                required 
                placeholder="Enter your email..." 
                className="w-full bg-white border border-emerald-200 rounded-2xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 text-slate-800 shadow-2xs"
              />
              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs py-2.5 rounded-2xl transition shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Subscribe <ArrowRight size={14} />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p className="flex items-center gap-1">
            Crafted with <Heart size={14} className="fill-rose-500 text-rose-500" /> for instant deliveries.
          </p>
          <div className="flex gap-4 font-bold">
            <span className="cursor-pointer hover:text-emerald-700" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top</span>
          </div>
        </div>

      </div>
    </footer>
  );
}