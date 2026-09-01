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

    const [rulesRes, settingsRes] = await Promise.all([
      supabase.from('cart_commission_rules').select('*').eq('is_active', true),
      supabase.from('platform_settings').select('*').eq('id', 1).single()
    ]);

    const rules = rulesRes.data || [];
    const settingsData = settingsRes.data;

    const defaultShopkeeperPct = settingsData ? Number(settingsData.shopkeeper_commission_pct) : 85;
    const defaultDeliveryPct = settingsData ? Number(settingsData.delivery_commission_pct) : 100;

    const getCommissionPct = (roleType, cartValue) => {
      const roleRules = rules.filter(r => r.role_type === roleType);
      const matched = roleRules.find(r => {
        const min = Number(r.min_cart_value);
        const max = r.max_cart_value !== null ? Number(r.max_cart_value) : Infinity;
        return cartValue >= min && cartValue <= max;
      });
      if (matched) return Number(matched.commission_pct);
      return roleType === 'shopkeeper' ? defaultShopkeeperPct : defaultDeliveryPct;
    };

    const targetId = String(user.user_id || user.id || '');

    if (role === 'shopkeeper') {
      const { data: prods } = await supabase.from('products').select('*').eq('shopkeeper_id', targetId);
      const { data: orderItems } = await supabase.from('order_items').select('*, orders(*, products(*))').eq('products.shopkeeper_id', targetId);
      
      const validOrders = orderItems?.map(oi => oi.orders).filter(Boolean) || [];
      const revenue = validOrders.reduce((sum, o) => {
        if (o.status === 'delivered') {
          const cartTotal = Number(o.total_amount || 0);
          const pct = getCommissionPct('shopkeeper', cartTotal);
          return sum + ((cartTotal * pct) / 100);
        }
        return sum;
      }, 0);

      setDetails({
        items: prods || [],
        orders: validOrders,
        stats: { revenue, count: validOrders.length }
      });
    } else if (role === 'delivery') {
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      const matchedOrders = (allOrders || []).filter(o => {
        const pId = String(o.delivery_partner_id || '');
        const bId = String(o.delivery_boy_id || '');
        const aId = String(o.delivery_agent_id || '');
        return pId === targetId || pId === String(user.id) || 
               bId === targetId || bId === String(user.id) || 
               aId === targetId || aId === String(user.id);
      });

      const deliveredOrders = matchedOrders.filter(o => o.status === 'delivered');
      
      // Corrected logic: Evaluates the tier percentage against the total order amount
      const totalEarned = deliveredOrders.reduce((sum, o) => {
        const cartTotal = Number(o.total_amount || 0);
        const pct = getCommissionPct('delivery', cartTotal);
        return sum + ((cartTotal * pct) / 100);
      }, 0);

      setDetails({
        items: [],
        orders: matchedOrders,
        stats: { revenue: totalEarned, count: deliveredOrders.length }
      });
    }
    setLoading(false);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-black text-base text-gray-900 capitalize">
              {role === 'delivery' ? 'Delivery Partner' : 'Shopkeeper'} Details: <span className="text-emerald-700">{user.store_name || user.email || user.name}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Performance & Earnings Overview (Tiered Commissions)</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 cursor-pointer transition">
            <X size={18}/>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs font-bold">Loading user performance stats...</div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-2xs space-y-1">
                <p className="font-black text-emerald-800 uppercase tracking-wider text-[10px]">Total Profit / Earnings</p>
                <h4 className="text-xl font-black text-emerald-950">₹{details.stats.revenue.toFixed(2)}</h4>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-2xs space-y-1">
                <p className="font-black text-blue-800 uppercase tracking-wider text-[10px]">
                  {role === 'shopkeeper' ? 'Total Orders' : 'Delivered Orders'}
                </p>
                <h4 className="text-xl font-black text-blue-950">{details.stats.count}</h4>
              </div>
            </div>

            {role === 'shopkeeper' && (
              <div className="space-y-2">
                <h4 className="font-black text-gray-800 uppercase tracking-wider text-[10px]">Listed Products ({details.items.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-2xl p-2.5 bg-gray-50">
                  {details.items.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2 text-center italic">No products added yet.</p>
                  ) : (
                    details.items.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                        <span className="font-bold text-gray-900">{p.name}</span>
                        <span className="text-emerald-700 font-black">₹{Number(p.price || 0).toFixed(2)} <span className="text-gray-400 font-normal">({p.stock} in stock)</span></span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-black text-gray-800 uppercase tracking-wider text-[10px]">Order History ({details.orders.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-2xl p-2.5 bg-gray-50">
                {details.orders.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3 text-center italic">No orders recorded for this account.</p>
                ) : (
                  details.orders.map(o => (
                    <div key={o.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 text-xs">
                      <div>
                        <span className="font-mono font-black text-gray-900">#{o.id.slice(0, 8)}</span>
                        <span className="text-gray-400 block text-[10px] mt-0.5">{new Date(o.created_at).toLocaleString()}</span>
                      </div>
                      <span className="font-black text-gray-900">₹{Number(o.total_amount || 0).toFixed(2)}</span>
                      <span className={`px-2.5 py-1 rounded-full font-black uppercase text-[9px] ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
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