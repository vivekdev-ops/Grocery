// src/components/Orders.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Search, CheckCircle, Clock, Truck, FileText, MapPin, ExternalLink, Navigation, UserCheck } from 'lucide-react';

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
      .select('*, order_items(*, products(name, image_url))')
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

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900">Orders & Delivery Management</h2>
          <p className="text-xs text-stone-500 mt-0.5">Manage customer orders, assign delivery partners from staff profiles, and track GPS routes.</p>
        </div>
        
        {/* Status Filters */}
        <div className="flex gap-2 bg-white p-1 rounded-xl border shadow-2xs overflow-x-auto">
          {['all', 'pending', 'processing', 'shipped', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === status ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
        <input 
          type="text" 
          placeholder="Search by Order ID, email, or phone..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-xs font-medium border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-500 text-sm font-bold">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border text-center text-stone-400 space-y-2">
          <Package className="mx-auto text-stone-300" size={48} />
          <p className="font-bold text-stone-700">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs space-y-4">
              
              {/* Header Info & Assign Delivery Boy Controls */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 border-b border-stone-100 gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-stone-900 text-base">Order #{order.id.slice(0, 8)}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Assign Delivery Boy Dropdown from staff_profiles */}
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl">
                    <UserCheck size={14} className="text-emerald-600" />
                    <select 
                      value={order.delivery_agent_id || ''}
                      onChange={(e) => assignAgent(order.id, e.target.value)}
                      className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                    >
                      <option value="">Assign Delivery Boy...</option>
                      {deliveryBoys.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name || staff.full_name || staff.email || `Staff ${staff.id.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Switcher Dropdown */}
                  <select 
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-stone-50 outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Customer & OTP Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <span className="text-stone-400 font-bold block uppercase tracking-wider mb-0.5">Customer Email</span>
                  <span className="font-bold text-stone-900">{order.customer_email}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold block uppercase tracking-wider mb-0.5">Contact Phone</span>
                  <span className="font-bold text-stone-900">{order.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold block uppercase tracking-wider mb-0.5">Verification OTP</span>
                  <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border inline-block tracking-widest">{order.otp || '----'}</span>
                </div>
              </div>

              {/* Delivery Address & GPS Navigation Section */}
              <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-100 space-y-3">
                <div>
                  <span className="text-stone-400 font-bold text-xs uppercase tracking-wider block mb-0.5">Delivery Address</span>
                  <p className="text-xs text-stone-800 font-medium">{order.delivery_address || 'Not specified'}</p>
                </div>

                {order.latitude && order.longitude ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      📍 Open Google Maps <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">No GPS coordinates attached to this order.</p>
                )}
              </div>

              {/* Order Items Table */}
              <div className="space-y-2">
                <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Ordered Items ({order.order_items?.length || 0})</p>
                <div className="divide-y border rounded-2xl overflow-hidden bg-stone-50/50">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {item.products?.image_url && (
                          <img src={item.products.image_url} alt="" className="w-9 h-9 object-cover rounded-xl border bg-white" />
                        )}
                        <div>
                          <span className="font-bold text-stone-900 block">{item.products?.name || 'Product'}</span>
                          <span className="text-stone-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="font-black text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount Footer */}
              <div className="pt-3 border-t flex justify-between items-center text-sm font-bold">
                <span className="text-stone-600">Total Order Amount:</span>
                <span className="text-lg font-black text-stone-900">₹{order.total_amount.toFixed(2)}</span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}