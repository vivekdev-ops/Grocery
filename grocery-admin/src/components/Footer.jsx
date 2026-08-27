// src/components/Footer.jsx
import { ShieldCheck, Truck, Clock, Headphones, MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import ValueGoLogo from './ValueGoLogo';

export default function Footer() {
  return (
    <footer className="bg-[#FAF9F5] text-slate-700 font-sans mt-20 border-t border-amber-200/60 selection:bg-amber-400 selection:text-slate-950">
      {/* Features Bar */}
      <div className="bg-[#F4F1EA] border-b border-amber-200/50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-700 rounded-2xl flex items-center justify-center shrink-0 border border-amber-300/40">
              <Truck size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Express Delivery</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Quick doorstep delivery right on time.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-300/40">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">100% Authentic</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Fresh grocery items sourced directly.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 border border-blue-300/40">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Best Quality</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Checked for premium grade quality.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-700 rounded-2xl flex items-center justify-center shrink-0 border border-purple-300/40">
              <Headphones size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Customer Support</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Dedicated help for all your orders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div>
              <ValueGoLogo />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your trusted destination for everyday groceries, fresh produce, and household essentials delivered in 10 minutes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Useful Links</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-bold">
              <li><Link to="/" className="hover:text-emerald-700 transition">Home Store</Link></li>
              <li><Link to="/login" className="hover:text-emerald-700 transition">Customer Login</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Categories</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 font-bold">
              <li><span className="hover:text-emerald-700 transition cursor-pointer">Vegetables & Fruits</span></li>
              <li><span className="hover:text-emerald-700 transition cursor-pointer">Dairy & Breakfast</span></li>
              <li><span className="hover:text-emerald-700 transition cursor-pointer">Munchies & Snacks</span></li>
              <li><span className="hover:text-emerald-700 transition cursor-pointer">Household Care</span></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Contact Us</h4>
            <ul className="space-y-3 text-xs text-slate-600 font-medium">
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                <span>Harraiya, Basti, Uttar Pradesh, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-emerald-700 shrink-0" />
                <span className="font-mono font-bold text-slate-800">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-emerald-700 shrink-0" />
                <span>support@valuego.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="border-t border-amber-200/80 mt-14 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ValueGo Technologies India. All rights reserved.</p>
          <div className="flex gap-6 font-bold text-slate-600">
            <Link to="/privacy-policy" className="hover:text-emerald-700 transition">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-emerald-700 transition">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}