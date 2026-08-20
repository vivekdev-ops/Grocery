// src/components/Orders.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Truck, MapPin, Phone, Mail, Clock, CheckCircle, Package } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrdersAndStaff();
  }, []);

  const fetchOrdersAndStaff = async () => {
    setLoading(true);
    
    // Fetch all orders with their order items and related product names
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Fetch available delivery partners from staff_profiles
    const { data: staffData, error: staffError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('role', 'delivery');

    if (!ordersError) setOrders(ordersData || []);
    if (!staffError) setDeliveryPartners(staffData || []);
    setLoading(false);
  };

  const handleAssignDriver = async (orderId, driverId) => {
    // UPDATED: Using delivery_agent_id to match the Delivery Portal query
    const { error } = await supabase
      .from('orders')
      .update({ 
        delivery_agent_id: driverId || null,
        status: driverId ? 'shipped' : 'processing' // Automatically update status to shipped when assigned
      })
      .eq('id', orderId);

    if (error) {
      alert('Failed to assign delivery partner: ' + error.message);
    } else {
      fetchOrdersAndStaff();
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchOrdersAndStaff();
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500 font-medium">Loading orders and assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Inspect customer orders, track fulfillment, and assign delivery partners.</p>
        </div>
        <button 
          onClick={fetchOrdersAndStaff}
          className="bg-white border hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
        >
          Refresh Orders
        </button>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">
            <ShoppingCart size={48} className="mx-auto mb-3 opacity-40" />
            <p className="font-bold text-sm">No orders found</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
              
              {/* Order Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 text-sm">Order #{order.id.slice(0, 8)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' : 
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-black text-gray-900">₹{order.total_amount?.toFixed(2)}</p>
                </div>
              </div>

              {/* Customer & Delivery Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
                <div>
                  <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">Customer & Shipping Details</p>
                  <p className="text-gray-900 font-medium flex items-center gap-1 mt-1">
                    <MapPin size={14} className="text-red-500 shrink-0" /> {order.delivery_address || 'No address specified'}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Phone size={14} className="text-gray-400 shrink-0" /> {order.phone || 'No phone provided'}
                  </p>
                </div>

                {/* Delivery Partner Assignment Section */}
                <div>
                  <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">Assign Delivery Partner</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <select
                        value={order.delivery_agent_id || ''} // UPDATED to delivery_agent_id
                        onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-green-600 outline-none transition"
                      >
                        <option value="">-- Unassigned (Select Driver) --</option>
                        {deliveryPartners.map(partner => (
                          <option key={partner.user_id} value={partner.user_id}>
                            {partner.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ordered Items List */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Items Ordered</p>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="p-3 bg-white flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-900">
                        {item.products?.name || 'Product'} <span className="text-gray-400">x {item.quantity}</span>
                      </span>
                      <span className="font-bold text-gray-700">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Status Override Buttons for Admin */}
              <div className="flex justify-end gap-2 pt-2">
                {order.status !== 'delivered' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <CheckCircle size={14} /> Force Mark Delivered
                  </button>
                )}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}