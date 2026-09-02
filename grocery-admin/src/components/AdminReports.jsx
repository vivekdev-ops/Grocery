// src/components/AdminReports.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TrendingUp, ShoppingBag, DollarSign, Users, Package, Download, Store, Truck, FileText, Eye, X, Printer, Percent } from 'lucide-react';

const getApplicableCommissionPct = (rules, roleType, cartAmount) => {
  const roleRules = rules.filter(r => r.role_type === roleType && r.is_active);
  const matchedRule = roleRules.find(r => {
    const min = Number(r.min_cart_value || 0);
    const max = r.max_cart_value !== null ? Number(r.max_cart_value) : Infinity;
    return cartAmount >= min && cartAmount <= max;
  });
  
  if (matchedRule) {
    return Number(matchedRule.commission_pct); // e.g. 2% for shopkeeper, 1% for delivery
  }
  return roleType === 'shopkeeper' ? 10 : 15; // default fallback if no matching tier range is found
};

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOrders: 0, deliveredOrders: 0, pendingOrders: 0, cancelledOrders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  
  const [shopkeeperReports, setShopkeeperReports] = useState([]);
  const [deliveryReports, setDeliveryReports] = useState([]);
  const [customerReports, setCustomerReports] = useState([]);
  const [activeEntityModal, setActiveEntityModal] = useState(null); 

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*, order_items(*, products(name, price, shopkeeper_profiles(store_name)))');
      
      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (dateRange === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', startOfWeek);
      } else if (dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', startOfMonth);
      }

      const [ordersRes, shopkeepersRes, staffRes, rulesRes] = await Promise.all([
        query,
        supabase.from('shopkeeper_profiles').select('*'),
        supabase.from('staff_profiles').select('*'),
        supabase.from('cart_commission_rules').select('*').eq('is_active', true)
      ]);

      const orders = ordersRes.data || [];
      const shopkeepers = shopkeepersRes.data || [];
      const staffList = staffRes.data || [];
      const commissionRules = rulesRes.data || [];
      const deliveryStaff = staffList.filter(s => s.role === 'delivery' || s.role === 'delivery_boy' || s.role === 'delivery_partner');

      let revenue = 0;
      let pending = 0;
      let delivered = 0;
      let cancelled = 0;
      const shopkeeperStats = {};
      const deliveryStats = {};
      const customerStats = {};

      shopkeepers.forEach(sk => {
        const storeName = sk.store_name || 'Store';
        shopkeeperStats[storeName] = { 
          id: sk.id,
          storeName, 
          ownerEmail: sk.email || 'N/A',
          ordersHandled: 0, 
          grossRevenue: 0,
          adminCommission: 0,
          shopkeeperEarning: 0,
          items: []
        };
      });

      deliveryStaff.forEach(ds => {
        deliveryStats[ds.id] = { 
          id: ds.id,
          name: ds.email || ds.name || 'Delivery Partner', 
          deliveriesCompleted: 0,
          totalDeliveryEarning: 0,
          assignedOrders: []
        };
      });

      orders.forEach(ord => {
        const cartTotalAmount = Number(ord.total_amount || 0);

        if (ord.status === 'delivered') {
          revenue += cartTotalAmount;
          delivered++;
        } else if (ord.status === 'pending' || ord.status === 'processing') {
          pending++;
        } else if (ord.status === 'cancelled') {
          cancelled++;
        }

        // Customer aggregation
        const custEmail = ord.customer_email || 'Unknown';
        if (!customerStats[custEmail]) {
          customerStats[custEmail] = { email: custEmail, totalOrders: 0, totalSpent: 0, orders: [] };
        }
        customerStats[custEmail].totalOrders += 1;
        customerStats[custEmail].orders.push(ord);
        if (ord.status === 'delivered') {
          customerStats[custEmail].totalSpent += cartTotalAmount;
        }

        // Delivery Partner Aggregation based on Dynamic Tiered Commission %
        const agentId = ord.delivery_agent_id;
        if (agentId) {
          if (!deliveryStats[agentId]) {
            const foundStaff = staffList.find(s => s.id === agentId || s.email === agentId);
            deliveryStats[agentId] = { 
              id: agentId,
              name: foundStaff?.email || foundStaff?.name || agentId, 
              deliveriesCompleted: 0,
              totalDeliveryEarning: 0,
              assignedOrders: []
            };
          }
          if (ord.status === 'delivered') {
            const deliveryPct = getApplicableCommissionPct(commissionRules, 'delivery', cartTotalAmount);
            const dFee = (cartTotalAmount * deliveryPct) / 100;
            
            deliveryStats[agentId].deliveriesCompleted += 1;
            deliveryStats[agentId].totalDeliveryEarning += dFee;
            deliveryStats[agentId].assignedOrders.push({ ...ord, earnedFee: dFee, appliedRate: deliveryPct });
          }
        }

        // Shopkeeper Product Stats & Tiered Commission Tally
        ord.order_items?.forEach(item => {
          const storeName = item.products?.shopkeeper_profiles?.store_name || 'Main Store';
          const itemSubtotal = Number(item.price || 0) * item.quantity;
          
          if (!shopkeeperStats[storeName]) {
            shopkeeperStats[storeName] = { storeName, ownerEmail: 'N/A', ordersHandled: 0, grossRevenue: 0, adminCommission: 0, shopkeeperEarning: 0, items: [] };
          }

          shopkeeperStats[storeName].ordersHandled += item.quantity;
          
          if (ord.status === 'delivered') {
            const shopkeeperPct = getApplicableCommissionPct(commissionRules, 'shopkeeper', cartTotalAmount);
            const commAmount = (itemSubtotal * shopkeeperPct) / 100;

            shopkeeperStats[storeName].grossRevenue += itemSubtotal;
            shopkeeperStats[storeName].adminCommission += commAmount;
            shopkeeperStats[storeName].shopkeeperEarning += (itemSubtotal - commAmount);
            shopkeeperStats[storeName].items.push({ 
              productName: item.products?.name, 
              qty: item.quantity, 
              price: item.price, 
              subtotal: itemSubtotal, 
              appliedRate: shopkeeperPct,
              adminCut: commAmount,
              date: ord.created_at 
            });
          }
        });
      });

      deliveryStaff.forEach(ds => {
        if (!deliveryStats[ds.id]) {
          deliveryStats[ds.id] = { id: ds.id, name: ds.email || 'Delivery Partner', deliveriesCompleted: 0, totalDeliveryEarning: 0, assignedOrders: [] };
        }
      });

      setMetrics({ totalRevenue: revenue, totalOrders: orders.length, pendingOrders: pending, deliveredOrders: delivered, cancelledOrders: cancelled });
      setRecentOrders(orders.slice(0, 10));
      setShopkeeperReports(Object.values(shopkeeperStats));
      
      const uniqueDeliveryReports = Array.from(new Set(Object.values(deliveryStats).map(d => d.name)))
        .map(name => Object.values(deliveryStats).find(d => d.name === name));
      
      setDeliveryReports(uniqueDeliveryReports);
      setCustomerReports(Object.values(customerStats).sort((a, b) => b.totalSpent - a.totalSpent));

    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let filename = `report_${reportType}_${dateRange}.csv`;
    let headers = [];
    let rows = [];

    if (reportType === 'shopkeeper') {
      headers = ["Store Name", "Items Handled", "Gross Sales (₹)", "Admin Commission (₹)", "Net Earning (₹)"];
      rows = shopkeeperReports.map(s => [s.storeName, s.ordersHandled, s.grossRevenue, s.adminCommission.toFixed(2), s.shopkeeperEarning.toFixed(2)]);
    } else if (reportType === 'delivery') {
      headers = ["Delivery Partner", "Successful Deliveries", "Total Earning (₹)"];
      rows = deliveryReports.map(d => [d.name, d.deliveriesCompleted, d.totalDeliveryEarning.toFixed(2)]);
    } else if (reportType === 'customer') {
      headers = ["Customer Email", "Total Orders", "Total Spent (₹)"];
      rows = customerReports.map(c => [c.email, c.totalOrders, c.totalSpent]);
    } else {
      headers = ["Order ID", "Customer Email", "Status", "Total Amount (₹)", "Date"];
      rows = recentOrders.map(o => [o.id, o.customer_email, o.status, o.total_amount, new Date(o.created_at).toLocaleDateString()]);
    }

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={22} /> Advanced Store & Entity Reports
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Generate period-based earnings powered by Cart-Value dynamic commission rules.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-stone-100 p-1 rounded-2xl gap-1">
            {['today', 'week', 'month', 'all'].map(d => (
              <button key={d} onClick={() => setDateRange(d)} className={`px-3 py-1.5 rounded-xl font-bold transition capitalize cursor-pointer ${dateRange === d ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}>{d}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="bg-stone-800 hover:bg-stone-900 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"><Download size={14} /> CSV</button>
            <button onClick={() => window.print()} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"><FileText size={14} /> PDF</button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs overflow-x-auto print:hidden">
        <button onClick={() => setReportType('overview')} className={`px-4 py-2.5 rounded-xl font-black transition cursor-pointer flex items-center gap-2 ${reportType === 'overview' ? 'bg-emerald-700 text-white shadow' : 'bg-stone-50 text-stone-700'}`}><TrendingUp size={15} /> Store Overview</button>
        <button onClick={() => setReportType('shopkeeper')} className={`px-4 py-2.5 rounded-xl font-black transition cursor-pointer flex items-center gap-2 ${reportType === 'shopkeeper' ? 'bg-emerald-700 text-white shadow' : 'bg-stone-50 text-stone-700'}`}><Store size={15} /> Shopkeeper Earnings</button>
        <button onClick={() => setReportType('delivery')} className={`px-4 py-2.5 rounded-xl font-black transition cursor-pointer flex items-center gap-2 ${reportType === 'delivery' ? 'bg-emerald-700 text-white shadow' : 'bg-stone-50 text-stone-700'}`}><Truck size={15} /> Delivery Earnings</button>
        <button onClick={() => setReportType('customer')} className={`px-4 py-2.5 rounded-xl font-black transition cursor-pointer flex items-center gap-2 ${reportType === 'customer' ? 'bg-emerald-700 text-white shadow' : 'bg-stone-50 text-stone-700'}`}><Users size={15} /> Customer Reports</button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-stone-400 bg-white rounded-3xl border">Compiling report analytics...</div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="hidden print:block border-b pb-4">
            <h1 className="text-xl font-black text-slate-900">Harraiya Market - Official Financial Report</h1>
            <p className="text-stone-500 text-[11px] capitalize">Report Type: {reportType} | Filter: {dateRange}</p>
          </div>

          {reportType === 'overview' && (
            <div className="space-y-6">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-700" /> General Store Performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border space-y-1">
                  <span className="text-stone-500 font-bold uppercase text-[10px]">Total Revenue</span>
                  <h3 className="text-xl font-black text-slate-900">₹{metrics.totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border space-y-1">
                  <span className="text-stone-500 font-bold uppercase text-[10px]">Total Orders</span>
                  <h3 className="text-xl font-black text-slate-900">{metrics.totalOrders}</h3>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border space-y-1">
                  <span className="text-stone-500 font-bold uppercase text-[10px]">Delivered</span>
                  <h3 className="text-xl font-black text-emerald-700">{metrics.deliveredOrders}</h3>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border space-y-1">
                  <span className="text-stone-500 font-bold uppercase text-[10px]">Pending / Cancelled</span>
                  <h3 className="text-xl font-black text-amber-600">{metrics.pendingOrders} / {metrics.cancelledOrders}</h3>
                </div>
              </div>
            </div>
          )}

          {reportType === 'shopkeeper' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2"><Store size={16} className="text-emerald-700" /> Shopkeeper Earnings & Commission</h3>
                <span className="text-[11px] text-stone-400 font-medium">Dynamically calculated using cart-value tiers</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">Gross Sales</th>
                    <th className="py-3 px-4">Avg Tier Rate</th>
                    <th className="py-3 px-4">Admin Cut</th>
                    <th className="py-3 px-4">Shopkeeper Net Payout</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-slate-800">
                  {shopkeeperReports.length === 0 ? <tr><td colSpan="6" className="py-6 text-center text-stone-400 italic">No shopkeeper sales recorded.</td></tr> : shopkeeperReports.map((sk, idx) => {
                    const effectiveRate = sk.grossRevenue ? ((sk.adminCommission / sk.grossRevenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="py-3 px-4 font-bold">{sk.storeName}</td>
                        <td className="py-3 px-4 font-medium">₹{sk.grossRevenue.toLocaleString()}</td>
                        <td className="py-3 px-4"><span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg font-bold border border-amber-200">~{effectiveRate}%</span></td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">₹{sk.adminCommission.toFixed(2)}</td>
                        <td className="py-3 px-4 font-black text-slate-900">₹{sk.shopkeeperEarning.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right print:hidden">
                          <button onClick={() => setActiveEntityModal({ type: 'shopkeeper', data: sk })} className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl font-bold cursor-pointer"><Eye size={13} className="inline mr-1" /> View PDF</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'delivery' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2"><Truck size={16} className="text-blue-600" /> Delivery Personnel Earnings</h3>
                <span className="text-[11px] text-stone-400 font-medium">Earnings based on dynamic cart percentage tiers</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Delivery Partner</th>
                    <th className="py-3 px-4">Successful Deliveries</th>
                    <th className="py-3 px-4">Total Earning</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-slate-800">
                  {deliveryReports.length === 0 ? <tr><td colSpan="4" className="py-6 text-center text-stone-400 italic">No delivery staff records.</td></tr> : deliveryReports.map((ds, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-3 px-4 font-bold">{ds.name}</td>
                      <td className="py-3 px-4">{ds.deliveriesCompleted} orders</td>
                      <td className="py-3 px-4 font-black text-blue-700">₹{ds.totalDeliveryEarning.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right print:hidden">
                        <button onClick={() => setActiveEntityModal({ type: 'delivery', data: ds })} className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl font-bold cursor-pointer"><Eye size={13} className="inline mr-1" /> View PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'customer' && (
            <div className="space-y-4">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2"><Users size={16} className="text-purple-600" /> Customer Activity</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Customer Email</th>
                    <th className="py-3 px-4">Total Orders</th>
                    <th className="py-3 px-4">Total Spent</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-slate-800">
                  {customerReports.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-3 px-4 font-bold">{cust.email}</td>
                      <td className="py-3 px-4">{cust.totalOrders} orders</td>
                      <td className="py-3 px-4 font-black text-purple-700">₹{cust.totalSpent.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right print:hidden">
                        <button onClick={() => setActiveEntityModal({ type: 'customer', data: cust })} className="bg-purple-50 text-purple-800 px-3 py-1.5 rounded-xl font-bold cursor-pointer"><Eye size={13} className="inline mr-1"/> View PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INDIVIDUAL ENTITY PDF STATEMENT MODAL */}
      {activeEntityModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Official Statement & Earnings PDF</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold cursor-pointer"><Printer size={14} className="inline mr-1"/> Print / Save</button>
                <button onClick={() => setActiveEntityModal(null)} className="p-1.5 bg-stone-100 rounded-full text-stone-600 cursor-pointer"><X size={16} /></button>
              </div>
            </div>

            <div className="space-y-6 p-2">
              <div className="text-center border-b pb-4 space-y-1">
                <h1 className="text-xl font-black text-slate-900">Harraiya Market Instant Store</h1>
                <p className="text-stone-500 text-[11px]">Period Earnings & Settlement Statement</p>
                <span className="inline-block mt-1 bg-stone-100 text-stone-700 font-bold px-3 py-0.5 rounded-full text-[10px] uppercase">Entity: {activeEntityModal.type}</span>
              </div>

              {activeEntityModal.type === 'shopkeeper' && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Store Name</span> <strong className="text-slate-900 text-sm">{activeEntityModal.data.storeName}</strong></div>
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Avg Tier Rate</span> <strong className="text-amber-700 text-sm">{activeEntityModal.data.grossRevenue ? ((activeEntityModal.data.adminCommission / activeEntityModal.data.grossRevenue) * 100).toFixed(1) : 0}%</strong></div>
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Gross Sales</span> <strong className="text-slate-900 text-sm">₹{activeEntityModal.data.grossRevenue.toLocaleString()}</strong></div>
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Net Earning Payout</span> <strong className="text-emerald-700 text-base">₹{activeEntityModal.data.shopkeeperEarning.toFixed(2)}</strong></div>
                </div>
              )}

              {activeEntityModal.type === 'delivery' && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Delivery Partner</span> <strong className="text-slate-900 text-sm">{activeEntityModal.data.name}</strong></div>
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Successful Deliveries</span> <strong className="text-blue-700 text-sm">{activeEntityModal.data.deliveriesCompleted} orders</strong></div>
                  <div className="col-span-2 pt-2 border-t border-blue-200">
                    <span className="text-stone-500 font-bold block uppercase text-[10px]">Total Delivery Earning Payout</span> 
                    <strong className="text-blue-800 text-lg">₹{activeEntityModal.data.totalDeliveryEarning.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              {activeEntityModal.type === 'customer' && (
                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Customer Email</span> <strong className="text-slate-900 text-sm">{activeEntityModal.data.email}</strong></div>
                  <div><span className="text-stone-500 font-bold block uppercase text-[10px]">Total Orders Placed</span> <strong className="text-purple-700 text-sm">{activeEntityModal.data.totalOrders}</strong></div>
                  <div className="col-span-2 pt-2 border-t border-purple-200">
                    <span className="text-stone-500 font-bold block uppercase text-[10px]">Total Amount Spent</span> 
                    <strong className="text-purple-800 text-lg">₹{activeEntityModal.data.totalSpent.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Itemized Period Breakdown</h4>
                
                {activeEntityModal.type === 'shopkeeper' && (
                  <table className="w-full text-left text-[11px] border rounded-2xl overflow-hidden">
                    <thead className="bg-stone-50 border-b text-stone-400"><tr><th className="p-2.5">Product</th><th className="p-2.5">Qty</th><th className="p-2.5">Tier % Applied</th><th className="p-2.5 text-right">Admin Cut</th><th className="p-2.5 text-right">Net Subtotal</th></tr></thead>
                    <tbody className="divide-y">
                      {activeEntityModal.data.items.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold">{item.productName || 'Item'}</td><td className="p-2.5">{item.qty}</td>
                          <td className="p-2.5 font-black text-amber-700">{item.appliedRate}%</td>
                          <td className="p-2.5 text-right text-rose-700 font-bold">-₹{item.adminCut.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">₹{(item.subtotal - item.adminCut).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeEntityModal.type === 'delivery' && (
                  <table className="w-full text-left text-[11px] border rounded-2xl overflow-hidden">
                    <thead className="bg-stone-50 border-b text-stone-400"><tr><th className="p-2.5">Order ID</th><th className="p-2.5">Address</th><th className="p-2.5">Tier % Applied</th><th className="p-2.5">Earned Fee</th></tr></thead>
                    <tbody className="divide-y">
                      {activeEntityModal.data.assignedOrders.map((ord, i) => (
                        <tr key={i}><td className="p-2.5 font-mono">#{ord.id.slice(0, 8)}</td><td className="p-2.5 truncate max-w-[150px]">{ord.delivery_address}</td><td className="p-2.5 font-black text-amber-700">{ord.appliedRate}%</td><td className="p-2.5 font-black text-blue-700">₹{ord.earnedFee.toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeEntityModal.type === 'customer' && (
                  <table className="w-full text-left text-[11px] border rounded-2xl overflow-hidden">
                    <thead className="bg-stone-50 border-b text-stone-400"><tr><th className="p-2.5">Order ID</th><th className="p-2.5">Status</th><th className="p-2.5">Amount</th></tr></thead>
                    <tbody className="divide-y">
                      {activeEntityModal.data.orders.map((ord, i) => (
                        <tr key={i}><td className="p-2.5 font-mono">#{ord.id.slice(0, 8)}</td><td className="p-2.5 uppercase font-bold text-[10px]">{ord.status}</td><td className="p-2.5 font-black">₹{ord.total_amount}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <button onClick={() => setActiveEntityModal(null)} className="print:hidden w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase text-xs cursor-pointer">Close Statement</button>
          </div>
        </div>
      )}
    </div>
  );
}