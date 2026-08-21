// src/components/Analytics.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, ShoppingBag, Users, DollarSign, Package, Filter, Store, Truck } from 'lucide-react';

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

  // Filter States
  const [filterType, setFilterType] = useState('all'); // 'all', 'date', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filterType, selectedDate, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ordRes, itemRes, shopRes, prodRes, staffRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, products(name, shopkeeper_id, price)'),
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

  // Compute Shopkeeper Performance Metrics
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
  });

  // Compute Delivery Boy / Staff Performance Metrics
  const deliveryMetrics = deliveryBoys.map(db => {
    const assignedOrders = orders.filter(o => 
      o.delivery_boy_id === db.id || 
      o.staff_id === db.id || 
      o.delivery_partner_id === db.id || 
      o.assigned_to === db.id || 
      o.delivery_person === db.name ||
      o.delivery_person === db.full_name
    );
    const deliveredCount = assignedOrders.filter(o => o.status === 'delivered').length;
    const activeCount = assignedOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'shipped').length;

    return {
      ...db,
      totalAssigned: assignedOrders.length,
      deliveredCount,
      activeCount
    };
  });

  if (loading) return <div className="text-center py-20 text-gray-500 font-medium">Loading dashboard analytics...</div>;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><LayoutDashboard size={24} className="text-green-600"/> Business Dashboard</h2>
          <p className="text-xs text-gray-500 mt-1">Real-time performance metrics, store overview, and staff tracking.</p>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border">
            <Filter size={14} className="text-gray-400 ml-1" />
            <select 
              className="bg-transparent font-bold text-gray-700 outline-none pr-2"
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
              className="border p-2 rounded-xl bg-gray-50 font-medium outline-none focus:border-green-600"
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}

          {filterType === 'month' && (
            <input 
              type="month" 
              className="border p-2 rounded-xl bg-gray-50 font-medium outline-none focus:border-green-600"
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
            />
          )}

          {filterType === 'year' && (
            <select 
              className="border p-2 rounded-xl bg-gray-50 font-bold text-gray-700 outline-none"
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
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">₹{stats.totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalCustomers}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending Fulfillment</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pendingOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* Shopkeeper & Staff Performance Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Shopkeeper Performance Breakdown */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Store className="text-emerald-600" size={20} />
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Shopkeeper Store Performance</h3>
          </div>

          {shopkeeperMetrics.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">No shopkeeper profiles registered.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {shopkeeperMetrics.map(sk => (
                <div key={sk.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">{sk.store_name}</span>
                    <span className="text-gray-400">{sk.productCount} products listed | {sk.totalSold} items sold</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 text-sm block">₹{sk.revenue.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Revenue</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff / Delivery Personnel Performance Breakdown */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Truck className="text-blue-600" size={20} />
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Delivery Staff Performance</h3>
          </div>

          {deliveryMetrics.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">No staff profiles registered.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {deliveryMetrics.map(db => (
                <div key={db.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">{db.name || db.full_name || db.email || 'Delivery Staff'}</span>
                    <span className="text-gray-400">Phone: {db.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="bg-blue-50 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-blue-800 block text-xs">{db.deliveredCount}</span>
                      <span className="text-[9px] text-blue-600 uppercase font-semibold">Delivered</span>
                    </div>
                    <div className="bg-amber-50 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-amber-800 block text-xs">{db.activeCount}</span>
                      <span className="text-[9px] text-amber-600 uppercase font-semibold">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Filtered Orders Table / Overview */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-base">Filtered Orders Overview ({filteredOrders.length})</h3>
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Showing results for: {filterType.toUpperCase()}</span>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-xs italic">No orders found for the selected time filter.</p>
        ) : (
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {filteredOrders.map(order => (
              <div key={order.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-gray-900">#{order.id.slice(0,8)}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">{order.customer_email || 'Guest'} • {new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-gray-900 text-sm">₹{order.total_amount.toFixed(2)}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}