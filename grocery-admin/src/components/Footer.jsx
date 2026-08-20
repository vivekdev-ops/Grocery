// src/components/Footer.jsx
import { ShieldCheck, Truck, Clock, Headphones, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700 font-sans mt-16">
      {/* Features Bar */}
      <div className="bg-amber-50/50 border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Express Delivery</h4>
              <p className="text-xs text-gray-500 mt-0.5">Quick doorstep delivery right on time.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-[#0c831f] rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">100% Authentic</h4>
              <p className="text-xs text-gray-500 mt-0.5">Fresh grocery items sourced directly.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Best Quality</h4>
              <p className="text-xs text-gray-500 mt-0.5">Checked for premium grade quality.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
              <Headphones size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Customer Support</h4>
              <p className="text-xs text-gray-500 mt-0.5">Dedicated help for all your orders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-black tracking-tight text-gray-900">Harraiya Super Market</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your trusted destination for everyday groceries, fresh produce, and household essentials delivered with care.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Useful Links</h4>
            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              <li><a href="/" className="hover:text-[#0c831f] transition">Home Store</a></li>
              <li><a href="/track" className="hover:text-[#0c831f] transition">Track Order</a></li>
              <li><a href="/login" className="hover:text-[#0c831f] transition">Customer Login</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Categories</h4>
            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              <li><span className="hover:text-[#0c831f] transition cursor-pointer">Vegetables & Fruits</span></li>
              <li><span className="hover:text-[#0c831f] transition cursor-pointer">Dairy & Breakfast</span></li>
              <li><span className="hover:text-[#0c831f] transition cursor-pointer">Munchies & Snacks</span></li>
              <li><span className="hover:text-[#0c831f] transition cursor-pointer">Household Care</span></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Contact Us</h4>
            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-[#0c831f] shrink-0 mt-0.5" />
                <span>Harraiya, Basti, Uttar Pradesh, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-[#0c831f] shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-[#0c831f] shrink-0" />
                <span>support@harraiyasupermarket.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} Harraiya Super Market. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}