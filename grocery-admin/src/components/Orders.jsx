// src/components/Orders.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Search, Truck, ExternalLink, Navigation, UserCheck, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url, images, gallery))')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const fetchDeliveryBoys = async () => {
    const { data, error } = await supabase
      .from('staff_profiles') 
      .select('*');

    if (!error && data) {
      setDeliveryBoys(data);
    } else {
      console.error("Error fetching staff profiles:", error?.message);
      setDeliveryBoys([]);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, currentStatus) => {
    if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
      alert("This order is locked and its status cannot be modified.");
      return;
    }

    let remark = null;
    if (newStatus === 'cancelled') {
      const reason = prompt("Enter cancellation remark (e.g., 'Cancelled by admin due to stock unavailability'):", "Cancelled by admin");
      if (reason === null) return;
      remark = reason.trim() || "Cancelled by admin";
    }

    const updatePayload = { status: newStatus };
    if (remark) {
      updatePayload.cancellation_remark = remark;
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      alert("Order status updated successfully!");
      fetchOrders();
    }
  };

  const assignAgent = async (orderId, agentId) => {
    const { error } = await supabase
      .from('orders')
      .update({ delivery_agent_id: agentId || null })
      .eq('id', orderId);

    if (error) {
      alert("Failed to assign delivery boy: " + error.message);
    } else {
      alert("Delivery boy assigned successfully!");
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.phone && order.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header & Status Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Orders & Delivery Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer orders, assign delivery partners from staff profiles, and track GPS routes.</p>
        </div>
        
        {/* Status Filters */}
        <div className="flex gap-2 bg-emerald-50/50 p-1.5 rounded-2xl border border-emerald-200 overflow-x-auto scrollbar-none">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition shrink-0 ${
                statusFilter === status ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-600 hover:bg-emerald-100/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* AI Order Fulfillment Diagnostics Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">AI Fulfillment & Dispatch Intelligence</h3>
            <p className="text-[11px] text-emerald-300/80">Real-time queue health and active delivery partner oversight.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-amber-400">
              <Clock size={14} className="text-amber-400" /> Pending Queue
            </div>
            <p className="text-emerald-100/95"><strong className="text-white">{pendingOrdersCount}</strong> orders require processing or delivery assignment to maintain SLA.</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <CheckCircle2 size={14} className="text-emerald-400" /> Successful Deliveries
            </div>
            <p className="text-emerald-100/95"><strong className="text-white">{deliveredOrdersCount}</strong> orders successfully completed and verified with OTPs.</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <Truck size={14} className="text-emerald-400" /> Staff Roster
            </div>
            <p className="text-emerald-100/95"><strong className="text-white">{deliveryBoys.length}</strong> delivery agents registered in staff profiles available for assignment.</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="Search by Order ID, email, or phone..." 
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-xs font-medium border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs text-slate-900"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm font-bold">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-emerald-100 text-center text-slate-400 space-y-2 shadow-sm">
          <Package className="mx-auto text-slate-300" size={48} />
          <p className="font-bold text-slate-700">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isLocked = order.status === 'cancelled' || order.status === 'delivered';

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-sm space-y-4">
                
                {/* Header Info & Assign Delivery Boy Controls */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 border-b border-emerald-100 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-slate-900 text-base">Order #{order.id.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Assign Delivery Boy Dropdown from staff_profiles */}
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-200 px-3 py-2 rounded-2xl">
                      <UserCheck size={14} className="text-emerald-700" />
                      <select 
                        value={order.delivery_agent_id || ''}
                        onChange={(e) => assignAgent(order.id, e.target.value)}
                        className="text-xs font-bold bg-transparent outline-none cursor-pointer text-slate-800"
                      >
                        <option value="">Assign Delivery Boy...</option>
                        {deliveryBoys.map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name || staff.full_name || staff.email || `Staff ${staff.id.slice(0, 6)}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Switcher Dropdown (Locked if delivered or cancelled) */}
                    <select 
                      disabled={isLocked}
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value, order.status)}
                      className={`border rounded-2xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer ${
                        isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200 text-slate-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {order.status === 'cancelled' && order.cancellation_remark && (
                  <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-bold">
                    <ShieldAlert size={15} /> Cancellation Remark: {order.cancellation_remark}
                  </div>
                )}

                {/* Customer & OTP Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Customer Email</span>
                    <span className="font-bold text-slate-900">{order.customer_email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Contact Phone</span>
                    <span className="font-bold text-slate-900">{order.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Verification OTP</span>
                    <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 inline-block tracking-widest">{order.otp || '----'}</span>
                  </div>
                </div>

                {/* Delivery Address & GPS Navigation Section */}
                <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <div>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block mb-0.5">Delivery Address</span>
                    <p className="text-xs text-slate-800 font-medium">{order.delivery_address || 'Not specified'}</p>
                  </div>

                  {order.latitude && order.longitude ? (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block flex items-center gap-1">
                          <Navigation size={12} /> Customer GPS Location Captured
                        </span>
                        <span className="text-xs font-mono text-emerald-700">{order.latitude}, {order.longitude}</span>
                      </div>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        📍 Open Google Maps <ExternalLink size={12} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No GPS coordinates attached to this order.</p>
                  )}
                </div>

                {/* Order Items Table */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Ordered Items ({order.order_items?.length || 0})</p>
                  <div className="divide-y divide-emerald-100 border border-emerald-100 rounded-2xl overflow-hidden bg-emerald-50/20">
                    {order.order_items?.map(item => {
                      const itemImages = item.products?.images || item.products?.gallery || [item.products?.image_url].filter(Boolean);
                      const itemImg = itemImages[0] || '';

                      return (
                        <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {itemImg && (
                              <img src={itemImg} alt="" className="w-10 h-10 object-cover rounded-xl border border-emerald-200 bg-white shadow-2xs" />
                            )}
                            <div>
                              <span className="font-bold text-slate-900 block">{item.products?.name || 'Product'}</span>
                              <span className="text-slate-500 font-medium">Qty: {item.quantity} × ₹{Number(item.price || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="font-black text-slate-900">₹{(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Amount Footer */}
                <div className="pt-3 border-t border-emerald-100 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-600">Total Order Amount:</span>
                  <span className="text-lg font-black text-slate-900">₹{Number(order.total_amount || 0).toFixed(2)}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}