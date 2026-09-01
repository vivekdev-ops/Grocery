// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store, Truck, Tag, Image, MessageSquareQuote, FolderTree, Flame, MapPin, MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';

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
import AdminFeedbacks from './components/AdminFeedbacks';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AdminReports from './components/AdminReports';


function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('analytics');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState({
    'Overview': false,
    'Operations': false,
    'Management': false,
    'Store Setup': false,
    'Marketing & Support': false
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchBadgeCounts();

    return () => subscription.unsubscribe();
  }, []);

  const fetchBadgeCounts = async () => {
    // Fetch pending customer complaints
    const { data: fbData } = await supabase
      .from('customer_feedbacks')
      .select('status, category')
      .eq('category', 'order_support');

    if (fbData) {
      const openCount = fbData.filter(item => !item.status || item.status === 'open').length;
      setPendingComplaintsCount(openCount);
    }

    // Fetch pending/processing orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('status');

    if (orderData) {
      const openOrders = orderData.filter(o => o.status === 'pending' || o.status === 'processing').length;
      setPendingOrdersCount(openOrders);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading...</div>;
  if (!session) return <Login />;

  const renderContent = () => {
    switch (activeView) {
      case 'analytics': return <Analytics />;
      case 'reports': return <AdminReports />;
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
      case 'feedback': return <AdminFeedbacks />;
      default: return <Analytics />;
    }
  };

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'analytics', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reports', label: 'Financial Reports', icon: TrendingUp }
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: pendingOrdersCount },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'categories', label: 'Categories', icon: FolderTree }
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'staff', label: 'Staff & Shopkeepers', icon: Users },
        { id: 'shopkeeperDetails', label: 'Shopkeeper Details', icon: Store },
        { id: 'customers', label: 'Customers', icon: Users }
      ]
    },
    {
      title: 'Store Setup',
      items: [
        { id: 'deliveryFees', label: 'Delivery Fees', icon: Truck },
        { id: 'storeLocation', label: 'Store Location', icon: MapPin }
      ]
    },
    {
      title: 'Marketing & Support',
      items: [
        { id: 'coupons', label: 'Coupons', icon: Tag },
        { id: 'banners', label: 'Banners', icon: Image },
        { id: 'flashSales', label: 'Flash Sales', icon: Flame },
       
        { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
        { id: 'feedback', label: 'Feedback & Complaints', icon: MessageSquare, badge: pendingComplaintsCount }
      ]
    }
  ];

  const toggleGroup = (title) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans text-xs">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-stone-200 flex flex-col shadow-xs transition-all duration-300 relative z-10`}>
        
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between">
          {!isCollapsed && (
            <div className="min-w-0 pr-2">
              <h1 className="text-sm font-black text-brand-700 truncate">Harraiya Market</h1>
              <p className="text-[10px] text-stone-400 truncate">{session.user.email}</p>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors mx-auto cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-none">
          {menuGroups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.title] ?? false;

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <button 
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    <span>{group.title}</span>
                    {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}

                {(!isGroupCollapsed || isCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveView(item.id)}
                          title={isCollapsed ? item.label : ''}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                            isActive ? 'bg-brand-50 text-brand-700 font-bold shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
                          } ${isCollapsed ? 'justify-center' : ''}`}
                        >
                          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                            <Icon size={16} className="shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!isCollapsed && item.badge > 0 && (
                            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                              {item.badge}
                            </span>
                          )}
                          {isCollapsed && item.badge > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-600 rounded-full ring-2 ring-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-2.5 border-t border-stone-200 space-y-1">
          <button 
            onClick={() => navigate('/select')} 
            title={isCollapsed ? "Switch App" : ""}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Store size={16} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Switch App</span>}
          </button>
          <button 
            onClick={() => supabase.auth.signOut()} 
            title={isCollapsed ? "Sign Out" : ""}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
        <div className="p-5 max-w-7xl mx-auto">
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