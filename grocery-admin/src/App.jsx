// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store, Truck, Tag, Image, MessageSquareQuote, FolderTree, Flame, MapPin, MessageSquare } from 'lucide-react';

import HomeSelector from './components/HomeSelector';
import CustomerStorefront from './components/CustomerStorefront';
import CustomerAuth from './components/CustomerAuth';
import Login from './components/Login';
import ProductManager from './components/ProductManager';
import Orders from './components/Orders';
import Analytics from './components/Analytics';
import Staff from './components/Staff';
import DeliveryPortal from './components/DeliveryPortal';
import ShopkeeperPortal from './components/ShopkeeperPortal';
import DeliveryFeeManager from './components/DeliveryFeeManager';
import CouponManager from './components/CouponManager';
import CustomerManagement from './components/CustomerManagement';
import BannerManager from './components/BannerManager';
import OrderTracker from './components/OrderTracker';
import TestimonialManager from './components/TestimonialManager';
import ShopkeeperDetailsAdmin from './components/ShopkeeperDetailsAdmin';
import CategoryManager from './components/CategoryManager';
import FlashSaleManager from './components/FlashSaleManager';
import StoreLocationManager from './components/StoreLocationManager';
import FeedbackAdmin from './components/FeedbackAdmin'; // <-- Imported Customer Feedback Admin View
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('analytics');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading...</div>;
  if (!session) return <Login />;

  const renderContent = () => {
    switch (activeView) {
      case 'analytics': return <Analytics />;
      case 'inventory': return <ProductManager />;
      case 'categories': return <CategoryManager />;
      case 'orders': return <Orders />;
      case 'staff': return <Staff />;
      case 'customers': return <CustomerManagement />;
      case 'shopkeeperDetails': return <ShopkeeperDetailsAdmin />;
      case 'deliveryFees': return <DeliveryFeeManager />;
      case 'storeLocation': return <StoreLocationManager />;
      case 'coupons': return <CouponManager />;
      case 'banners': return <BannerManager />;
      case 'flashSales': return <FlashSaleManager />;
      case 'testimonials': return <TestimonialManager />;
      case 'feedback': return <FeedbackAdmin />; // <-- Render Feedback Admin View
      default: return <Analytics />;
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-xl font-black text-brand-700">Harraiya Super Market</h1>
          <p className="text-xs text-stone-500 truncate mt-1">{session.user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button onClick={() => setActiveView('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'analytics' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><LayoutDashboard size={18} />Dashboard</button>
          <button onClick={() => setActiveView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'inventory' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Package size={18} />Inventory</button>
          <button onClick={() => setActiveView('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'categories' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><FolderTree size={18} />Categories</button>
          <button onClick={() => setActiveView('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'orders' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><ShoppingCart size={18} />Orders</button>
          <button onClick={() => setActiveView('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'staff' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Users size={18} />Staff & Shopkeepers</button>
          <button onClick={() => setActiveView('shopkeeperDetails')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'shopkeeperDetails' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Store size={18} />Shopkeeper Details</button>
          <button onClick={() => setActiveView('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'customers' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Users size={18} />Customers</button>
          <button onClick={() => setActiveView('deliveryFees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'deliveryFees' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Truck size={18} />Delivery Fees</button>
          <button onClick={() => setActiveView('storeLocation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'storeLocation' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><MapPin size={18} />Store Location</button>
          <button onClick={() => setActiveView('coupons')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'coupons' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Tag size={18} />Coupons</button>
          <button onClick={() => setActiveView('banners')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'banners' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Image size={18} />Banners</button>
          <button onClick={() => setActiveView('flashSales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'flashSales' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Flame size={18} />Flash Sales</button>
          <button onClick={() => setActiveView('testimonials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'testimonials' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><MessageSquareQuote size={18} />Testimonials</button>
          <button onClick={() => setActiveView('feedback')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeView === 'feedback' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><MessageSquare size={18} />Feedback & Complaints</button>
        </nav>
        <div className="p-4 border-t border-stone-200 space-y-2">
          <button onClick={() => navigate('/select')} className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors"><Store size={18} />Switch App</button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors"><LogOut size={18} />Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerStorefront />} />
      <Route path="/track" element={<OrderTracker />} />
      <Route path="/login" element={<CustomerAuth />} />
      <Route path="/select" element={<HomeSelector />} />
      <Route path="/admin" element={<AdminLayout />} />
      <Route path="/shopkeeper" element={<ShopkeeperPortal />} />
      <Route path="/delivery" element={<DeliveryPortal />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
    </Routes>
  );
}