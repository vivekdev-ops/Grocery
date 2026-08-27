// src/components/Analytics.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, ShoppingBag, Users, DollarSign, Package, Filter, Store, Truck, TrendingUp, Award, Sparkles, AlertCircle, CheckCircle2, Eye, X, Mail, Phone, User } from 'lucide-react';

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    pendingOrders: 0
  });
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detailed Order Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailedOrderItems, setDetailedOrderItems] = useState([]);

  // Filter States
  const [filterType, setFilterType] = useState('all'); // 'all', 'date', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'delivered', 'pending', 'shipped', 'cancelled'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filterType, selectedDate, selectedMonth, selectedYear, statusFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ordRes, itemRes, shopRes, prodRes, staffRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, products(name, shopkeeper_id, price, image_url, images, gallery)'),
        supabase.from('shopkeeper_profiles').select('*'),
        supabase.from('products').select('*'),
        supabase.from('staff_profiles').select('*')
      ]);

      if (ordRes.data) setOrders(ordRes.data);
      if (itemRes.data) setOrderItems(itemRes.data);
      if (shopRes.data) setShopkeepers(shopRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (staffRes.data) setDeliveryBoys(staffRes.data);
    } catch (err) {
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...orders];

    if (filterType === 'date' && selectedDate) {
      result = result.filter(o => o.created_at.startsWith(selectedDate));
    } else if (filterType === 'month' && selectedMonth) {
      result = result.filter(o => o.created_at.startsWith(selectedMonth));
    } else if (filterType === 'year' && selectedYear) {
      result = result.filter(o => o.created_at.startsWith(selectedYear));
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter(o => o.status === 'pending' || o.status === 'processing');
      } else if (statusFilter === 'shipped') {
        result = result.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery');
      } else {
        result = result.filter(o => o.status === statusFilter);
      }
    }

    const totalRevenue = result.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0);
    const totalOrders = result.length;
    const pendingOrders = result.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const uniqueCustomers = new Set(result.map(o => o.customer_email).filter(Boolean)).size;

    setStats({
      totalRevenue,
      totalOrders,
      totalCustomers: uniqueCustomers,
      pendingOrders
    });

    setFilteredOrders(result);
  };

  const openOrderDetails = async (order) => {
    setSelectedOrderDetails(order);
    const { data, error } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', order.id);

    if (!error && data) {
      setDetailedOrderItems(data);
    } else {
      setDetailedOrderItems(order.order_items || []);
    }
  };

  // Robust helper to extract delivery agent name, email, and phone number
  const getAssignedAgent = (order) => {
    const agentId = order.delivery_agent_id || order.delivery_boy_id || order.staff_id;
    if (agentId) {
      const found = deliveryBoys.find(db => String(db.id).trim() === String(agentId).trim());
      if (found) {
        return {
          name: found.name || found.full_name || 'Delivery Staff',
          email: found.email || 'N/A',
          phone: found.phone || 'N/A'
        };
      }
    }
    if (order.delivery_person) {
      return {
        name: order.delivery_person,
        email: 'N/A',
        phone: 'N/A'
      };
    }
    return null;
  };

  const shopkeeperMetrics = shopkeepers.map(sk => {
    const skProducts = products.filter(p => String(p.shopkeeper_id).trim() === String(sk.id).trim());
    const skProductIds = skProducts.map(p => p.id);
    
    const relevantItems = orderItems.filter(item => skProductIds.includes(item.product_id));
    const revenue = relevantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalSold = relevantItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...sk,
      productCount: skProducts.length,
      revenue,
      totalSold
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const deliveryMetrics = deliveryBoys.map(db => {
    const assignedOrders = orders.filter(o => 
      String(o.delivery_agent_id).trim() === String(db.id).trim() ||
      String(o.delivery_boy_id).trim() === String(db.id).trim() || 
      String(o.staff_id).trim() === String(db.id).trim()
    );
    const deliveredCount = assignedOrders.filter(o => o.status === 'delivered').length;
    const activeCount = assignedOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'shipped' || o.status === 'processing').length;

    return {
      ...db,
      totalAssigned: assignedOrders.length,
      deliveredCount,
      activeCount
    };
  }).sort((a, b) => b.deliveredCount - a.deliveredCount);

  const productSalesMap = {};
  orders.forEach(order => {
    const items = orderItems.filter(item => item.order_id === order.id && order.status !== 'cancelled');
    items.forEach(item => {
      const prodName = item.products?.name || 'Unknown Product';
      if (!productSalesMap[prodName]) {
        productSalesMap[prodName] = { quantity: 0, revenue: 0, image: item.products?.image_url || (item.products?.images && item.products.images[0]) || '' };
      }
      productSalesMap[prodName].quantity += item.quantity;
      productSalesMap[prodName].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.entries(productSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const statusCounts = {
    delivered: orders.filter(o => o.status === 'delivered').length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const generateAIInsights = () => {
    const insights = [];
    const totalCount = orders.length;
    if (totalCount === 0) return [{ type: 'info', text: 'Insufficient order data to run AI diagnostics.' }];

    const cancellationRate = (statusCounts.cancelled / totalCount) * 100;
    const fulfillmentRate = (statusCounts.delivered / totalCount) * 100;

    if (cancellationRate > 10) {
      insights.push({
        type: 'warning',
        title: 'High Cancellation Alert',
        text: `Cancellation rate is currently at ${cancellationRate.toFixed(1)}%. Check inventory stock-outs or delivery delays.`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Healthy Order Fulfillment',
        text: `Order success rate is strong at ${fulfillmentRate.toFixed(1)}% delivered successfully.`
      });
    }

    if (stats.pendingOrders > 5) {
      insights.push({
        type: 'warning',
        title: 'Fulfillment Bottleneck',
        text: `You have ${stats.pendingOrders} pending orders awaiting processing. Assign staff immediately to maintain 10-minute delivery SLAs.`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Operations Flowing Smoothly',
        text: 'Pending queue is under control. Dark store operators are maintaining optimal dispatch times.'
      });
    }

    if (shopkeeperMetrics.length > 0) {
      const topStore = shopkeeperMetrics[0];
      insights.push({
        type: 'info',
        title: 'Top Performing Store',
        text: `"${topStore.store_name}" is leading revenue generation with ₹${topStore.revenue.toFixed(2)} total sales.`
      });
    }

    return insights;
  };

  if (loading) return <div className="text-center py-20 text-slate-500 font-medium">Loading dashboard analytics...</div>;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <LayoutDashboard size={24} className="text-emerald-700"/> Business Analytics & Insights
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time performance metrics, status filtering, and AI intelligence overview.</p>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-emerald-50/50 p-1.5 rounded-2xl border border-emerald-200">
            <span className="font-bold text-slate-500 pl-1">Status:</span>
            <select 
              className="bg-transparent font-bold text-slate-800 outline-none pr-2 cursor-pointer"
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-emerald-50/50 p-1.5 rounded-2xl border border-emerald-200">
            <Filter size={14} className="text-emerald-700 ml-1" />
            <select 
              className="bg-transparent font-bold text-slate-800 outline-none pr-2 cursor-pointer"
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="date">Filter by Date</option>
              <option value="month">Filter by Month</option>
              <option value="year">Filter by Year</option>
            </select>
          </div>

          {filterType === 'date' && (
            <input 
              type="date" 
              className="border border-emerald-200 p-2.5 rounded-2xl bg-white font-medium outline-none focus:border-emerald-600 text-slate-800 shadow-2xs"
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}

          {filterType === 'month' && (
            <input 
              type="month" 
              className="border border-emerald-200 p-2.5 rounded-2xl bg-white font-medium outline-none focus:border-emerald-600 text-slate-800 shadow-2xs"
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
            />
          )}

          {filterType === 'year' && (
            <select 
              className="border border-emerald-200 p-2.5 rounded-2xl bg-white font-bold text-slate-800 outline-none shadow-2xs"
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">₹{stats.totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Fulfillment</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pendingOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* AI Business Insights Intelligence Section */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">AI-Powered Business Intelligence</h3>
            <p className="text-[11px] text-emerald-300/80">Automated store health diagnostics and growth recommendations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {generateAIInsights().map((insight, idx) => (
            <div key={idx} className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
                {insight.type === 'warning' ? <AlertCircle size={14} className="text-amber-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                <span>{insight.title}</span>
              </div>
              <p className="text-emerald-100/90 leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Analyzers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Selling Products Analyzer */}
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
            <Award className="text-emerald-700" size={20} />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Top Selling Products</h3>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">No sales data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-emerald-50/30 rounded-2xl border border-emerald-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-700 bg-emerald-100 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">#{idx + 1}</span>
                    <img src={prod.image || ''} alt="" className="w-10 h-10 object-cover rounded-xl border border-emerald-200 bg-white" />
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{prod.name}</span>
                      <span className="text-slate-500 font-medium">Total Quantity Sold: <strong className="text-slate-800">{prod.quantity} units</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 text-sm block">₹{prod.revenue.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Revenue Generated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status Breakdown Analyzer */}
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
            <TrendingUp className="text-emerald-700" size={20} />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Order Status Breakdown</h3>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="font-bold text-emerald-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>Delivered</span>
              <span className="font-black text-emerald-800 text-sm">{statusCounts.delivered}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="font-bold text-amber-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Pending / Processing</span>
              <span className="font-black text-amber-800 text-sm">{statusCounts.pending}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="font-bold text-blue-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Shipped / Dispatched</span>
              <span className="font-black text-blue-800 text-sm">{statusCounts.shipped}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="font-bold text-rose-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Cancelled</span>
              <span className="font-black text-rose-800 text-sm">{statusCounts.cancelled}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Shopkeeper & Staff Performance Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Shopkeeper Performance Breakdown */}
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
            <Store className="text-emerald-700" size={20} />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Shopkeeper Store Performance</h3>
          </div>

          {shopkeeperMetrics.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">No shopkeeper profiles registered.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {shopkeeperMetrics.map(sk => (
                <div key={sk.id} className="flex justify-between items-center p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{sk.store_name}</span>
                    <span className="text-slate-500">{sk.productCount} products listed | {sk.totalSold} items sold</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 text-sm block">₹{sk.revenue.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Revenue</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff / Delivery Personnel Performance Breakdown */}
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
            <Truck className="text-emerald-700" size={20} />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Delivery Staff Performance</h3>
          </div>

          {deliveryMetrics.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">No staff profiles registered.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {deliveryMetrics.map(db => (
                <div key={db.id} className="flex justify-between items-center p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{db.name || db.full_name || db.email || 'Delivery Staff'}</span>
                    <span className="text-slate-500">Phone: {db.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="bg-emerald-100/60 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-900 block text-xs">{db.deliveredCount}</span>
                      <span className="text-[9px] text-emerald-700 uppercase font-semibold">Delivered</span>
                    </div>
                    <div className="bg-amber-100/60 px-2.5 py-1 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-900 block text-xs">{db.activeCount}</span>
                      <span className="text-[9px] text-amber-700 uppercase font-semibold">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Filtered Orders Table / Overview (Clickable to View Details) */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-base">Filtered Orders Overview ({filteredOrders.length})</h3>
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status: {statusFilter.toUpperCase()} | Click any order for full details</span>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-xs italic">No orders found for the selected filters.</p>
        ) : (
          <div className="divide-y divide-emerald-50 max-h-[400px] overflow-y-auto">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => openOrderDetails(order)}
                className="py-3.5 flex justify-between items-center text-xs hover:bg-emerald-50/40 px-3 rounded-2xl transition cursor-pointer group"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition">#{order.id.slice(0,8)}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{order.customer_email || 'Guest'} • {new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900 text-sm">₹{order.total_amount.toFixed(2)}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                  </span>
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-700 group-hover:text-white transition">
                    <Eye size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED ORDER INSPECTION MODAL (WITH COMPLETE AGENT NAME, EMAIL & PHONE) */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                Order #{selectedOrderDetails.id.slice(0, 8)} Full Details
              </h3>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 transition">
                <X size={16}/>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Order Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                  selectedOrderDetails.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  selectedOrderDetails.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedOrderDetails.status}
                </span>
              </div>

              {selectedOrderDetails.otp && (
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex justify-between items-center">
                  <span className="text-emerald-900 font-bold">Delivery Verification OTP:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm tracking-widest bg-white px-3 py-1 rounded-xl border border-emerald-200">
                    {selectedOrderDetails.otp}
                  </span>
                </div>
              )}

              {/* ASSIGNED DELIVERY AGENT COMPLETE DETAILS (NAME, EMAIL, PHONE) */}
              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 space-y-2">
                <p className="text-blue-900 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Truck size={14} className="text-blue-700" /> Assigned Delivery Agent
                </p>
                {getAssignedAgent(selectedOrderDetails) ? (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <User size={13} className="text-blue-600 shrink-0" />
                      <span>{getAssignedAgent(selectedOrderDetails).name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <Mail size={13} className="text-blue-600 shrink-0" />
                      <span>{getAssignedAgent(selectedOrderDetails).email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 font-mono text-xs">
                      <Phone size={13} className="text-blue-600 shrink-0" />
                      <span>{getAssignedAgent(selectedOrderDetails).phone}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">No delivery agent assigned yet.</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Ordered Line Items</span>
                <div className="space-y-2 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100 max-h-48 overflow-y-auto">
                  {detailedOrderItems.map(item => {
                    const p = item.products || {};
                    const itemImgs = p.images || p.gallery || [p.image_url].filter(Boolean);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-emerald-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <img src={itemImgs[0] || ''} alt="" className="w-10 h-10 object-cover rounded-xl border border-emerald-200 bg-white shrink-0" />
                          <div>
                            <span className="font-black text-slate-900 block line-clamp-1">{p.name || 'Product'}</span>
                            <span className="text-slate-500 font-medium text-[11px]">Qty: {item.quantity} • ₹{item.price * item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Customer & Delivery Address</p>
                <p className="text-slate-900 font-bold">{selectedOrderDetails.customer_email || 'Guest'}</p>
                <p className="text-slate-800 font-medium leading-snug mt-0.5">{selectedOrderDetails.delivery_address}</p>
                <p className="text-slate-500 font-mono text-[11px] pt-0.5">Phone: {selectedOrderDetails.phone || 'N/A'}</p>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex justify-between items-center font-black text-sm text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">₹{selectedOrderDetails.total_amount}</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedOrderDetails(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase"
            >
              Close Details
            </button>

          </div>
        </div>
      )}

    </div>
  );
}