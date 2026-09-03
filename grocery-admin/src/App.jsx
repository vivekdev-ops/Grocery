// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store, Truck,
  Tag, Image, MessageSquareQuote, FolderTree, Flame, MapPin, MessageSquare,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, TrendingUp,
  Sparkles, Bell, Search, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ForgotPassword from './components/ForgotPassword';
import UpdatePassword from './components/UpdatePassword';
import CustomerProfile from './components/CustomerProfile';
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

/* ─────────────────────────────────────────────
   GROUP ICON COLOURS  (sidebar section accents)
───────────────────────────────────────────── */
const groupMeta = {
  'Overview':             { dot: 'bg-brand-500' },
  'Operations':           { dot: 'bg-sky-500'   },
  'Management':           { dot: 'bg-violet-500' },
  'Store Setup':          { dot: 'bg-amber-500'  },
  'Marketing & Support':  { dot: 'bg-rose-500'   },
};

/* ─────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-brand-50/30 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/30 animate-glow-pulse">
          <Sparkles size={24} className="text-white" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-brand-500 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <p className="text-xs text-stone-400 font-medium">Loading admin panel…</p>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN LAYOUT
───────────────────────────────────────────── */
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
    'Marketing & Support': false,
  });
  const navigate = useNavigate();
  const prevView = useRef(activeView);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    fetchBadgeCounts();
    return () => subscription.unsubscribe();
  }, []);

  const fetchBadgeCounts = async () => {
    const { data: fbData } = await supabase
      .from('customer_feedbacks').select('status, category').eq('category', 'order_support');
    if (fbData) setPendingComplaintsCount(fbData.filter(i => !i.status || i.status === 'open').length);

    const { data: orderData } = await supabase.from('orders').select('status');
    if (orderData) setPendingOrdersCount(orderData.filter(o => o.status === 'pending' || o.status === 'processing').length);
  };

  if (loading) return <LoadingScreen />;
  if (!session) return <Login />;

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'analytics', label: 'Dashboard',         icon: LayoutDashboard },
        { id: 'reports',   label: 'Financial Reports',  icon: TrendingUp },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'orders',    label: 'Orders',    icon: ShoppingCart, badge: pendingOrdersCount },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'categories',label: 'Categories',icon: FolderTree },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'staff',             label: 'Staff & Shopkeepers',  icon: Users },
        { id: 'shopkeeperDetails', label: 'Shopkeeper Details',   icon: Store },
        { id: 'customers',         label: 'Customers',            icon: Users },
      ],
    },
    {
      title: 'Store Setup',
      items: [
        { id: 'deliveryFees',   label: 'Delivery Fees',   icon: Truck },
        { id: 'storeLocation',  label: 'Store Location',  icon: MapPin },
      ],
    },
    {
      title: 'Marketing & Support',
      items: [
        { id: 'coupons',      label: 'Coupons',                 icon: Tag },
        { id: 'banners',      label: 'Banners',                 icon: Image },
        { id: 'flashSales',   label: 'Flash Sales',             icon: Flame },
        { id: 'testimonials', label: 'Testimonials',            icon: MessageSquareQuote },
        { id: 'feedback',     label: 'Feedback & Complaints',   icon: MessageSquare, badge: pendingComplaintsCount },
      ],
    },
  ];

  const renderContent = () => {
    const map = {
      analytics: <Analytics />, reports: <AdminReports />, inventory: <ProductManager />,
      categories: <CategoryManager />, orders: <Orders />, staff: <Staff />,
      customers: <CustomerManagement />, shopkeeperDetails: <ShopkeeperDetailsAdmin />,
      deliveryFees: <DeliveryFeeManager />, storeLocation: <StoreLocationManager />,
      coupons: <CouponManager />, banners: <BannerManager />, flashSales: <FlashSaleManager />,
      testimonials: <TestimonialManager />, feedback: <AdminFeedbacks />,
    };
    return map[activeView] || <Analytics />;
  };

  const handleNav = (id) => {
    prevView.current = activeView;
    setActiveView(id);
  };

  const toggleGroup = (title) => setCollapsedGroups(p => ({ ...p, [title]: !p[title] }));

  // Find active item label for topbar
  const allItems = menuGroups.flatMap(g => g.items);
  const activeLabel = allItems.find(i => i.id === activeView)?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-xs">

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="bg-white border-r border-stone-100 flex flex-col shadow-[2px_0_16px_-4px_rgba(0,0,0,0.06)] relative z-20 overflow-hidden shrink-0"
      >
        {/* Logo strip */}
        <div className="h-14 flex items-center px-3 border-b border-stone-100 shrink-0">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2.5 min-w-0 flex-1"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30 shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-stone-900 truncate leading-none">Harraiya Market</p>
                  <p className="text-[9px] text-stone-400 truncate mt-0.5 font-medium">{session.user.email}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsCollapsed(v => !v)}
            className="ml-auto p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-none space-y-4 px-2">
          {menuGroups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.title] ?? false;
            const meta = groupMeta[group.title] ?? { dot: 'bg-stone-400' };

            return (
              <div key={group.title}>
                {/* Group header */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-2.5 py-1 mb-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
                        {group.title}
                      </span>
                    </div>
                    <motion.span
                      animate={{ rotate: isGroupCollapsed ? -90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={11} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </motion.span>
                  </button>
                )}

                <AnimatePresence initial={false}>
                  {(!isGroupCollapsed || isCollapsed) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {group.items.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => handleNav(item.id)}
                            title={isCollapsed ? item.label : ''}
                            className={`w-full relative flex items-center px-2.5 py-2 rounded-xl font-medium transition-all duration-200 cursor-pointer group
                              ${isActive
                                ? 'bg-gradient-to-r from-brand-50 to-brand-100/60 text-brand-700'
                                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                              }
                              ${isCollapsed ? 'justify-center' : 'justify-between'}
                            `}
                          >
                            {/* Active left indicator */}
                            {isActive && (
                              <motion.div
                                layoutId="active-pill"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}

                            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                              <Icon
                                size={15}
                                className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-brand-600' : ''} ${isCollapsed ? '' : 'group-hover:scale-110'}`}
                              />
                              {!isCollapsed && (
                                <span className="truncate text-[11px]">{item.label}</span>
                              )}
                            </div>

                            {/* Badge */}
                            {item.badge > 0 && !isCollapsed && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-amber-500 text-white text-[9px] min-w-[18px] h-[18px] px-1 rounded-full font-black flex items-center justify-center shadow-sm"
                              >
                                {item.badge}
                              </motion.span>
                            )}
                            {item.badge > 0 && isCollapsed && (
                              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-badge-pop" />
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-stone-100 space-y-0.5 shrink-0">
          <button
            onClick={() => navigate('/select')}
            title={isCollapsed ? 'Switch App' : ''}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-stone-500 hover:bg-stone-50 hover:text-stone-800 rounded-xl font-medium transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Store size={15} className="shrink-0" />
            {!isCollapsed && <span className="truncate text-[11px]">Switch App</span>}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            title={isCollapsed ? 'Sign Out' : ''}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl font-medium transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={15} className="shrink-0" />
            {!isCollapsed && <span className="truncate text-[11px]">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-5 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            <h2 className="text-sm font-black text-stone-800">{activeLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
                <Bell size={16} />
              </button>
              {(pendingOrdersCount + pendingComplaintsCount) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-badge-pop" />
              )}
            </div>
            {/* Avatar */}
            <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm">
              {session.user.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        {/* Content area with page transition */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 max-w-7xl mx-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   APP ROUTES  — with page transition wrapper
───────────────────────────────────────────── */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"                element={<PageWrap><CustomerStorefront /></PageWrap>} />
        <Route path="/track"           element={<PageWrap><OrderTracker /></PageWrap>} />
        <Route path="/login"           element={<PageWrap><CustomerAuth /></PageWrap>} />
        <Route path="/select"          element={<PageWrap><HomeSelector /></PageWrap>} />
        <Route path="/admin"           element={<AdminLayout />} />
        <Route path="/shopkeeper"      element={<ShopkeeperPortal />} />
        <Route path="/delivery"        element={<DeliveryPortal />} />
        <Route path="/privacy-policy"  element={<PageWrap><PrivacyPolicy /></PageWrap>} />
        <Route path="/terms-of-service" element={<PageWrap><TermsOfService /></PageWrap>} />
        <Route path="/forgot-password" element={<PageWrap><ForgotPassword /></PageWrap>} />
        <Route path="/update-password" element={<PageWrap><UpdatePassword /></PageWrap>} />
        <Route path="/profile"         element={<PageWrap><CustomerProfile /></PageWrap>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrap({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return <AnimatedRoutes />;
}
