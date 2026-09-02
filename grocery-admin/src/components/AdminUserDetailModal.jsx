// src/components/AdminUserDetailModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Store, Truck, DollarSign, ShoppingBag, Calendar, Printer } from 'lucide-react';

const getApplicableCommissionPct = (rules, roleType, cartAmount) => {
  const roleRules = rules.filter(r => r.role_type === roleType && r.is_active);
  const matchedRule = roleRules.find(r => {
    const min = Number(r.min_cart_value || 0);
    const max = r.max_cart_value !== null ? Number(r.max_cart_value) : Infinity;
    return cartAmount >= min && cartAmount <= max;
  });
  if (matchedRule) return Number(matchedRule.commission_pct);
  return roleType === 'shopkeeper' ? 2 : 1; 
};

export default function AdminUserDetailModal({ user, role, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('all'); // 'today', 'week', 'month', 'custom', 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [performanceData, setPerformanceData] = useState({
    totalOrders: 0,
    grossEarnings: 0,
    netEarnings: 0,
    ordersList: []
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchUserPerformance();
    }
  }, [isOpen, user, datePreset, startDate, endDate]);

  const fetchUserPerformance = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*, order_items(*, products(name, price, shopkeeper_id, shopkeeper_profiles(store_name)))');

      const now = new Date();
      if (datePreset === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (datePreset === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', startOfWeek);
      } else if (datePreset === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', startOfMonth);
      } else if (datePreset === 'custom') {
        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDateTime.toISOString());
        }
      }

      const [rulesRes, ordersRes] = await Promise.all([
        supabase.from('cart_commission_rules').select('*').eq('is_active', true),
        query
      ]);

      const rules = rulesRes.data || [];
      const allOrders = ordersRes.data || [];

      let matchedOrders = [];
      let gross = 0;
      let net = 0;

      if (role === 'shopkeeper') {
        allOrders.forEach(ord => {
          const cartAmount = Number(ord.total_amount || 0);
          const storeItems = ord.order_items?.filter(item => 
            item.products?.shopkeeper_id === user.id || 
            item.products?.shopkeeper_profiles?.store_name === user.store_name
          ) || [];

          if (storeItems.length > 0 && ord.status === 'delivered') {
            const storeGross = storeItems.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0);
            const tierPct = getApplicableCommissionPct(rules, 'shopkeeper', cartAmount);
            const adminCut = (storeGross * tierPct) / 100;
            const storeNet = storeGross - adminCut;

            gross += storeGross;
            net += storeNet;
            matchedOrders.push({
              ...ord,
              storeItems,
              storeGross,
              tierPct,
              adminCut,
              storeNet
            });
          }
        });
      } else if (role === 'delivery' || role === 'delivery_boy' || role === 'delivery_partner') {
        const agentOrders = allOrders.filter(ord => (ord.delivery_agent_id === user.id || ord.delivery_agent_id === user.email) && ord.status === 'delivered');
        agentOrders.forEach(ord => {
          const cartAmount = Number(ord.total_amount || 0);
          const tierPct = getApplicableCommissionPct(rules, 'delivery', cartAmount);
          const fee = (cartAmount * tierPct) / 100;

          gross += cartAmount;
          net += fee;
          matchedOrders.push({
            ...ord,
            tierPct,
            earnedFee: fee
          });
        });
      }

      setPerformanceData({
        totalOrders: matchedOrders.length,
        grossEarnings: gross,
        netEarnings: net,
        ordersList: matchedOrders
      });

    } catch (err) {
      console.error('Error fetching performance report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans text-xs">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header & Controls */}
        <div className="flex justify-between items-center border-b pb-4 print:hidden">
          <div>
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              {role === 'shopkeeper' ? <Store size={16} className="text-emerald-600" /> : <Truck size={16} className="text-blue-600" />}
              {user.store_name || user.email || 'User Performance Statement'}
            </h3>
            <p className="text-stone-400 text-[11px] capitalize">Role: {role} | Statement Report</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer">
              <Printer size={13} /> Print PDF
            </button>
            <button onClick={onClose} className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Date Filter Selection Bar */}
        <div className="bg-stone-50 p-3 rounded-2xl border space-y-3 print:hidden">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="font-bold text-stone-500">Filter Period:</span>
            <div className="flex gap-1 flex-wrap">
              {['today', 'week', 'month', 'custom', 'all'].map(d => (
                <button 
                  key={d} 
                  onClick={() => setDatePreset(d)} 
                  className={`px-3 py-1 rounded-xl font-bold transition capitalize cursor-pointer ${datePreset === d ? 'bg-white text-emerald-800 shadow-xs border' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {datePreset === 'custom' && (
            <div className="flex gap-3 items-center pt-2 border-t border-stone-200">
              <div className="flex-1">
                <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full bg-white border p-2 rounded-xl text-xs font-bold outline-none" 
                />
              </div>
              <div className="flex-1">
                <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full bg-white border p-2 rounded-xl text-xs font-bold outline-none" 
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-stone-400 font-bold">Compiling earnings & date range report...</div>
        ) : (
          <div className="space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold uppercase text-[10px]">Delivered Orders</span>
                <h4 className="text-lg font-black text-slate-900">{performanceData.totalOrders} Completed</h4>
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-stone-400 font-bold uppercase text-[10px]">{role === 'shopkeeper' ? 'Gross Sales' : 'Order Volume'}</span>
                <h4 className="text-lg font-black text-slate-900">₹{performanceData.grossEarnings.toLocaleString()}</h4>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-emerald-700 font-bold uppercase text-[10px]">Net Payout Earnings</span>
                <h4 className="text-lg font-black text-emerald-800">₹{performanceData.netEarnings.toFixed(2)}</h4>
              </div>
            </div>

            {/* Detailed Transaction List */}
            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Filtered Period Statement & Commission Tiers</h4>
              
              {performanceData.ordersList.length === 0 ? (
                <div className="p-8 text-center text-stone-400 italic border rounded-2xl">No delivered orders found matching this date range.</div>
              ) : (
                <div className="border rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-stone-50 border-b text-stone-400 uppercase">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Tier % Applied</th>
                        <th className="p-3 text-right">{role === 'shopkeeper' ? 'Net Payout' : 'Earned Fee'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-800">
                      {performanceData.ordersList.map((ord, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-3 font-mono">#{ord.id.slice(0, 8)}</td>
                          <td className="p-3 text-stone-500">{new Date(ord.created_at).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-amber-700">{ord.tierPct}%</td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            ₹{role === 'shopkeeper' ? ord.storeNet?.toFixed(2) : ord.earnedFee?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        <div className="pt-2 print:hidden">
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black uppercase tracking-wider cursor-pointer text-xs">
            Close Statement View
          </button>
        </div>

      </div>
    </div>
  );
}