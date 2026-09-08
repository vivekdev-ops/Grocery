// src/components/DeliveryPortal.jsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Truck, Package, CheckCircle, Clock, MapPin, Phone, DollarSign, LogOut,
  ShieldCheck, Mail, Lock, Eye, X, Navigation, ExternalLink, Calendar,
  Printer, Filter, TrendingUp, Zap, ChevronRight, AlertCircle, Star, UserCircle, Bike, Loader2, Upload, Receipt, ArrowUpRight, BarChart3, LayoutDashboard, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { registerPushToken, notifyCustomerOrderStatus, notifyAdminDeliveryUpdate } from '../utils/notifications';
import NotificationBell from './NotificationBell';

/* ─────────────────────────────────────────────
   COMMISSION HELPER
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
   STATUS CONFIG
───────────────────────────────────────────── */
const statusStyles = {
  processing:       { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Processing'      },
  accepted:         { bg: 'bg-sky-50',     text: 'text-sky-700',     label: 'Accepted'        },
  pickup:           { bg: 'bg-violet-50',  text: 'text-violet-700',  label: 'At Store'        },
  out_for_delivery: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Out for Delivery'},
  delivered:        { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Delivered'       },
  pending:          { bg: 'bg-stone-50',   text: 'text-stone-600',   label: 'Pending'         },
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function StatCard({ icon: Icon, value, label, color = 'emerald', sub }) {
  const colors = {
    emerald: { bg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white', icon: 'bg-white/20 text-white', val: 'text-white' },
    blue:    { bg: 'bg-gradient-to-br from-sky-600 to-blue-700 text-white',       icon: 'bg-white/20 text-white', val: 'text-white'    },
    purple:  { bg: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',   icon: 'bg-white/20 text-white', val: 'text-purple-50'  },
  };
  const c = colors[color] || colors.emerald;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`${c.bg} rounded-2xl p-4 shadow-md flex items-center justify-between`}
    >
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{label}</p>
        <p className={`text-xl font-black leading-none ${c.val}`}>{value}</p>
        {sub && <p className="text-[9px] opacity-90">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        <Icon size={18} />
      </div>
    </motion.div>
  );
}

function OrderCard({ order, staffProfile, commissionRules, children }) {
  const cartAmount = Number(order.total_amount || 0);
  const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
  const estimatedEarning = (cartAmount * tierPct) / 100;
  const st = statusStyles[order.status] || statusStyles.pending;
  const addressText = order.delivery_address || order.shipping_address || order.address || 'Address not provided';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs hover:shadow-md transition-all overflow-hidden text-xs"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black">
            <Package size={14} />
          </div>
          <div>
            <p className="font-mono font-black text-stone-900 text-xs">#{order.id.slice(0, 8)}</p>
            <p className="text-[10px] text-stone-400 font-medium">{new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${st.bg} ${st.text}`}>
            {st.label}
          </span>
          <div className="text-right">
            <p className="font-black text-stone-900 text-sm">₹{cartAmount.toFixed(0)}</p>
            <p className="text-[10px] text-emerald-600 font-extrabold">+₹{estimatedEarning.toFixed(0)} commission</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 text-stone-700 font-medium">
          <MapPin size={14} className="text-stone-400 mt-0.5 shrink-0" />
          <span className="leading-relaxed line-clamp-2">{addressText}</span>
        </div>

        {order.phone && (
          <div className="flex items-center gap-2 text-stone-600 font-bold">
            <Phone size={13} className="text-stone-400 shrink-0" />
            <a href={`tel:${order.phone}`} className="text-emerald-700 hover:underline">{order.phone}</a>
          </div>
        )}

        {order.latitude && order.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black text-emerald-800 transition shadow-2xs"
          >
            <Navigation size={13} /> Open in Google Maps <ExternalLink size={11} />
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
  const [session, setSession] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [commissionRules, setCommissionRules] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [email, setEmail] = useState('');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setStaffProfile(null);
    navigate('/login', { replace: true });
  };

  const fetchStaffProfileAndDependencies = async (user) => {
  setLoading(true);
  try {
    // 1. Block if user has a shopkeeper profile
    const { data: shopkeeperCheck } = await supabase
      .from('shopkeeper_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (shopkeeperCheck) {
      alert("Access Denied: Shopkeepers cannot access the Delivery Partner portal.");
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      setStaffProfile(null);
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    // 2. Fetch staff profile data
    let staffRes = await supabase
      .from('staff_profiles')
      .select('id, user_id, email, role, custom_commission_pct, name, full_name, phone, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!staffRes.data && user.email) {
      staffRes = await supabase
        .from('staff_profiles')
        .select('id, user_id, email, role, custom_commission_pct, name, full_name, phone, avatar_url')
        .eq('email', user.email)
        .maybeSingle();
    }

    // 3. Strict Role Verification: Ensure role is delivery-related
    const userRole = (staffRes.data?.role || '').toLowerCase();
    const allowedRoles = ['delivery', 'delivery_partner', 'rider', 'delivery boy'];
    
    if (staffRes.data && userRole && !allowedRoles.some(r => userRole.includes(r))) {
      alert("Access Denied: This portal is strictly restricted to Delivery Partners.");
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      setStaffProfile(null);
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    const rulesRes = await supabase.from('cart_commission_rules').select('*').eq('is_active', true);

    if (staffRes.data) {
      setStaffProfile(staffRes.data);
      setProfileForm({
        full_name: staffRes.data.full_name || staffRes.data.name || '',
        phone: staffRes.data.phone || '',
        avatar_url: staffRes.data.avatar_url || ''
      });
    }
    if (rulesRes.data) setCommissionRules(rulesRes.data);
    
    registerPushToken(user.id, 'delivery');
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
    const idList = staffId ? `${userId},${staffId}` : userId;

    const { data: availData } = await supabase
      .from('orders').select('*, order_items(*, products(name, image_url))')
      .in('status', ['processing', 'pending', 'placed'])
      .is('delivery_agent_id', null)
      .is('delivery_partner_id', null);

    const { data: activeData } = await supabase
      .from('orders').select('*, order_items(*, products(name, image_url))')
      .not('status', 'in', '("delivered","cancelled")')
      .or(`delivery_agent_id.in.(${idList}),delivery_partner_id.eq.${userId}`);

    const { data: completedData } = await supabase
      .from('orders').select('*, order_items(*, products(name, image_url))')
      .eq('status', 'delivered')
      .or(`delivery_agent_id.in.(${idList}),delivery_partner_id.eq.${userId}`);

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

    const agentName = staffProfile?.full_name || staffProfile?.name || session?.user?.email || 'Rider';
    notifyCustomerOrderStatus(verifyingOrder, 'delivered');
    notifyAdminDeliveryUpdate(verifyingOrder, 'delivered', agentName);

    alert('Order delivered and verified!');
    setVerifyingOrder(null);
    setEnteredOtp('');
    fetchDeliveryOrders();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    try {
      setUploadingAvatar(true);
      const ext = file.name.split('.').pop();
      const path = `avatars/agent-${session.user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileForm(p => ({ ...p, avatar_url: reader.result }));
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setProfileForm(p => ({ ...p, avatar_url: urlData?.publicUrl || '' }));
    } catch {
      alert('Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    try {
      setSavingProfile(true);
      const payload = {
        user_id: session.user.id,
        email: session.user.email,
        full_name: profileForm.full_name,
        name: profileForm.full_name,
        phone: profileForm.phone,
        avatar_url: profileForm.avatar_url,
        role: staffProfile?.role || 'delivery'
      };
      const { data, error } = await supabase.from('staff_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      setStaffProfile(data);
      setEditingProfile(false);
      alert('Profile updated!');
    } catch (err) {
      alert('Save error: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const availableOrders   = orders.filter(o => (o.status === 'processing' || o.status === 'pending' || o.status === 'placed') && !o.delivery_agent_id && !o.delivery_partner_id);
  const myActiveOrders    = orders.filter(o => (o.delivery_agent_id || o.delivery_partner_id) && o.status !== 'delivered' && o.status !== 'cancelled');
  const myCompletedOrders = orders.filter(o => (o.delivery_agent_id || o.delivery_partner_id) && o.status === 'delivered');

  const filteredCompletedOrders = useMemo(() => {
    if (datePreset === 'all') return myCompletedOrders;
    const now = new Date();
    return myCompletedOrders.filter(order => {
      const orderDate = new Date(order.created_at || order.delivered_at);
      if (datePreset === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (datePreset === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      } else if (datePreset === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      } else if (datePreset === 'custom') {
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  }, [myCompletedOrders, datePreset, startDate, endDate]);

  const filteredEarnings = filteredCompletedOrders.reduce((sum, order) => {
    const amt = Number(order.total_amount || 0);
    return sum + (amt * getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', amt)) / 100;
  }, 0);

  const totalLifetimeEarnings = myCompletedOrders.reduce((sum, order) => {
    const amt = Number(order.total_amount || 0);
    return sum + (amt * getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', amt)) / 100;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 text-xs">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Truck size={22} className="animate-bounce" />
          </div>
          <p className="font-bold text-stone-500">Loading KD Store Portal...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-xs">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl border border-stone-200/80 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20 font-black text-lg">
              KD
            </div>
            <h1 className="font-black text-stone-900 text-base">KD Store Delivery Partner</h1>
            <p className="text-stone-400 text-[11px]">Sign in with your agent credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block font-bold text-stone-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@kdstore.com"
                  className="w-full bg-stone-50 border border-stone-200 pl-10 pr-3 py-2.5 rounded-xl font-bold outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-stone-600 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-stone-50 border border-stone-200 pl-10 pr-10 py-2.5 rounded-xl font-bold outline-none focus:border-emerald-500" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer">
                  <Eye size={14} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition">
              {loggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button onClick={() => navigate('/')} className="text-emerald-600 font-bold hover:underline cursor-pointer">
              ← Return to KD Store
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'available', label: 'Available', icon: Package, count: availableOrders.length },
    { id: 'active',    label: 'Active',    icon: Clock,   count: myActiveOrders.length },
    { id: 'payouts',   label: 'Payouts',   icon: Receipt, count: myCompletedOrders.length },
    { id: 'profile',   label: 'Profile',   icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-24 md:pb-8 text-xs selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-600/30 shrink-0">
            KD
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-stone-900 text-sm">KD Store</span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase">Partner Portal</span>
            </div>
            <p className="text-[11px] text-stone-500 font-bold">{staffProfile?.full_name || staffProfile?.name || session.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell session={session} size={18} />
          <button onClick={() => window.print()} className="hidden sm:flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3 py-2 rounded-xl font-bold cursor-pointer transition shadow-2xs">
            <Printer size={13} /> Print
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-xl font-bold cursor-pointer transition border border-rose-200 shadow-2xs" title="Sign Out">
            <LogOut size={13} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── PRINTABLE PROFESSIONAL SALARY SLIP (Hidden on normal screen, shown during window.print()) ── */}
      <div className="hidden print:block p-8 bg-white text-stone-900 font-sans text-sm space-y-6">
        <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">KD</div>
              <h1 className="text-xl font-black text-stone-900 tracking-tight">KD Store Delivery & Logistics</h1>
            </div>
            <p className="text-stone-500 text-xs mt-1">Official Delivery Partner Salary & Payout Statement</p>
          </div>
          <div className="text-right">
            <p className="font-black text-stone-900">Statement Date: {new Date().toLocaleDateString('en-IN')}</p>
            <p className="text-stone-500 text-xs capitalize">Filter: {datePreset} period</p>
          </div>
        </div>

        {/* Delivery Partner Details */}
        <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase">1. Delivery Partner Name</p>
            <p className="font-black text-stone-900 text-base">{staffProfile?.full_name || staffProfile?.name || 'Agent'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase">2. Contact Number</p>
            <p className="font-black text-stone-900 text-base">{staffProfile?.phone || session.user.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase">3. Period / Date Range</p>
            <p className="font-bold text-stone-800 capitalize">Preset: {datePreset} {startDate && endDate ? `(${startDate} to ${endDate})` : ''}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase">Total Deliveries in Period</p>
            <p className="font-bold text-stone-800">{filteredCompletedOrders.length} completed orders</p>
          </div>
        </div>

        {/* 4. Order Line items, cart total and payout % */}
        <div>
          <h3 className="font-black text-stone-900 text-sm mb-2">4. Order Line Items & Payout Summary</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-600 text-white text-left">
                <th className="p-2 border border-emerald-700">Order ID</th>
                <th className="p-2 border border-emerald-700">Delivery Address</th>
                <th className="p-2 border border-emerald-700 text-right">Cart Total</th>
                <th className="p-2 border border-emerald-700 text-right">Payout %</th>
                <th className="p-2 border border-emerald-700 text-right">Earned Payout</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompletedOrders.map(order => {
                const cartAmount = Number(order.total_amount || 0);
                const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                const earnedFee = (cartAmount * tierPct) / 100;
                return (
                  <tr key={order.id} className="border-b border-stone-200">
                    <td className="p-2 border border-stone-200 font-mono font-bold">#{order.id.slice(0, 8)}</td>
                    <td className="p-2 border border-stone-200 truncate max-w-[220px]">{order.delivery_address || order.shipping_address || order.address}</td>
                    <td className="p-2 border border-stone-200 text-right">₹{cartAmount.toFixed(2)}</td>
                    <td className="p-2 border border-stone-200 text-right">{tierPct}%</td>
                    <td className="p-2 border border-stone-200 text-right font-black text-emerald-700">₹{earnedFee.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Grand Total */}
        <div className="flex justify-end pt-2">
          <div className="w-72 bg-emerald-50 border-2 border-emerald-600 p-4 rounded-2xl flex justify-between items-center">
            <span className="font-black text-stone-900 text-sm">5. Grand Total Payout:</span>
            <span className="font-black text-emerald-700 text-lg">₹{filteredEarnings.toFixed(2)}</span>
          </div>
        </div>

        {/* 6. KD Store Sign */}
        <div className="pt-12 flex justify-between items-end border-t border-stone-200">
          <div>
            <p className="text-xs text-stone-500 font-medium">This is a computer-generated salary slip and requires no physical signature.</p>
            <p className="text-xs font-bold text-stone-800 mt-1">KD Store Logistics Department</p>
          </div>
          <div className="text-center space-y-2">
            <div className="h-12 border-b border-dashed border-stone-400 w-48 mx-auto flex items-center justify-center">
              <span className="font-serif italic font-bold text-emerald-800 text-sm">KD Store Auth. Sign</span>
            </div>
            <p className="font-black text-stone-800 text-xs">6. Authorized Signatory</p>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4 print:hidden">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-stone-200 p-1.5 flex gap-1 shadow-2xs overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black transition cursor-pointer ${
                  isActive ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon size={14} />
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${isActive ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 0: DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-5 text-white shadow-lg space-y-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">KD Store Delivery Earnings</p>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">₹{totalLifetimeEarnings.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-400 border border-white/20">
                  <Zap size={22} className="fill-amber-400" />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-stone-400 font-medium">Completed: </span>
                  <span className="font-bold text-emerald-300">{myCompletedOrders.length} orders</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Active Deliveries: </span>
                  <span className="font-bold text-sky-300">{myActiveOrders.length} orders</span>
                </div>
              </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={Package} value={availableOrders.length} label="Available Pickups" color="emerald" sub="Ready to accept" />
              <StatCard icon={Clock} value={myActiveOrders.length} label="In Progress" color="blue" sub="Assigned to you" />
              <StatCard icon={CheckCircle} value={myCompletedOrders.length} label="Delivered" color="purple" sub="Successfully completed" />
            </div>

            {/* Recent Active Orders Quick View */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-black text-stone-900 text-sm">Active Queue Quick Preview</h3>
                <button onClick={() => setActiveTab('active')} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                  View All →
                </button>
              </div>

              {myActiveOrders.length === 0 ? (
                <p className="text-stone-400 text-center py-6 font-medium">No active deliveries right now. Check Available tab to accept orders.</p>
              ) : (
                <div className="space-y-2">
                  {myActiveOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      <div>
                        <p className="font-mono font-black text-stone-900">#{order.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-stone-500 truncate max-w-[200px]">{order.delivery_address || order.shipping_address || order.address}</p>
                      </div>
                      <button onClick={() => setActiveTab('active')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer text-[10px]">
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB 1: AVAILABLE ── */}
        {activeTab === 'available' && (
          <div className="space-y-3">
            <h2 className="font-black text-stone-900 text-sm">Available Pickups ({availableOrders.length})</h2>
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center text-stone-400 font-bold shadow-2xs">
                No orders waiting for pickup
              </div>
            ) : (
              availableOrders.map(order => (
                <OrderCard key={order.id} order={order} staffProfile={staffProfile} commissionRules={commissionRules}>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                    <button onClick={() => setSelectedOrderDetails(order)}
                      className="text-emerald-700 font-black inline-flex items-center gap-1 cursor-pointer">
                      <Eye size={13} /> View Full Details ({order.order_items?.length || 0})
                    </button>
                    <button onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black cursor-pointer shadow-md shadow-emerald-600/25 active:scale-95 transition">
                      Accept Order
                    </button>
                  </div>
                </OrderCard>
              ))
            )}
          </div>
        )}

        {/* ── TAB 2: ACTIVE ── */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            <h2 className="font-black text-stone-900 text-sm">Active Deliveries ({myActiveOrders.length})</h2>
            {myActiveOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center text-stone-400 font-bold shadow-2xs">
                No active deliveries in progress
              </div>
            ) : (
              myActiveOrders.map(order => (
                <OrderCard key={order.id} order={order} staffProfile={staffProfile} commissionRules={commissionRules}>
                  <div className="flex flex-wrap justify-between items-center pt-2 border-t border-stone-100 gap-2">
                    <button onClick={() => setSelectedOrderDetails(order)}
                      className="text-emerald-700 font-black inline-flex items-center gap-1 cursor-pointer">
                      <Eye size={13} /> Full Details ({order.order_items?.length || 0} items)
                    </button>

                    <div className="flex gap-1.5 flex-wrap">
                      {(order.status === 'accepted' || order.status === 'shipped' || order.status === 'processing' || order.status === 'pending') && (
                        <button onClick={() => handleUpdateStatus(order.id, 'pickup')}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl font-black cursor-pointer shadow-xs">
                          Reached Store
                        </button>
                      )}
                      {order.status === 'pickup' && (
                        <button onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                          className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl font-black cursor-pointer shadow-xs">
                          Dispatched
                        </button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <button onClick={() => { setVerifyingOrder(order); setEnteredOtp(''); }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black cursor-pointer shadow-md shadow-emerald-600/20">
                          Enter OTP
                        </button>
                      )}
                    </div>
                  </div>
                </OrderCard>
              ))
            )}
          </div>
        )}

        {/* ── TAB 3: PAYOUTS & SALARY SLIP ── */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-1 rounded-full">KD Store Payout Portal</span>
                <span className="font-mono text-xs opacity-90">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div>
                <p className="text-2xl font-black mt-1">₹{filteredEarnings.toFixed(2)}</p>
                <p className="text-[11px] opacity-90">Calculated earnings for selected filter range</p>
              </div>
            </div>

            {/* Working Filter Controls */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <Filter size={14} className="text-emerald-600" />
                  <span>Filter Payout Statement</span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <FileText size={14} /> Download PDF Salary Slip
                </button>
              </div>

              <div className="flex gap-1.5 flex-wrap pt-1">
                {['today', 'week', 'month', 'custom', 'all'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDatePreset(d)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition cursor-pointer ${
                      datePreset === d ? 'bg-stone-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">From Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">To Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Payout breakdown table */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
              <h3 className="font-black text-stone-900 text-sm">Statement Breakdown ({filteredCompletedOrders.length} Deliveries)</h3>

              {filteredCompletedOrders.length === 0 ? (
                <div className="p-8 text-center text-stone-400 font-medium">No completed deliveries found for this period.</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-none pr-1">
                  {filteredCompletedOrders.map(order => {
                    const cartAmount = Number(order.total_amount || 0);
                    const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                    const earnedFee = (cartAmount * tierPct) / 100;
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100">
                        <div>
                          <p className="font-mono font-black text-stone-900">#{order.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-stone-400">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-700">+₹{earnedFee.toFixed(2)}</p>
                          <p className="text-[9px] text-stone-400 font-bold">Order Value: ₹{cartAmount.toFixed(0)} ({tierPct}%)</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: PROFILE SETTINGS ── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-2xs space-y-4 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-black text-stone-900 text-sm">Agent Profile</h2>
              {!editingProfile && (
                <button onClick={() => setEditingProfile(true)} className="bg-purple-50 text-purple-700 px-3.5 py-1.5 rounded-xl font-black cursor-pointer text-xs">
                  Edit Profile
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden border border-stone-200 shadow-2xs">
                    {profileForm.avatar_url ? (
                      <img src={profileForm.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-full h-full text-stone-400" />
                    )}
                  </div>
                  <label className="bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 rounded-xl font-bold cursor-pointer text-xs shadow-2xs">
                    <Upload size={12} className="inline mr-1.5" /> {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-stone-600 mb-1">Full Name</label>
                  <input type="text" value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 bg-stone-50 font-bold" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Phone Number</label>
                  <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 bg-stone-50 font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Email</label>
                  <input type="email" value={session.user.email} disabled className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 bg-stone-100 text-stone-500 cursor-not-allowed font-medium" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 border rounded-xl font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={savingProfile} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-black cursor-pointer shadow-md shadow-purple-600/20">Save</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden border border-stone-200 shadow-2xs">
                    {staffProfile?.avatar_url ? (
                      <img src={staffProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-full h-full text-stone-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-base">{staffProfile?.full_name || staffProfile?.name || 'Agent'}</p>
                    <p className="text-stone-400 text-xs font-medium">{session.user.email}</p>
                  </div>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-1">
                  <p className="text-stone-400 text-[10px] font-black uppercase">Registered Phone</p>
                  <p className="font-bold text-stone-800">{staffProfile?.phone || 'Not provided'}</p>
                </div>

                <button onClick={handleLogout} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-3 rounded-2xl cursor-pointer transition flex items-center justify-center gap-2">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── OTP MODAL ── */}
      <AnimatePresence>
        {verifyingOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 text-xs">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-stone-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-stone-900 text-sm">Verify Customer OTP</h3>
                  <p className="text-stone-400 text-[10px]">Order #{verifyingOrder.id.slice(0, 8)}</p>
                </div>
                <button onClick={() => setVerifyingOrder(null)} className="p-2 rounded-xl bg-stone-100 text-stone-500 cursor-pointer"><X size={15} /></button>
              </div>
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-2xl font-bold flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0" /> Ask customer for the 4-digit code.
              </div>
              <form onSubmit={handleVerifyAndDeliver} className="space-y-3">
                <input type="text" maxLength="4" required placeholder="• • • •"
                  className="w-full text-center font-mono font-black text-3xl tracking-[0.5em] border-2 border-stone-200 p-3.5 rounded-2xl bg-stone-50 outline-none focus:border-emerald-500"
                  value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)} />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-md cursor-pointer transition">
                  Confirm & Complete Delivery
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 text-xs">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border border-stone-100">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-stone-900 text-sm">KD Store Order #{selectedOrderDetails.id.slice(0, 8)}</h3>
                  <p className="text-stone-400 text-[10px]">{new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrderDetails(null)} className="p-2 rounded-xl bg-stone-100 text-stone-500 cursor-pointer"><X size={15} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-50 p-3 rounded-2xl col-span-2 space-y-0.5 border border-stone-100">
                  <p className="text-[9px] font-black uppercase text-stone-400">Delivery Address</p>
                  <p className="font-medium text-stone-800 leading-relaxed">{selectedOrderDetails.delivery_address || selectedOrderDetails.shipping_address || selectedOrderDetails.address}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl space-y-0.5 border border-stone-100">
                  <p className="text-[9px] font-black uppercase text-stone-400">Customer Phone</p>
                  <p className="font-bold text-stone-800">{selectedOrderDetails.phone || 'N/A'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl space-y-0.5 border border-stone-100">
                  <p className="text-[9px] font-black uppercase text-stone-400">Customer Email</p>
                  <p className="font-medium text-stone-800 truncate">{selectedOrderDetails.customer_email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-stone-400 mb-2">Order Items ({selectedOrderDetails.order_items?.length || 0})</p>
                <div className="border border-stone-100 rounded-2xl overflow-hidden divide-y divide-stone-50">
                  {selectedOrderDetails.order_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white">
                      <div className="flex items-center gap-2.5">
                        {item.products?.image_url ? (
                          <img src={item.products.image_url} alt="" className="w-9 h-9 rounded-xl object-cover bg-stone-50 border border-stone-100 p-0.5" />
                        ) : (
                          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Package size={14} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-stone-900">{item.products?.name || 'Product'}</p>
                          <p className="text-stone-400">Qty: {item.quantity} × ₹{item.price}</p>
                        </div>
                      </div>
                      <span className="font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-stone-50 p-3.5 rounded-2xl space-y-1.5 border border-stone-100">
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Fee</span>
                  <span className="font-bold">₹{Number(selectedOrderDetails.delivery_fee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Handling Charge</span>
                  <span className="font-bold">₹{Number(selectedOrderDetails.handling_charge || 5).toFixed(2)}</span>
                </div>
                {Number(selectedOrderDetails.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-bold">−₹{Number(selectedOrderDetails.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-stone-200 font-black text-sm">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₹{Number(selectedOrderDetails.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {selectedOrderDetails.remark && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-900 text-[11px]">
                  <span className="font-black uppercase block text-[9px] mb-0.5">Admin Remark / Instructions</span>
                  {selectedOrderDetails.remark}
                </div>
              )}

              <button onClick={() => setSelectedOrderDetails(null)} className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-2xl cursor-pointer transition">
                Close Details
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}