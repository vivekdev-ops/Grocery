// src/components/PrivacyPolicy.jsx
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import Footer from './Footer';

export default function PrivacyPolicy() {
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
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-stone-400 mt-1">Last updated: August 2026</p>
          </div>

          <div className="space-y-4 text-stone-600 text-sm leading-relaxed">
            <p>
              Welcome to Harraiya Super Market. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
            </p>

            <h2 className="text-lg font-bold text-stone-900 pt-2">1. Information We Collect</h2>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity Data:</strong> Includes name, username, or similar identifier.</li>
              <li><strong>Contact Data:</strong> Includes delivery address, email address, and telephone numbers.</li>
              <li><strong>Location Data:</strong> GPS coordinates voluntarily provided when saving delivery addresses for distance-based delivery calculations.</li>
              <li><strong>Transaction Data:</strong> Includes details about payments and orders from us.</li>
            </ul>

            <h2 className="text-lg font-bold text-stone-900 pt-2">2. How We Use Your Data</h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To register you as a new customer and process your grocery orders.</li>
              <li>To manage delivery logistics using accurate distance calculations from our store warehouse.</li>
              <li>To manage our relationship with you, including notifications regarding order verification OTPs.</li>
            </ul>

            <h2 className="text-lg font-bold text-stone-900 pt-2">3. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us through our support channels or app interface.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}