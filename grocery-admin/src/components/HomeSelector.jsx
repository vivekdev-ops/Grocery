// src/components/HomeSelector.jsx
import { Link } from 'react-router-dom';
import { LayoutDashboard, Store, Truck, ShoppingBasket } from 'lucide-react';

export default function HomeSelector() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 font-sans">
      {/* Brand header */}
      <div className="mb-2 flex items-center gap-2">
        <ShoppingBasket size={28} className="text-brand-600" />
        <span className="text-xl font-black text-brand-700 tracking-tight">Harraiya Super Market</span>
      </div>
      <p className="text-sm text-stone-500 mb-10">Select your portal to continue</p>

      <div className="flex flex-col sm:flex-row gap-5 flex-wrap justify-center max-w-3xl">

        {/* Admin Portal */}
        <Link
          to="/admin"
          className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center gap-4 hover:border-brand-500 hover:shadow-md transition-all duration-200 w-56 text-center group"
        >
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
            <LayoutDashboard size={30} />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-800">Admin Portal</h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">Manage inventory, orders, staff &amp; analytics</p>
          </div>
        </Link>

        {/* Shopkeeper App */}
        <Link
          to="/shopkeeper"
          className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center gap-4 hover:border-purple-400 hover:shadow-md transition-all duration-200 w-56 text-center group"
        >
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Store size={30} />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-800">Shopkeeper App</h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">Manage your products &amp; view your orders</p>
          </div>
        </Link>

        {/* Delivery App */}
        <Link
          to="/delivery"
          className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center gap-4 hover:border-blue-400 hover:shadow-md transition-all duration-200 w-56 text-center group"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Truck size={30} />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-800">Delivery App</h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">View &amp; update your assigned deliveries</p>
          </div>
        </Link>

      </div>

      {/* Back to storefront */}
      <Link
        to="/"
        className="mt-10 text-xs text-stone-400 hover:text-brand-600 transition-colors flex items-center gap-1"
      >
        ← Back to Customer Storefront
      </Link>
    </div>
  );
}