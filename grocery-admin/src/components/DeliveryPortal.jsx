// src/components/DeliveryPortal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Package, CheckCircle, Clock, MapPin, Phone, DollarSign, LogOut, ShieldCheck, Mail, Lock, Eye, X, Navigation, ExternalLink, Calendar, Printer, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getApplicableCommissionPct = (profile, rules, roleType, cartAmount) => {
  if (profile?.custom_commission_pct !== null && profile?.custom_commission_pct !== undefined && profile?.custom_commission_pct !== '') {
    return Number(profile.custom_commission_pct);
  }

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return 1; // Default fallback for delivery commission
  }

  const targetRole = typeof roleType === 'string' ? roleType.toLowerCase() : 'delivery';
  const roleRules = rules.filter(r => r.role_type?.toLowerCase() === targetRole && r.is_active);

  const matchedRule = roleRules.find(r => {
    const min = Number(r.min_cart_value || 0);
    const max = r.max_cart_value !== null && r.max_cart_value !== undefined && r.max_cart_value !== '' 
      ? Number(r.max_cart_value) 
      : Infinity;
    return cartAmount >= min && cartAmount <= max;
  });

  if (matchedRule) {
    return Number(matchedRule.commission_pct);
  }

  return 1;
};

export default function DeliveryPortal() {
  const [session, setSession] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [commissionRules, setCommissionRules] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  // Date Range & Period Filter State for Delivery Dashboard & Earnings
  const [datePreset, setDatePreset] = useState('all'); // 'today', 'week', 'month', 'custom', 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchStaffProfileAndDependencies(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchStaffProfileAndDependencies(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch delivery orders when filters change
  useEffect(() => {
    if (session) {
      fetchDeliveryOrders(session, staffProfile);
    }
  }, [datePreset, startDate, endDate]);

  const fetchStaffProfileAndDependencies = async (user) => {
    try {
      const [staffRes, rulesRes] = await Promise.all([
        supabase.from('staff_profiles').select('id, user_id, email, role, custom_commission_pct').or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle(),
        supabase.from('cart_commission_rules').select('*').eq('is_active', true)
      ]);

      if (staffRes.data) {
        setStaffProfile(staffRes.data);
      }
      if (rulesRes.data) {
        setCommissionRules(rulesRes.data);
      }

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

    const userEmail = activeSession.user.email;
    const userId = activeSession.user.id;
    const staffId = currentStaff?.id || staffProfile?.id;

    // Build base query for assigned / completed orders with date filters
    let baseQuery = supabase.from('orders').select('*, order_items(*, products(name, image_url))');

    const now = new Date();
    if (datePreset === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      baseQuery = baseQuery.gte('created_at', startOfDay);
    } else if (datePreset === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
      baseQuery = baseQuery.gte('created_at', startOfWeek);
    } else if (datePreset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      baseQuery = baseQuery.gte('created_at', startOfMonth);
    } else if (datePreset === 'custom') {
      if (startDate) baseQuery = baseQuery.gte('created_at', new Date(startDate).toISOString());
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        baseQuery = baseQuery.lte('created_at', endDateTime.toISOString());
      }
    }

    // 1. Fetch available orders (unassigned & processing)
    const { data: availData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('status', 'processing')
      .is('delivery_agent_id', null);

    // 2. Fetch orders assigned to ME
    let activeQuery = supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .neq('status', 'delivered');

    if (staffId) {
      activeQuery = activeQuery.or(`delivery_agent_id.eq.${userId},delivery_agent_id.eq.${staffId}`);
    } else {
      activeQuery = activeQuery.eq('delivery_agent_id', userId);
    }

    const { data: activeData } = await activeQuery;

    // 3. Fetch completed orders by ME (respecting date filter)
    let completedQuery = baseQuery.eq('status', 'delivered');

    if (staffId) {
      completedQuery = completedQuery.or(`delivery_agent_id.eq.${userId},delivery_agent_id.eq.${staffId}`);
    } else {
      completedQuery = completedQuery.eq('delivery_agent_id', userId);
    }

    const { data: completedData } = await completedQuery;

    const allFetched = [...(availData || []), ...(activeData || []), ...(completedData || [])];
    const uniqueOrders = Array.from(new Map(allFetched.map(item => [item.id, item])).values());
    
    setOrders(uniqueOrders);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Login failed: " + error.message);
    } else if (data.session) {
      setSession(data.session);
      await fetchStaffProfileAndDependencies(data.session.user);
    }
    setLoggingIn(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const updatePayload = { status: newStatus };
    
    if (newStatus === 'accepted' && session) {
      updatePayload.delivery_agent_id = staffProfile ? staffProfile.id : session.user.id;
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (!error) {
      fetchDeliveryOrders();
      setSelectedOrderDetails(null);
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleVerifyAndDeliver = async (e) => {
    e.preventDefault();
    if (!verifyingOrder) return;

    if (enteredOtp.trim() !== verifyingOrder.otp) {
      alert("Incorrect OTP provided by customer. Please check and try again.");
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', verifyingOrder.id);

    if (!error) {
      alert("Order successfully delivered and verified!");
      setVerifyingOrder(null);
      setEnteredOtp('');
      fetchDeliveryOrders();
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  const availableOrders = orders.filter(o => o.status === 'processing' && !o.delivery_agent_id);
  
  const myActiveOrders = orders.filter(o => 
    o.delivery_agent_id && o.status !== 'delivered'
  );

  const myCompletedOrders = orders.filter(o => 
    o.delivery_agent_id && o.status === 'delivered'
  );

  const totalEarnings = myCompletedOrders.reduce((sum, order) => {
    const cartAmount = Number(order.total_amount || 0);
    const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
    return sum + ((cartAmount * tierPct) / 100);
  }, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading delivery portal...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-stone-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Truck size={28} />
            </div>
            <h1 className="text-2xl font-black text-stone-900">Delivery Partner Login</h1>
            <p className="text-xs text-stone-500">Sign in with your agent credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="email" required 
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500"
                  placeholder="boy@yopmail.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="password" required 
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <ShieldCheck size={18} />
              {loggingIn ? 'Signing In...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button onClick={() => navigate('/')} className="text-xs font-bold text-emerald-600 hover:underline">
              ← Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans text-xs">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-sm print:hidden">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-sm font-black text-emerald-600 flex items-center gap-2 truncate"><Truck size={18}/> Delivery Portal</h1>
          <p className="text-[10px] text-stone-400 truncate mt-0.5">{session.user.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <button onClick={() => setActiveTab('available')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${activeTab === 'available' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><Package size={16} /> Available Orders</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">{availableOrders.length}</span>
          </button>
          <button onClick={() => setActiveTab('active')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${activeTab === 'active' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><Clock size={16} /> Active Deliveries</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-black">{myActiveOrders.length}</span>
          </button>
          <button onClick={() => setActiveTab('completed')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${activeTab === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><CheckCircle size={16} /> Earnings & History</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">{myCompletedOrders.length}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-700 hover:bg-stone-100 rounded-xl font-medium transition text-xs cursor-pointer">
            <Truck size={14} /> View Storefront
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition text-xs cursor-pointer">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto">
        
        {/* Global Filter & Statement Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-stone-200 shadow-xs mb-6 flex-wrap gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-emerald-700" />
            <span className="font-bold text-stone-700">Filter Range:</span>
            <div className="flex gap-1 flex-wrap">
              {['today', 'week', 'month', 'custom', 'all'].map(d => (
                <button 
                  key={d} 
                  onClick={() => setDatePreset(d)} 
                  className={`px-3 py-1 rounded-xl font-bold transition capitalize cursor-pointer ${datePreset === d ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Printer size={14} /> Print Earnings PDF
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs mb-6 flex gap-4 items-center print:hidden">
            <div className="flex-1">
              <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">From Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-stone-50 border p-2.5 rounded-xl text-xs font-bold outline-none" />
            </div>
            <div className="flex-1">
              <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">To Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-stone-50 border p-2.5 rounded-xl text-xs font-bold outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'available' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-stone-900">Available Orders for Pickup</h2>
            {availableOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-stone-500 font-medium shadow-sm">No new orders available.</div>
            ) : (
              <div className="space-y-4">
                {availableOrders.map(order => {
                  const cartAmount = Number(order.total_amount || 0);
                  const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                  const estimatedEarning = (cartAmount * tierPct) / 100;

                  return (
                    <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                        <div>
                          <span className="font-mono font-bold text-stone-900 text-sm">Order #{order.id.slice(0, 8)}</span>
                          <span className="ml-3 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">Tier Rate: {tierPct}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-stone-900">₹{order.total_amount.toFixed(2)}</span>
                          <span className="block text-[10px] text-emerald-600 font-bold">Est. Earnings: ₹{estimatedEarning.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-stone-700 font-medium">Address: {order.delivery_address}</p>
                      
                      {order.latitude && order.longitude && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-mono">📍 GPS Location Available</span>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Navigation size={12} /> Open Maps
                          </a>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer">
                          <Eye size={14} /> View Order Items ({order.order_items?.length || 0})
                        </button>
                        <button onClick={() => handleUpdateStatus(order.id, 'accepted')} className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-2xl text-xs hover:bg-emerald-700 transition cursor-pointer">Accept Order</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-stone-900">Active Deliveries Workflow</h2>
            {myActiveOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-stone-500 font-medium shadow-sm">No orders in progress or assigned to you yet.</div>
            ) : (
              <div className="space-y-4">
                {myActiveOrders.map(order => {
                  const cartAmount = Number(order.total_amount || 0);
                  const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                  const estimatedEarning = (cartAmount * tierPct) / 100;

                  return (
                    <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                        <div>
                          <span className="font-mono font-bold text-stone-900 text-sm">Order #{order.id.slice(0, 8)}</span>
                          <span className="ml-3 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">Tier: {tierPct}% (₹{estimatedEarning.toFixed(2)})</span>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          Status: {order.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-bold text-stone-400 uppercase">Delivery Address</span>
                          <p className="text-stone-800 font-medium mt-0.5">{order.delivery_address}</p>
                        </div>
                        <div>
                          <span className="font-bold text-stone-400 uppercase">Customer Phone</span>
                          <p className="text-stone-800 font-medium mt-0.5">{order.phone || 'N/A'}</p>
                        </div>
                      </div>

                      {order.latitude && order.longitude && (
                        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs shadow-2xs">
                          <div>
                            <span className="font-black text-emerald-900 block">Customer GPS Coordinates</span>
                            <span className="font-mono text-emerald-700">{order.latitude}, {order.longitude}</span>
                          </div>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Navigation size={14} /> Open Google Maps <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer">
                          <Eye size={14} /> View Order Items ({order.order_items?.length || 0})
                        </button>

                        <div className="flex flex-wrap gap-2 justify-end items-center">
                          {(order.status === 'accepted' || order.status === 'shipped' || order.status === 'processing' || order.status === 'pending') && (
                            <button onClick={() => handleUpdateStatus(order.id, 'pickup')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition cursor-pointer">
                              Reached Store / Pickup
                            </button>
                          )}

                          {order.status === 'pickup' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition cursor-pointer">
                              Out for Delivery
                            </button>
                          )}

                          {order.status === 'out_for_delivery' && (
                            <button onClick={() => { setVerifyingOrder(order); setEnteredOtp(''); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5 cursor-pointer">
                              <CheckCircle size={14}/> Enter OTP & Complete Delivery
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-stone-900">Earnings & History</h2>
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase">Filtered Tier Earnings</span>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{totalEarnings.toFixed(2)}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{myCompletedOrders.length} completed orders matching filter</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold shadow-inner">
                <DollarSign size={28} />
              </div>
            </div>

            <div className="space-y-3">
              {myCompletedOrders.map(order => {
                const cartAmount = Number(order.total_amount || 0);
                const tierPct = getApplicableCommissionPct(staffProfile, commissionRules, 'delivery', cartAmount);
                const earnedFee = (cartAmount * tierPct) / 100;

                return (
                  <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-sm flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900">Order #{order.id.slice(0, 8)}</span>
                      <p className="text-stone-500 mt-0.5">{order.delivery_address}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">Items</button>
                      <div>
                        <span className="font-black text-emerald-600 block text-sm">+₹{earnedFee.toFixed(2)} <span className="text-[10px] text-stone-400">({tierPct}%)</span></span>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Delivered</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* OTP Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-stone-900">Verify Customer OTP</h3>
              <button onClick={() => setVerifyingOrder(null)} className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"><X size={16}/></button>
            </div>

            <p className="text-xs text-stone-600 font-medium">
              Please ask the customer for the 4-digit verification code sent to their order screen for Order <span className="font-mono font-bold">#{verifyingOrder.id.slice(0, 8)}</span>.
            </p>

            <form onSubmit={handleVerifyAndDeliver} className="space-y-4">
              <input 
                type="text" maxLength="4" required 
                placeholder="Enter 4-digit OTP" 
                className="w-full text-center font-mono font-black text-2xl tracking-widest border-2 border-stone-200 p-3 rounded-2xl outline-none focus:border-emerald-600 bg-stone-50"
                value={enteredOtp} 
                onChange={e => setEnteredOtp(e.target.value)}
              />

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs shadow-lg transition active:scale-95 cursor-pointer"
              >
                Verify & Mark Delivered
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-stone-900">Order #{selectedOrderDetails.id.slice(0, 8)}</h3>
                <p className="text-xs text-stone-400">{new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-2 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"><X size={18}/></button>
            </div>

            <div className="space-y-3 text-xs bg-stone-50 p-4 rounded-2xl border">
              <div>
                <span className="font-bold text-stone-400 uppercase">Delivery Address</span>
                <p className="text-stone-900 font-medium mt-0.5">{selectedOrderDetails.delivery_address}</p>
              </div>
              <div>
                <span className="font-bold text-stone-400 uppercase">Customer Phone</span>
                <p className="text-stone-900 font-medium mt-0.5">{selectedOrderDetails.phone || 'N/A'}</p>
              </div>
              {selectedOrderDetails.latitude && selectedOrderDetails.longitude && (
                <div>
                  <span className="font-bold text-stone-400 uppercase">GPS Coordinates</span>
                  <p className="font-mono text-emerald-700 mt-0.5">{selectedOrderDetails.latitude}, {selectedOrderDetails.longitude}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider mb-2">Items Included ({selectedOrderDetails.order_items?.length || 0})</h4>
              <div className="divide-y border rounded-2xl overflow-hidden bg-white">
                {selectedOrderDetails.order_items?.map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">{item.products?.name || 'Product'}</span>
                      <span className="text-stone-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                    </div>
                    <span className="font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center font-bold text-sm">
              <span className="text-stone-600">Total Order Amount:</span>
              <span className="text-lg font-black text-stone-900">₹{selectedOrderDetails.total_amount.toFixed(2)}</span>
            </div>

            <button onClick={() => setSelectedOrderDetails(null)} className="w-full bg-stone-900 text-white font-bold py-3 rounded-2xl text-xs cursor-pointer">
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}