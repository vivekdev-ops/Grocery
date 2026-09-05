// src/components/DeliveryPortal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Truck, Package, CheckCircle, Clock, MapPin, Phone, DollarSign, LogOut,
  ShieldCheck, Mail, Lock, Eye, X, Navigation, ExternalLink, Calendar,
  Printer, Filter, TrendingUp, Zap, ChevronRight, AlertCircle, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { registerPushToken, notifyCustomerOrderStatus, notifyAdminDeliveryUpdate } from '../utils/notifications';
import NotificationBell from './NotificationBell';

/* ─────────────────────────────────────────────
   COMMISSION HELPER  (logic unchanged)
───────────────────────────────────────────── */
const getApplicableCommissionPct = (profile, rules, roleType, cartAmount) => {
  if (profile?.custom_commission_pct !== null &&
      profile?.custom_commission_pct !== undefined &&
      profile?.custom_commission_pct !== '') {
    return Number(profile.custom_commission_pct);
  }
  if (!rules || !Array.isArray(rules) || rules.length === 0) return 1;
  const targetRole = typeof roleType === 'string' ? roleType.toLowerCase() : 'delivery';
  const roleRules = rules.filter(r => r.role_type?.toLowerCase() === targetRole && r.is_active);
  const matched = roleRules.find(r => {
    const min = Number(r.min_cart_value || 0);
    const max = r.max_cart_value !== null && r.max_cart_value !== undefined && r.max_cart_value !== ''
      ? Number(r.max_cart_value) : Infinity;
    return cartAmount >= min && cartAmount <= max;
  });
  return matched ? Number(matched.commission_pct) : 1;
};

/* ─────────────────────────────────────────────
   STATUS BADGE CONFIG
───────────────────────────────────────────── */
const statusStyles = {
  processing:      { bg: 'bg-amber-100',   text: 'text-amber-700',  label: 'Processing'      },
  accepted:        { bg: 'bg-sky-100',      text: 'text-sky-700',    label: 'Accepted'        },
  pickup:          { bg: 'bg-violet-100',   text: 'text-violet-700', label: 'At Store'        },
  out_for_delivery:{ bg: 'bg-brand-100',    text: 'text-brand-700',  label: 'Out for Delivery'},
  delivered:       { bg: 'bg-emerald-100',  text: 'text-emerald-700',label: 'Delivered'       },
  pending:         { bg: 'bg-stone-100',    text: 'text-stone-600',  label: 'Pending'         },
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/* Stat card */
function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  { bg: 'bg-brand-50',   icon: 'text-brand-600',   val: 'text-brand-700'  },
    amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700'  },
    violet: { bg: 'bg-violet-50',  icon: 'text-violet-600',  val: 'text-violet-700' },
    sky:    { bg: 'bg-sky-50',     icon: 'text-sky-600',     val: 'text-sky-700'    },
  };
  const c = colors[color] || colors.brand;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${c.bg} rounded-2xl p-4 flex items-center gap-3`}
    >
      <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-black leading-none ${c.val}`}>{value}</p>
        <p className="text-[10px] font-bold text-stone-500 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[9px] text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* Order card */
function OrderCard({ order, staffProfile, commissionRules, children, delay = 0 }) {
  const cartAmount = Number(order.total_amount || 0);
  const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
  const estimatedEarning = (cartAmount * tierPct) / 100;
  const st = statusStyles[order.status] || statusStyles.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden card-hover"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50 bg-stone-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center">
            <Package size={14} className="text-brand-600" />
          </div>
          <div>
            <p className="font-mono font-black text-stone-900 text-xs">#{order.id.slice(0, 8)}</p>
            <p className="text-[9px] text-stone-400">{new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${st.bg} ${st.text}`}>
            {st.label}
          </span>
          <div className="text-right">
            <p className="font-black text-stone-900 text-sm">₹{cartAmount.toFixed(0)}</p>
            <p className="text-[9px] text-brand-600 font-bold">+₹{estimatedEarning.toFixed(0)} ({tierPct}%)</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 text-xs text-stone-600">
          <MapPin size={13} className="text-stone-400 mt-0.5 shrink-0" />
          <span className="leading-relaxed line-clamp-2">{order.delivery_address}</span>
        </div>

        {order.latitude && order.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-xl text-xs font-bold text-brand-700 transition-colors w-fit"
          >
            <Navigation size={12} /> Open in Google Maps <ExternalLink size={11} />
          </a>
        )}

        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function DeliveryPortal() {
  const [session, setSession]           = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [commissionRules, setCommissionRules] = useState([]);
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('available');

  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [verifyingOrder, setVerifyingOrder]             = useState(null);
  const [enteredOtp, setEnteredOtp]                     = useState('');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchStaffProfileAndDependencies(session.user);
        registerPushToken(session.user.id, 'delivery');
      } else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) {
        fetchStaffProfileAndDependencies(session.user);
        registerPushToken(session.user.id, 'delivery');
      } else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchDeliveryOrders(session, staffProfile);
  }, [datePreset, startDate, endDate]);

  const fetchStaffProfileAndDependencies = async (user) => {
    try {
      const [staffRes, rulesRes] = await Promise.all([
        supabase.from('staff_profiles').select('id, user_id, email, role, custom_commission_pct')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle(),
        supabase.from('cart_commission_rules').select('*').eq('is_active', true),
      ]);
      if (staffRes.data) setStaffProfile(staffRes.data);
      if (rulesRes.data) setCommissionRules(rulesRes.data);
      await fetchDeliveryOrders(session || { user }, staffRes.data);
    } catch (err) {
      console.error('Error loading staff profile & rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryOrders = async (currentSession, currentStaff) => {
    const activeSession = currentSession || session;
    if (!activeSession?.user?.email) return;
    const userId = activeSession.user.id;
    const staffId = currentStaff?.id || staffProfile?.id;

    let baseQuery = supabase.from('orders').select('*, order_items(*, products(name, image_url))');
    const now = new Date();
    if (datePreset === 'today') {
      baseQuery = baseQuery.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
    } else if (datePreset === 'week') {
      baseQuery = baseQuery.gte('created_at', new Date(now.setDate(now.getDate() - 7)).toISOString());
    } else if (datePreset === 'month') {
      baseQuery = baseQuery.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    } else if (datePreset === 'custom') {
      if (startDate) baseQuery = baseQuery.gte('created_at', new Date(startDate).toISOString());
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); baseQuery = baseQuery.lte('created_at', e.toISOString()); }
    }

    const { data: availData } = await supabase
      .from('orders').select('*, order_items(*, products(name, image_url))')
      .eq('status', 'processing').is('delivery_agent_id', null);

    let activeQuery = supabase.from('orders').select('*, order_items(*, products(name, image_url))').neq('status', 'delivered');
    activeQuery = staffId
      ? activeQuery.or(`delivery_agent_id.eq.${userId},delivery_agent_id.eq.${staffId}`)
      : activeQuery.eq('delivery_agent_id', userId);
    const { data: activeData } = await activeQuery;

    let completedQuery = baseQuery.eq('status', 'delivered');
    completedQuery = staffId
      ? completedQuery.or(`delivery_agent_id.eq.${userId},delivery_agent_id.eq.${staffId}`)
      : completedQuery.eq('delivery_agent_id', userId);
    const { data: completedData } = await completedQuery;

    const all = [...(availData || []), ...(activeData || []), ...(completedData || [])];
    setOrders(Array.from(new Map(all.map(i => [i.id, i])).values()));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert('Login failed: ' + error.message); }
    else if (data.session) { setSession(data.session); await fetchStaffProfileAndDependencies(data.session.user); }
    setLoggingIn(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const payload = { status: newStatus };
    if (newStatus === 'accepted' && session) payload.delivery_agent_id = staffProfile ? staffProfile.id : session.user.id;
    const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
    if (error) { alert('Failed to update status: ' + error.message); return; }

    // Notify customer + admin after every status transition
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const agentName = staffProfile?.full_name || staffProfile?.name || session?.user?.email || 'Rider';
      notifyCustomerOrderStatus({ ...order, ...payload }, newStatus);
      notifyAdminDeliveryUpdate(order, newStatus, agentName);
    }

    fetchDeliveryOrders();
    setSelectedOrderDetails(null);
  };

  const handleVerifyAndDeliver = async (e) => {
    e.preventDefault();
    if (!verifyingOrder) return;
    if (enteredOtp.trim() !== verifyingOrder.otp) { alert('Incorrect OTP. Please check and try again.'); return; }
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', verifyingOrder.id);
    if (error) { alert('Failed to update status: ' + error.message); return; }

    // Notify customer delivery is complete + notify admin
    const agentName = staffProfile?.full_name || staffProfile?.name || session?.user?.email || 'Rider';
    notifyCustomerOrderStatus(verifyingOrder, 'delivered');
    notifyAdminDeliveryUpdate(verifyingOrder, 'delivered', agentName);

    alert('Order delivered and verified!');
    setVerifyingOrder(null);
    setEnteredOtp('');
    fetchDeliveryOrders();
  };

  const availableOrders  = orders.filter(o => o.status === 'processing' && !o.delivery_agent_id);
  const myActiveOrders   = orders.filter(o => o.delivery_agent_id && o.status !== 'delivered');
  const myCompletedOrders = orders.filter(o => o.delivery_agent_id && o.status === 'delivered');

  const totalEarnings = myCompletedOrders.reduce((sum, order) => {
    const amt = Number(order.total_amount || 0);
    return sum + (amt * getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', amt)) / 100;
  }, 0);

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-brand-50/30">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/30 animate-glow-pulse">
            <Truck size={24} className="text-white" />
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-2 h-2 bg-brand-400 rounded-full"
                animate={{ y: [0,-8,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i*0.15 }} />
            ))}
          </div>
          <p className="text-xs text-stone-400 font-medium">Loading delivery portal…</p>
        </motion.div>
      </div>
    );
  }

  /* ── LOGIN ── */
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-brand-50/30 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-300/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-stone-200/60 border border-white/80 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30 animate-float">
              <Truck size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900">Delivery Portal</h1>
              <p className="text-xs text-stone-400 mt-1">Sign in with your agent credentials</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="email" required
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 transition-all"
                  placeholder="agent@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type={showPass ? 'text' : 'password'} required
                  className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 transition-all"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                  <Eye size={15} />
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loggingIn}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black py-3.5 rounded-xl shadow-lg shadow-brand-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-60 btn-press"
            >
              <ShieldCheck size={17} />
              {loggingIn ? 'Signing In…' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => navigate('/')} className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors hover:underline">
              ← Return to Storefront
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── TABS CONFIG ── */
  const tabs = [
    { id: 'available', label: 'Available',  icon: Package,     count: availableOrders.length,   countColor: 'bg-brand-500' },
    { id: 'active',    label: 'Active',     icon: Clock,       count: myActiveOrders.length,    countColor: 'bg-violet-500' },
    { id: 'completed', label: 'Earnings',   icon: DollarSign,  count: myCompletedOrders.length, countColor: 'bg-sky-500' },
  ];

  /* ── MAIN PORTAL ── */
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-xs">

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="w-60 bg-white border-r border-stone-100 flex flex-col shadow-[2px_0_12px_-4px_rgba(0,0,0,0.05)] print:hidden shrink-0 hidden md:flex">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-stone-100 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30 animate-glow-pulse shrink-0">
            <Truck size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-stone-900 leading-none truncate">Delivery Portal</p>
            <p className="text-[9px] text-stone-400 mt-0.5 truncate">{session.user.email}</p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all duration-200 cursor-pointer group
                  ${isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}
              >
                {isActive && (
                  <motion.div layoutId="delivery-tab-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
                <span className="flex items-center gap-2.5">
                  <Icon size={15} className={`shrink-0 ${isActive ? 'text-brand-600' : ''}`} />
                  <span className="text-[11px]">{tab.label}</span>
                </span>
                <span className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab.countColor}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-stone-100 space-y-1 shrink-0">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-2.5 px-3 py-2 text-stone-500 hover:bg-stone-50 hover:text-stone-800 rounded-xl font-medium transition-all cursor-pointer">
            <Truck size={14} /><span className="text-[11px]">View Storefront</span>
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl font-medium transition-all cursor-pointer">
            <LogOut size={14} /><span className="text-[11px]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-sm font-black text-stone-800">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          {/* Mobile tab switcher */}
          <div className="flex md:hidden gap-1 bg-stone-100 rounded-xl p-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`relative p-2 rounded-lg transition-all cursor-pointer ${activeTab === tab.id ? 'bg-white shadow-sm text-brand-700' : 'text-stone-400'}`}>
                  <Icon size={15} />
                  {tab.count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-500 ring-1 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Print + Notification bell */}
          <div className="flex items-center gap-2">
            <NotificationBell session={session} size={15} />
            <button onClick={() => window.print()} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-[10px] transition cursor-pointer">
              <Printer size={12} /> Print PDF
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 max-w-3xl mx-auto space-y-4">

            {/* ── Filter toolbar ── */}
            <div className="bg-white rounded-2xl border border-stone-100 p-3 flex flex-wrap items-center gap-2 shadow-sm print:hidden">
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="text-brand-600" />
                <span className="font-black text-stone-600 text-[10px] uppercase tracking-wider">Range:</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {['today','week','month','custom','all'].map(d => (
                  <button key={d} onClick={() => setDatePreset(d)}
                    className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition capitalize cursor-pointer btn-press
                      ${datePreset === d ? 'bg-brand-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <button onClick={() => window.print()} className="ml-auto md:hidden flex items-center gap-1 px-2.5 py-1.5 bg-stone-900 text-white rounded-xl font-bold text-[10px] cursor-pointer">
                <Printer size={11} /> PDF
              </button>
            </div>

            {datePreset === 'custom' && (
              <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                className="bg-white rounded-2xl border border-stone-100 p-3 shadow-sm flex gap-3 print:hidden">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-brand-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-brand-500" />
                </div>
              </motion.div>
            )}

            {/* ── TAB CONTENT ── */}
            <AnimatePresence mode="wait">

              {/* AVAILABLE ORDERS */}
              {activeTab === 'available' && (
                <motion.div key="available" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-stone-900">Available for Pickup</h2>
                    <span className="text-[10px] font-bold text-stone-400">{availableOrders.length} order{availableOrders.length !== 1 ? 's' : ''}</span>
                  </div>

                  {availableOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-stone-100 text-center shadow-sm">
                      <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Package size={20} className="text-stone-400" />
                      </div>
                      <p className="font-bold text-stone-500 text-sm">No orders available right now</p>
                      <p className="text-stone-400 text-[11px] mt-1">Check back in a moment</p>
                    </div>
                  ) : (
                    availableOrders.map((order, idx) => {
                      const cartAmount = Number(order.total_amount || 0);
                      const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                      const earning = (cartAmount * tierPct) / 100;
                      return (
                        <OrderCard key={order.id} order={order} staffProfile={staffProfile}
                          commissionRules={commissionRules} delay={idx * 0.06}>
                          <div className="flex items-center justify-between pt-1">
                            <button onClick={() => setSelectedOrderDetails(order)}
                              className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer">
                              <Eye size={13} /> View {order.order_items?.length || 0} items
                            </button>
                            <button onClick={() => handleUpdateStatus(order.id, 'accepted')}
                              className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black px-5 py-2 rounded-xl text-[11px] shadow-md shadow-brand-500/20 transition btn-press cursor-pointer flex items-center gap-1.5">
                              <Zap size={12} /> Accept Order
                            </button>
                          </div>
                        </OrderCard>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* ACTIVE DELIVERIES */}
              {activeTab === 'active' && (
                <motion.div key="active" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-stone-900">Active Deliveries</h2>
                    <span className="text-[10px] font-bold text-stone-400">{myActiveOrders.length} in progress</span>
                  </div>

                  {myActiveOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-stone-100 text-center shadow-sm">
                      <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Clock size={20} className="text-stone-400" />
                      </div>
                      <p className="font-bold text-stone-500 text-sm">No active deliveries</p>
                      <p className="text-stone-400 text-[11px] mt-1">Accept an order to get started</p>
                    </div>
                  ) : (
                    myActiveOrders.map((order, idx) => (
                      <OrderCard key={order.id} order={order} staffProfile={staffProfile}
                        commissionRules={commissionRules} delay={idx * 0.06}>
                        {/* Customer phone */}
                        {order.phone && (
                          <div className="flex items-center gap-2 text-xs text-stone-600">
                            <Phone size={12} className="text-stone-400" />
                            <span className="font-medium">{order.phone}</span>
                          </div>
                        )}

                        {/* Workflow buttons */}
                        <div className="flex flex-wrap gap-2 pt-1 justify-between items-center">
                          <button onClick={() => setSelectedOrderDetails(order)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-800 transition cursor-pointer">
                            <Eye size={13} /> {order.order_items?.length || 0} items
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {(order.status === 'accepted' || order.status === 'shipped' || order.status === 'processing' || order.status === 'pending') && (
                              <button onClick={() => handleUpdateStatus(order.id, 'pickup')}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-black px-4 py-2 rounded-xl text-[11px] shadow transition btn-press cursor-pointer flex items-center gap-1.5">
                                <MapPin size={12}/> Reached Store
                              </button>
                            )}
                            {order.status === 'pickup' && (
                              <button onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                                className="bg-violet-600 hover:bg-violet-700 text-white font-black px-4 py-2 rounded-xl text-[11px] shadow transition btn-press cursor-pointer flex items-center gap-1.5">
                                <Truck size={12}/> Out for Delivery
                              </button>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <button onClick={() => { setVerifyingOrder(order); setEnteredOtp(''); }}
                                className="bg-gradient-to-r from-brand-600 to-brand-700 text-white font-black px-5 py-2 rounded-xl text-[11px] shadow-md shadow-brand-500/20 transition btn-press cursor-pointer flex items-center gap-1.5">
                                <CheckCircle size={12}/> Enter OTP
                              </button>
                            )}
                          </div>
                        </div>
                      </OrderCard>
                    ))
                  )}
                </motion.div>
              )}

              {/* EARNINGS & HISTORY */}
              {activeTab === 'completed' && (
                <motion.div key="completed" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }} className="space-y-4">
                  <h2 className="text-base font-black text-stone-900">Earnings & History</h2>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={DollarSign} label="Filtered Earnings" value={`₹${totalEarnings.toFixed(0)}`} color="brand" />
                    <StatCard icon={CheckCircle} label="Deliveries Done" value={myCompletedOrders.length} sub="matching filter" color="sky" />
                  </div>

                  {myCompletedOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-stone-100 text-center shadow-sm">
                      <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <TrendingUp size={20} className="text-stone-400" />
                      </div>
                      <p className="font-bold text-stone-500 text-sm">No completed deliveries yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myCompletedOrders.map((order, idx) => {
                        const cartAmount = Number(order.total_amount || 0);
                        const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                        const earnedFee = (cartAmount * tierPct) / 100;
                        return (
                          <motion.div key={order.id}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="bg-white rounded-xl border border-stone-100 p-3.5 flex items-center justify-between shadow-sm card-hover"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                                <CheckCircle size={14} className="text-brand-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono font-black text-stone-900 text-[11px]">#{order.id.slice(0,8)}</p>
                                <p className="text-stone-400 text-[9px] truncate">{order.delivery_address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button onClick={() => setSelectedOrderDetails(order)}
                                className="text-[10px] font-bold text-brand-600 hover:underline cursor-pointer">Items</button>
                              <div className="text-right">
                                <p className="font-black text-brand-600 text-sm">+₹{earnedFee.toFixed(0)}</p>
                                <p className="text-[9px] text-stone-400">{tierPct}% of ₹{cartAmount.toFixed(0)}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── OTP MODAL ── */}
      <AnimatePresence>
        {verifyingOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-stone-900">Verify Customer OTP</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Order #{verifyingOrder.id.slice(0,8)}</p>
                </div>
                <button onClick={() => setVerifyingOrder(null)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="bg-brand-50 rounded-2xl p-3 text-xs text-brand-800 font-medium flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                Ask the customer for the 4-digit code shown on their order screen.
              </div>

              <form onSubmit={handleVerifyAndDeliver} className="space-y-4">
                <input
                  type="text" maxLength="4" required
                  placeholder="• • • •"
                  className="w-full text-center font-mono font-black text-3xl tracking-[0.5em] border-2 border-stone-200 focus:border-brand-500 p-4 rounded-2xl outline-none bg-stone-50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                  value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)}
                />
                <button type="submit"
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-brand-500/25 transition btn-press cursor-pointer flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Verify & Mark Delivered
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ORDER DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-base text-stone-900">Order #{selectedOrderDetails.id.slice(0,8)}</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">{new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrderDetails(null)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-[9px] font-black text-stone-400 uppercase">Delivery Address</p>
                  <p className="text-stone-800 font-medium leading-relaxed">{selectedOrderDetails.delivery_address}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 space-y-0.5">
                  <p className="text-[9px] font-black text-stone-400 uppercase">Phone</p>
                  <p className="text-stone-800 font-medium">{selectedOrderDetails.phone || 'N/A'}</p>
                  {selectedOrderDetails.latitude && (
                    <p className="font-mono text-brand-600 text-[9px]">{selectedOrderDetails.latitude?.toFixed(4)}, {selectedOrderDetails.longitude?.toFixed(4)}</p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider mb-2">
                  Items ({selectedOrderDetails.order_items?.length || 0})
                </p>
                <div className="border border-stone-100 rounded-2xl overflow-hidden divide-y divide-stone-50">
                  {selectedOrderDetails.order_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 text-xs hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        {item.products?.image_url ? (
                          <img src={item.products.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-stone-100" />
                        ) : (
                          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                            <Package size={12} className="text-brand-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-stone-900">{item.products?.name || 'Product'}</p>
                          <p className="text-stone-400">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                <span className="font-bold text-stone-600 text-xs">Total Amount</span>
                <span className="text-xl font-black text-stone-900">₹{selectedOrderDetails.total_amount.toFixed(2)}</span>
              </div>

              <button onClick={() => setSelectedOrderDetails(null)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-2xl text-xs cursor-pointer transition btn-press">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


