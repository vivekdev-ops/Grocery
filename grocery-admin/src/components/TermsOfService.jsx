// src/components/TermsOfService.jsx
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import Footer from './Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/20 to-stone-100 font-sans flex flex-col justify-between">
      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/60 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-stone-700 hover:text-emerald-600 font-bold text-sm transition">
            <ArrowLeft size={18} /> Back to Store
          </Link>
          <span className="font-black text-stone-900">Harraiya Super Market</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 space-y-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200/80 shadow-xs space-y-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Terms of Service</h1>
            <p className="text-xs text-stone-400 mt-1">Last updated: August 2026</p>
          </div>

          <div className="space-y-4 text-stone-600 text-sm leading-relaxed">
            <p>
              By accessing and placing an order with Harraiya Super Market, you confirm that you are in agreement with and bound by the terms of service contained in these Terms.
            </p>

            <h2 className="text-lg font-bold text-stone-900 pt-2">1. Quick-Commerce Orders & Delivery</h2>
            <p>
              We aim to deliver fresh groceries within our estimated 10-minute delivery window depending on operational capacity, item availability, and delivery distance. Delivery fees are calculated dynamically based on your distance from our store and cart subtotal.
            </p>

            <h2 className="text-lg font-bold text-stone-900 pt-2">2. Pricing & Inventory</h2>
            <p>
              All prices listed on the platform are in Indian Rupees (₹). While we make every effort to ensure accurate pricing and stock availability, errors may occur. In the event an item is out of stock, we reserve the right to cancel or modify the order.
            </p>

            <h2 className="text-lg font-bold text-stone-900 pt-2">3. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for restricting access to your device. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}