// src/components/CustomerManagement.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Search, ShoppingBag, MapPin, Phone, Mail, Eye, X } from 'lucide-react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState(null);
  const [customerEmailModal, setCustomerEmailModal] = useState('');

  useEffect(() => {
    fetchCustomersAndOrders();
  }, []);

  const fetchCustomersAndOrders = async () => {
    setLoading(true);
    // Fetch all orders with customer emails
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, price))')
      .order('created_at', { ascending: false });

    if (!error && ordersData) {
      // Group orders by customer_email
      const map = {};
      ordersData.forEach(order => {
        const email = order.customer_email || 'Guest / Unassigned';
        if (!map[email]) {
          map[email] = {
            email,
            phone: order.phone || 'N/A',
            address: order.delivery_address || 'N/A',
            ordersCount: 0,
            totalSpent: 0,
            orders: []
          };
        }
        map[email].ordersCount += 1;
        map[email].totalSpent += order.total_amount;
        map[email].orders.push(order);
        // keep most recent address/phone
        if (order.phone) map[email].phone = order.phone;
        if (order.delivery_address) map[email].address = order.delivery_address;
      });

      setCustomers(Object.values(map));
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users size={24}/> Customer Management</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Search by email or phone..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
              <th className="p-4">Customer Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Latest Address</th>
              <th className="p-4">Total Orders</th>
              <th className="p-4">Total Spent</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading customers...</td></tr>
            ) : filteredCustomers.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No customers found.</td></tr>
            ) : (
              filteredCustomers.map(cust => (
                <tr key={cust.email} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900 text-sm flex items-center gap-2">
                    <Mail size={16} className="text-gray-400"/> {cust.email}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400"/> {cust.phone}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                    <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400 shrink-0"/> {cust.address}</span>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-800">{cust.ordersCount}</td>
                  <td className="p-4 text-sm font-extrabold text-green-700">₹{cust.totalSpent.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setSelectedCustomerOrders(cust.orders); setCustomerEmailModal(cust.email); }}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Eye size={16} /> View Orders ({cust.ordersCount})
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Orders Modal */}
      {selectedCustomerOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Customer Orders</h3>
                <p className="text-sm text-gray-500">{customerEmailModal}</p>
              </div>
              <button onClick={() => setSelectedCustomerOrders(null)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50">
              {selectedCustomerOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs border-pb pb-2">
                    <span className="font-mono font-bold text-gray-700">Order #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString()}</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>{order.status}</span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Address:</strong> {order.delivery_address || 'N/A'}</p>
                    <p><strong>Phone:</strong> {order.phone || 'N/A'}</p>
                  </div>

                  <div className="border-t pt-2 flex justify-between items-center font-bold text-sm">
                    <span>Total Amount:</span>
                    <span className="text-green-700">₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}