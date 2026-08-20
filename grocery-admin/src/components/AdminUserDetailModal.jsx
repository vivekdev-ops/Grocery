// src/components/AdminUserDetailModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Package, ShoppingBag, DollarSign, CheckCircle } from 'lucide-react';

export default function AdminUserDetailModal({ user, role, isOpen, onClose }) {
  const [details, setDetails] = useState({ items: [], orders: [], stats: { revenue: 0, count: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserData();
    }
  }, [isOpen, user]);

  const fetchUserData = async () => {
    setLoading(true);
    if (role === 'shopkeeper') {
      const { data: prods } = await supabase.from('products').select('*').eq('shopkeeper_id', user.user_id || user.id);
      const { data: orderItems } = await supabase.from('order_items').select('*, orders(*, products(*))').eq('products.shopkeeper_id', user.user_id || user.id);
      
      const validOrders = orderItems?.map(oi => oi.orders).filter(Boolean) || [];
      const revenue = validOrders.reduce((sum, o) => sum + (o.status === 'delivered' ? o.total_amount : 0), 0);

      setDetails({
        items: prods || [],
        orders: validOrders,
        stats: { revenue, count: validOrders.length }
      });
    } else if (role === 'delivery') {
      const { data: orders } = await supabase.from('orders').select('*').eq('delivery_partner_id', user.id);
      const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
      const totalEarned = deliveredOrders.length * 30; // ₹30 per delivery commission

      setDetails({
        items: [],
        orders: orders || [],
        stats: { revenue: totalEarned, count: deliveredOrders.length }
      });
    }
    setLoading(false);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900 capitalize">{role} Details: {user.store_name || user.email || user.name}</h3>
            <p className="text-xs text-gray-500">{user.address || user.phone || 'Performance & Earnings Overview'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><X size={18}/></button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading user performance stats...</div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                <p className="text-xs font-bold text-green-700 uppercase">Total Profit / Earnings</p>
                <h4 className="text-xl font-black text-green-900 mt-1">₹{details.stats.revenue.toFixed(2)}</h4>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <p className="text-xs font-bold text-blue-700 uppercase">{role === 'shopkeeper' ? 'Total Orders' : 'Delivered Items'}</p>
                <h4 className="text-xl font-black text-blue-900 mt-1">{details.stats.count}</h4>
              </div>
            </div>

            {role === 'shopkeeper' && (
              <div>
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">Listed Products ({details.items.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-xl p-2 bg-gray-50">
                  {details.items.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2">No products added yet.</p>
                  ) : (
                    details.items.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
                        <span className="font-bold text-gray-900">{p.name}</span>
                        <span className="text-green-700 font-bold">₹{p.price.toFixed(2)} ({p.stock} in stock)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">Order History ({details.orders.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-2 bg-gray-50">
                {details.orders.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2">No orders recorded.</p>
                ) : (
                  details.orders.map(o => (
                    <div key={o.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border text-xs">
                      <div>
                        <span className="font-mono font-bold text-gray-800">#{o.id.slice(0, 8)}</span>
                        <span className="text-gray-400 block text-[10px]">{new Date(o.created_at).toLocaleString()}</span>
                      </div>
                      <span className="font-bold text-gray-900">₹{o.total_amount.toFixed(2)}</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${o.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {o.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}