// src/components/Orders.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Search, Truck, ExternalLink, Navigation, UserCheck, ShieldAlert, CheckCircle2, Clock, Tag, ChevronDown, ChevronRight } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
      // Automatically collapse all groups by default when data loads
      const initialCollapsed = {};
      const uniqueStatuses = [...new Set(data.map(o => o.status || 'pending'))];
      uniqueStatuses.forEach(status => {
        initialCollapsed[status] = true;
      });
      setCollapsedGroups(initialCollapsed);
    }
    setLoading(false);
  };

  const fetchDeliveryBoys = async () => {
    const { data, error } = await supabase.from('staff_profiles').select('*');
    if (!error && data) setDeliveryBoys(data);
  };

  const updateOrderStatus = async (orderId, newStatus, currentStatus) => {
    if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
      alert("This order is locked and its status cannot be modified.");
      return;
    }

    let remark = null;
    if (newStatus === 'cancelled') {
      const reason = prompt("Enter cancellation remark:", "Cancelled by admin");
      if (reason === null) return;
      remark = reason.trim() || "Cancelled by admin";
    }

    const updatePayload = { status: newStatus };
    if (remark) updatePayload.cancellation_remark = remark;

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (error) alert("Failed to update status: " + error.message);
    else {
      alert("Status updated successfully!");
      fetchOrders();
    }
  };

  const assignAgent = async (orderId, agentId) => {
    const { error } = await supabase.from('orders').update({ delivery_agent_id: agentId || null }).eq('id', orderId);
    if (error) alert("Failed to assign agent: " + error.message);
    else {
      alert("Delivery partner assigned!");
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.phone && order.phone.includes(searchQuery)) ||
      (order.coupon_code && order.coupon_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Group filtered orders by status
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const status = order.status || 'pending';
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {});

  const toggleGroup = (status) => {
    setCollapsedGroups(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Orders & Delivery Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Grouped view of customer orders by fulfillment status.</p>
        </div>
        
        <div className="flex gap-1.5 bg-emerald-50/60 p-1.5 rounded-2xl border border-emerald-200 overflow-x-auto scrollbar-none">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition shrink-0 cursor-pointer ${
                statusFilter === status ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-600 hover:bg-emerald-100/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* AI Diagnostics Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-5 text-white border border-emerald-800 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-amber-400">
            <Clock size={13} /> Pending Queue
          </div>
          <p className="text-emerald-100 text-xs"><strong className="text-white">{pendingOrdersCount}</strong> require processing</p>
        </div>

        <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
            <CheckCircle2 size={13} /> Delivered
          </div>
          <p className="text-emerald-100 text-xs"><strong className="text-white">{deliveredOrdersCount}</strong> orders completed</p>
        </div>

        <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
            <Truck size={13} /> Staff Roster
          </div>
          <p className="text-emerald-100 text-xs"><strong className="text-white">{deliveryBoys.length}</strong> agents registered</p>
        </div>
      </div>

      {/* Search Input & Total Count Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" 
            placeholder="Search Order ID, email, phone, coupon..." 
            className="w-full pl-10 pr-3.5 py-2.5 bg-white rounded-2xl text-xs font-medium border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 shadow-2xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-slate-500 w-full sm:w-auto text-right">
          Total Matching Orders: <span className="text-slate-900 font-black">{filteredOrders.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-emerald-100 text-center text-slate-400 space-y-2 shadow-2xs">
          <Package className="mx-auto text-slate-300" size={40} />
          <p className="font-bold text-slate-700">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedOrders).map(([status, statusOrders]) => {
            const isCollapsed = collapsedGroups[status] ?? true; // Default to true (collapsed)

            return (
              <div key={status} className="space-y-3">
                {/* Group Category Header */}
                <button
                  onClick={() => toggleGroup(status)}
                  className="w-full flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 p-3 rounded-2xl text-slate-900 font-black transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2 uppercase tracking-wider text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      status === 'delivered' ? 'bg-emerald-600' :
                      status === 'shipped' ? 'bg-purple-600' :
                      status === 'processing' ? 'bg-blue-600' :
                      status === 'cancelled' ? 'bg-rose-600' : 'bg-amber-500'
                    }`} />
                    <span>{status} Orders</span>
                    <span className="bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono text-[10px]">
                      {statusOrders.length}
                    </span>
                  </div>
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Group Cards Grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {statusOrders.map(order => {
                      const isLocked = order.status === 'cancelled' || order.status === 'delivered';

                      return (
                        <div key={order.id} className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
                          
                          {/* Card Top: ID & Status */}
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 text-sm">#{order.id.slice(0, 8)}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                            </div>

                            {/* Status Dropdown */}
                            <select 
                              disabled={isLocked}
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value, order.status)}
                              className={`border rounded-xl px-2.5 py-1.5 text-[11px] font-black outline-none cursor-pointer ${
                                isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-slate-800'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          {order.status === 'cancelled' && order.cancellation_remark && (
                            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-1.5 text-rose-700 text-[11px] font-bold">
                              <ShieldAlert size={13} /> Reason: {order.cancellation_remark}
                            </div>
                          )}

                          {/* Customer & Delivery Info Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold uppercase block">Customer Email</span>
                              <span className="font-bold text-slate-800 truncate block text-[11px]">{order.customer_email}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold uppercase block">Phone / OTP</span>
                              <span className="font-bold text-slate-800 text-[11px]">{order.phone || 'N/A'} • <span className="font-mono text-emerald-700">{order.otp || '----'}</span></span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-emerald-100/60">
                              <span className="text-slate-400 text-[10px] font-bold uppercase block">Delivery Address</span>
                              <span className="font-medium text-slate-800 line-clamp-1 text-[11px]">{order.delivery_address || 'Not specified'}</span>
                            </div>
                          </div>

                          {/* GPS Navigation Bar */}
                          {order.latitude && order.longitude && (
                            <div className="px-3 py-2 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                <Navigation size={12} /> GPS Verified
                              </span>
                              <a 
                                href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-2xs"
                              >
                                Maps <ExternalLink size={10} />
                              </a>
                            </div>
                          )}

                          {/* Items Summary Chips */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ordered Items ({order.order_items?.length || 0})</span>
                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                              {order.order_items?.map(item => (
                                <div key={item.id} className="bg-emerald-50/50 border border-emerald-100 px-2.5 py-1 rounded-xl text-[11px] font-medium text-slate-800 flex items-center gap-1.5">
                                  <span className="font-bold">{item.products?.name || 'Item'}</span>
                                  <span className="bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded-md font-mono text-[10px]">×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Card Footer: Agent Assignment & Total Amount */}
                          <div className="pt-3 border-t border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                            {/* Agent Dropdown */}
                            <div className="flex items-center gap-1.5 bg-emerald-50/60 border border-emerald-200 px-3 py-1.5 rounded-xl w-full sm:w-auto">
                              <UserCheck size={13} className="text-emerald-700 shrink-0" />
                              <select 
                                value={order.delivery_agent_id || ''}
                                onChange={(e) => assignAgent(order.id, e.target.value)}
                                className="text-[11px] font-bold bg-transparent outline-none cursor-pointer text-slate-800 w-full truncate"
                              >
                                <option value="">Assign Delivery Agent</option>
                                {deliveryBoys.map(staff => (
                                  <option key={staff.id} value={staff.id}>
                                    {staff.name || staff.full_name || staff.email}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Promo & Total */}
                            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                              {order.coupon_code && (
                                <span className="bg-emerald-100 text-emerald-900 font-mono font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1">
                                  <Tag size={10} /> {order.coupon_code}
                                </span>
                              )}
                              <span className="font-black text-slate-900 text-sm">
                                ₹{Number(order.total_amount || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}