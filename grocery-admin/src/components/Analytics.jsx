// src/components/Analytics.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShoppingBag, Package, Store, Users, TrendingUp, Clock, CheckCircle2, 
  Truck, XCircle, ArrowUpRight, Loader2, Eye, ChevronLeft, ChevronRight, AlertTriangle, Calendar 
} from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState({
    totalShops: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalDeliveryBoys: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    pickup: 0,
    onTheWay: 0,
    delivered: 0,
    cancelled: 0,
    totalEarning: 0,
    alreadyWithdraw: 0,
    pendingWithdraw: 0,
    totalCommission: 0,
    rejectedWithdraw: 0
  });

  const [orders, setOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Statistics Filter State: 'Daily' | 'Monthly' | 'Yearly' | 'Custom'
  const [statFilter, setStatFilter] = useState('Daily');
  const [customDate, setCustomDate] = useState('');

  // Pagination for Order Summary
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { count: shopsCount },
        { count: productsCount },
        { count: customersCount },
        { data: ordersData },
        { data: productsData },
        { data: shopsData },
        { data: deliveryData }
      ] = await Promise.all([
        supabase.from('shopkeeper_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customer_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select(`
          *,
          product_variants(price, mrp, stock),
          variants(price, mrp, stock),
          shopkeeper_profiles(shop_name, owner_name)
        `).order('created_at', { ascending: false }),
        supabase.from('shopkeeper_profiles').select('*'),
        supabase.from('delivery_boys').select('*')
      ]);

      const allOrders = ordersData || [];
      const allProducts = productsData || [];
      const allShops = shopsData || [];
      const allDelivery = deliveryData || [];

      // Status breakdown
      const pending = allOrders.filter(o => o.status === 'pending').length;
      const confirmed = allOrders.filter(o => o.status === 'confirmed' || o.status === 'accepted').length;
      const processing = allOrders.filter(o => o.status === 'processing').length;
      const pickup = allOrders.filter(o => o.status === 'ready_for_pickup' || o.status === 'pickup').length;
      const onTheWay = allOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'on_the_way').length;
      const delivered = allOrders.filter(o => o.status === 'delivered').length;
      const cancelled = allOrders.filter(o => o.status === 'cancelled').length;

      const totalEarning = allOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0);

      setStats({
        totalShops: allShops.length,
        totalProducts: allProducts.length,
        totalOrders: allOrders.length,
        totalCustomers: customersCount || 0,
        totalDeliveryBoys: allDelivery.length,
        pending,
        confirmed,
        processing,
        pickup,
        onTheWay,
        delivered,
        cancelled,
        totalEarning,
        alreadyWithdraw: 0,
        pendingWithdraw: 0,
        totalCommission: Number((totalEarning * 0.1).toFixed(2)),
        rejectedWithdraw: 0
      });

      setOrders(allOrders);
      setRecentProducts(allProducts.slice(0, 5));
      setShops(allShops);
      setDeliveryBoys(allDelivery);
      setLowStockProducts(allProducts.filter(p => {
        const variants = p.product_variants || p.variants || [];
        const stock = variants.length > 0 ? Number(variants[0].stock || 0) : Number(p.stock || 5);
        return stock < 5;
      }));
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered orders for Statistics Overview based on 'Daily', 'Monthly', 'Yearly', or 'Custom'
  const getFilteredOrdersForStats = () => {
    const now = new Date();
    return orders.filter(o => {
      const orderDate = new Date(o.created_at || Date.now());
      if (statFilter === 'Daily') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (statFilter === 'Monthly') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      if (statFilter === 'Yearly') {
        return orderDate.getFullYear() === now.getFullYear();
      }
      if (statFilter === 'Custom' && customDate) {
        return orderDate.toISOString().split('T')[0] === customDate;
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrdersForStats();
  const filteredTotalOrders = filteredOrders.length;
  const filteredPending = filteredOrders.filter(o => o.status === 'pending').length;
  const filteredConfirmed = filteredOrders.filter(o => o.status === 'confirmed' || o.status === 'accepted').length;
  const filteredProcessing = filteredOrders.filter(o => o.status === 'processing').length;
  const filteredPickup = filteredOrders.filter(o => o.status === 'ready_for_pickup' || o.status === 'pickup').length;
  const filteredOnTheWay = filteredOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'on_the_way').length;
  const filteredDelivered = filteredOrders.filter(o => o.status === 'delivered').length;
  const filteredCancelled = filteredOrders.filter(o => o.status === 'cancelled').length;

  // Pagination Logic for Order Summary
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage) || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <span className="text-stone-500 font-bold text-xs">Loading analytics and stats...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs text-stone-800 pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">Welcome Back, Super Admin</h1>
          <p className="text-[11px] text-stone-400 font-medium">Live business analytics, orders, inventory and delivery overview.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] uppercase tracking-wider"
        >
          Refresh Data
        </button>
      </div>

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">{stats.totalShops}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Shops</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center"><Store size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">{stats.totalDeliveryBoys}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Delivery Boys</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Truck size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">{stats.totalProducts}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Products</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center"><Package size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">{stats.totalOrders}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Orders</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><ShoppingBag size={18} /></div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">{stats.totalCustomers}</p>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Customers</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Users size={18} /></div>
        </div>
      </div>

      {/* Order Analytics Status Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
        <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Order Analytics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Pending</p><p className="text-lg font-black text-stone-800">{stats.pending}</p></div>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Confirm</p><p className="text-lg font-black text-stone-800">{stats.confirmed}</p></div>
            <CheckCircle2 size={16} className="text-sky-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Processing</p><p className="text-lg font-black text-stone-800">{stats.processing}</p></div>
            <Package size={16} className="text-indigo-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Pickup</p><p className="text-lg font-black text-stone-800">{stats.pickup}</p></div>
            <Store size={16} className="text-violet-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">On The Way</p><p className="text-lg font-black text-stone-800">{stats.onTheWay}</p></div>
            <Truck size={16} className="text-blue-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Delivered</p><p className="text-lg font-black text-stone-800">{stats.delivered}</p></div>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-stone-400 uppercase">Cancelled</p><p className="text-lg font-black text-stone-800">{stats.cancelled}</p></div>
            <XCircle size={16} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* Statistics Graph Section with Daily, Monthly, Yearly, and Custom Date Filters */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Orders Statistics Overview</h3>
            <p className="text-[10px] text-stone-400 font-bold">Showing orders volume for: <span className="text-emerald-600 font-black">{statFilter} {statFilter === 'Custom' && customDate ? `(${customDate})` : ''}</span></p>
          </div>

          {/* Filter Buttons & Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl">
              {['Daily', 'Monthly', 'Yearly', 'Custom'].map((filterName) => (
                <button
                  key={filterName}
                  onClick={() => setStatFilter(filterName)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[10px] transition cursor-pointer ${
                    statFilter === filterName ? 'bg-emerald-500 text-white shadow-sm' : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  {filterName}
                </button>
              ))}
            </div>

            {statFilter === 'Custom' && (
              <input 
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-stone-800 outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>

        <div className="h-52 w-full bg-stone-50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center p-4">
          <div className="w-full flex items-end justify-around h-36 px-4 gap-2">
            {[
              { label: 'Pending', count: filteredPending, color: 'bg-amber-400' },
              { label: 'Confirmed', count: filteredConfirmed, color: 'bg-sky-400' },
              { label: 'Processing', count: filteredProcessing, color: 'bg-indigo-400' },
              { label: 'Pickup', count: filteredPickup, color: 'bg-violet-400' },
              { label: 'On Way', count: filteredOnTheWay, color: 'bg-blue-500' },
              { label: 'Delivered', count: filteredDelivered, color: 'bg-emerald-500' },
              { label: 'Cancelled', count: filteredCancelled, color: 'bg-rose-400' }
            ].map((bar, i) => {
              const heightPercent = Math.min(Math.max((bar.count / (filteredTotalOrders || 1)) * 100, 15), 100);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                  <span className="text-[10px] font-black text-stone-600">{bar.count}</span>
                  <div style={{ height: `${heightPercent}%` }} className={`w-full max-w-[36px] rounded-t-xl ${bar.color} transition-all duration-500 shadow-sm`} />
                  <span className="text-[9px] font-bold text-stone-400 truncate w-full text-center">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Summary Table with Pagination & View Details */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Order Summary (Latest Orders)</h3>
          <span className="text-stone-400 font-bold text-[10px]">Showing {orders.length > 0 ? indexOfFirstOrder + 1 : 0}-{Math.min(indexOfLastOrder, orders.length)} of {orders.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 font-medium text-stone-700">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-stone-400 font-bold">No orders found in database.</td>
                </tr>
              ) : (
                currentOrders.map((order, idx) => (
                  <tr key={order.id || idx} className="hover:bg-stone-50/80 transition">
                    <td className="py-3.5 px-4 font-black text-emerald-600">#{order.id?.slice(0, 8)}</td>
                    <td className="py-3.5 px-4 font-bold">{order.items?.length || 1} items</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">₹{Number(order.total_amount || order.total || 0).toFixed(0)}</td>
                    <td className="py-3.5 px-4 text-stone-400">{new Date(order.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block
                        ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}
                      >
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-stone-100 hover:bg-emerald-500 hover:text-white text-stone-700 p-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1 font-bold text-[10px]"
                        title="View Details"
                      >
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-stone-500 font-bold">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Grid Sections: Registered Shops with Shopkeeper, Delivery Boys, Low Stock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Registered Shops & Shopkeeper */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Registered Shops & Shopkeepers</span>
            <Store size={15} className="text-purple-600" />
          </h4>
          <div className="space-y-3">
            {shops.length === 0 ? (
              <p className="text-stone-400 font-bold py-4 text-center">No shops registered.</p>
            ) : (
              shops.map((shop, i) => (
                <div key={shop.id || i} className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{shop.shop_name || shop.name || 'Store'}</span>
                    <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-lg">Active</span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-bold">Shopkeeper: <span className="text-emerald-700">{shop.owner_name || shop.contact_person || 'Admin / Vendor'}</span></p>
                  <p className="text-[10px] text-stone-400 truncate">Phone: {shop.phone || shop.contact || 'N/A'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Boys Section */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Delivery Personnel</span>
            <Truck size={15} className="text-blue-600" />
          </h4>
          <div className="space-y-3">
            {deliveryBoys.length === 0 ? (
              <p className="text-stone-400 font-bold py-4 text-center">No delivery boys registered.</p>
            ) : (
              deliveryBoys.map((boy, i) => (
                <div key={boy.id || i} className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{boy.name || boy.full_name || 'Delivery Partner'}</span>
                    <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">Available</span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-bold">Phone: <span className="text-stone-800">{boy.phone || 'N/A'}</span></p>
                  <p className="text-[10px] text-stone-400">Vehicle: {boy.vehicle_info || 'Bike / Scooter'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert Section (< 5) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
          <h4 className="font-black text-rose-600 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Low Stock Alert (&lt; 5)</span>
            <AlertTriangle size={15} className="text-rose-500" />
          </h4>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-stone-400 font-bold">All inventory levels are healthy!</div>
            ) : (
              lowStockProducts.map((prod, i) => {
                const variants = prod.product_variants || prod.variants || [];
                const stockVal = variants.length > 0 ? variants[0].stock : prod.stock;
                return (
                  <div key={prod.id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                        <img src={prod.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=80'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-stone-900 truncate">{prod.name}</span>
                    </div>
                    <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-lg shrink-0">Stock: {stockVal ?? 0}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Recently Added Products showing MRP, Selling Price, and Added By */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-4">
        <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">Recently Added Products & Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {recentProducts.length === 0 ? (
            <p className="text-stone-400 font-bold py-4">No products found.</p>
          ) : (
            recentProducts.map((prod, i) => {
              const variants = prod.product_variants || prod.variants || [];
              const firstVariant = variants.length > 0 ? variants[0] : null;
              
              const sellingPrice = Number(firstVariant?.price ?? prod.price ?? prod.selling_price ?? 0);
              const mrpPrice = Number(firstVariant?.mrp ?? prod.mrp ?? 0);
              const shopkeeperName = prod.shopkeeper_profiles?.shop_name || prod.shopkeeper_profiles?.owner_name || prod.shop_name || prod.shopkeeper_name || 'Store Admin';

              return (
                <div key={prod.id || i} className="bg-stone-50 p-3 rounded-2xl border border-stone-200/60 flex flex-col justify-between space-y-2">
                  <div className="w-full aspect-square bg-white rounded-xl overflow-hidden border border-stone-200/50 flex items-center justify-center">
                    <img src={prod.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 truncate">{prod.name}</h5>
                    <p className="text-[10px] text-stone-400 font-bold truncate">By: <span className="text-emerald-700">{shopkeeperName}</span></p>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-stone-200/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-slate-900 text-sm">₹{sellingPrice}</span>
                      {mrpPrice > sellingPrice && (
                        <span className="text-[10px] text-stone-400 line-through font-bold">₹{mrpPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">Order Details #{selectedOrder.id?.slice(0, 8)}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 font-black text-stone-600 flex items-center justify-center cursor-pointer">✕</button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 font-bold">Status:</span>
                <span className="font-black uppercase text-emerald-600">{selectedOrder.status}</span>
              </div>
              <div className="flex justify-between bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 font-bold">Date:</span>
                <span className="font-bold text-stone-800">{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 font-bold">Total Amount:</span>
                <span className="font-black text-slate-900">₹{selectedOrder.total_amount || selectedOrder.total || 0}</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="font-black text-stone-400 uppercase text-[10px]">Ordered Items</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-stone-50 px-3 py-2 rounded-xl">
                      <span className="font-bold text-stone-800 truncate pr-2">{item.name || 'Product'} (x{item.quantity || 1})</span>
                      <span className="font-black text-slate-900">₹{(item.price || 0) * (item.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs transition cursor-pointer shadow-md"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}