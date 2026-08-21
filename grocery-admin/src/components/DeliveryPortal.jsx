// src/components/DeliveryPortal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Package, CheckCircle, Clock, MapPin, Phone, DollarSign, LogOut, ShieldCheck, Mail, Lock, Eye, X, Navigation, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryPortal() {
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

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
      if (session) fetchDeliveryOrders(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDeliveryOrders(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => fetchDeliveryOrders(session), 5000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchDeliveryOrders = async (currentSession) => {
    const activeSession = currentSession || session;
    if (!activeSession?.user?.email) return;

    const userEmail = activeSession.user.email;
    const userId = activeSession.user.id;

    console.log("Fetching orders for staff email:", userEmail, "and ID:", userId);

    // 1. Find if this user exists in staff_profiles to get their staff record ID
    const { data: staffData } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    const staffId = staffData ? staffData.id : null;

    // 2. Fetch available orders (unassigned & processing)
    const { data: availData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('status', 'processing')
      .is('delivery_agent_id', null);

    // 3. Fetch orders assigned to ME (checking both Auth ID and Staff Profile ID)
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

    // 4. Fetch completed orders by ME
    let completedQuery = supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('status', 'delivered');

    if (staffId) {
      completedQuery = completedQuery.or(`delivery_agent_id.eq.${userId},delivery_agent_id.eq.${staffId}`);
    } else {
      completedQuery = completedQuery.eq('delivery_agent_id', userId);
    }

    const { data: completedData } = await completedQuery;

    const allFetched = [...(availData || []), ...(activeData || []), ...(completedData || [])];
    const uniqueOrders = Array.from(new Map(allFetched.map(item => [item.id, item])).values());
    
    console.log("Total unique orders loaded:", uniqueOrders.length);
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
      fetchDeliveryOrders(data.session);
    }
    setLoggingIn(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const updatePayload = { status: newStatus };
    
    if (newStatus === 'accepted' && session) {
      // Fetch staff ID or fallback to user ID
      const { data: staffData } = await supabase.from('staff_profiles').select('id').eq('email', session.user.email).single();
      updatePayload.delivery_agent_id = staffData ? staffData.id : session.user.id;
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

  const totalEarnings = myCompletedOrders.length * 40;

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
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-lg font-black text-emerald-600 flex items-center gap-2"><Truck size={20}/> Delivery Portal</h1>
          <p className="text-xs text-stone-500 truncate mt-0.5">{session.user.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <button onClick={() => setActiveTab('available')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition ${activeTab === 'available' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><Package size={18} /> Available Orders</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">{availableOrders.length}</span>
          </button>
          <button onClick={() => setActiveTab('active')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition ${activeTab === 'active' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><Clock size={18} /> Active Deliveries</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-black">{myActiveOrders.length}</span>
          </button>
          <button onClick={() => setActiveTab('completed')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition ${activeTab === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'}`}>
            <span className="flex items-center gap-3"><CheckCircle size={18} /> Earnings & History</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">{myCompletedOrders.length}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-700 hover:bg-stone-100 rounded-2xl font-medium transition text-xs">
            <Truck size={16} /> View Storefront
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-2xl font-medium transition text-xs">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto">
        {activeTab === 'available' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-900">Available Orders for Pickup</h2>
            {availableOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-stone-500 font-medium shadow-sm">No new orders available.</div>
            ) : (
              <div className="space-y-4">
                {availableOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                      <span className="font-mono font-bold text-stone-900 text-base">Order #{order.id.slice(0, 8)}</span>
                      <span className="text-lg font-black text-stone-900">₹{order.total_amount.toFixed(2)}</span>
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
                      <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                        <Eye size={14} /> View Order Items ({order.order_items?.length || 0})
                      </button>
                      <button onClick={() => handleUpdateStatus(order.id, 'accepted')} className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-2xl text-xs hover:bg-emerald-700 transition">Accept Order</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-900">Active Deliveries Workflow</h2>
            {myActiveOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-stone-500 font-medium shadow-sm">No orders in progress or assigned to you yet.</div>
            ) : (
              <div className="space-y-4">
                {myActiveOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                      <span className="font-mono font-bold text-stone-900 text-base">Order #{order.id.slice(0, 8)}</span>
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800">
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
                      <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                        <Eye size={14} /> View Order Items ({order.order_items?.length || 0})
                      </button>

                      <div className="flex flex-wrap gap-2 justify-end items-center">
                        {(order.status === 'accepted' || order.status === 'shipped' || order.status === 'processing' || order.status === 'pending') && (
                          <button onClick={() => handleUpdateStatus(order.id, 'pickup')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition">
                            Reached Store / Pickup
                          </button>
                        )}

                        {order.status === 'pickup' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition">
                            Out for Delivery
                          </button>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <button onClick={() => { setVerifyingOrder(order); setEnteredOtp(''); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-1.5">
                            <CheckCircle size={14}/> Enter OTP & Complete Delivery
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-stone-900">Earnings & History</h2>
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase">Total Earnings</span>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{totalEarnings.toFixed(2)}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{myCompletedOrders.length} completed orders</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold shadow-inner">
                <DollarSign size={28} />
              </div>
            </div>

            {myCompletedOrders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-sm flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-stone-900">Order #{order.id.slice(0, 8)}</span>
                  <p className="text-stone-500 mt-0.5">{order.delivery_address}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <button onClick={() => setSelectedOrderDetails(order)} className="text-xs font-bold text-emerald-600 hover:underline">Items</button>
                  <div>
                    <span className="font-black text-emerald-600 block text-sm">+₹40.00 Earned</span>
                    <span className="text-[10px] text-stone-400 uppercase font-bold">Delivered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* OTP Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-base text-stone-900">Verify Customer OTP</h3>
              <button onClick={() => setVerifyingOrder(null)} className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"><X size={16}/></button>
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs shadow-lg transition active:scale-95"
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
              <button onClick={() => setSelectedOrderDetails(null)} className="p-2 rounded-full hover:bg-stone-100 text-stone-500"><X size={18}/></button>
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

            <button onClick={() => setSelectedOrderDetails(null)} className="w-full bg-stone-900 text-white font-bold py-3 rounded-2xl text-xs">
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}