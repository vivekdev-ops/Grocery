// src/components/ShopkeeperPortal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, DollarSign, ShoppingCart, Store, Trash2, Edit, CheckCircle, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ShopkeeperPortal() {
  const [session, setSession] = useState(null);
  const [shopkeeperProfile, setShopkeeperProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Add/Edit Product Form State
  const [productForm, setProductForm] = useState({ name: '', price: '', mrp: '', stock: '', category_id: '', image_url: '' });
  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchShopkeeperData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchShopkeeperData(session.user.id);
      }
    });

    fetchCategories();
    return () => subscription.unsubscribe();
  }, []);

  const fetchShopkeeperData = async (userId) => {
    setLoading(true);
    try {
      // 1. Fetch Shopkeeper Profile
      const { data: profileData, error: profileError } = await supabase
        .from('shopkeeper_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        alert("Shopkeeper profile not found for this account.");
        setLoading(false);
        return;
      }
      setShopkeeperProfile(profileData);

      // 2. Fetch Products added ONLY by this shopkeeper
      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('shopkeeper_id', userId)
        .order('name');
      setProducts(prodData || []);

      // 3. Fetch Orders containing items from this shopkeeper's products
      const productIds = (prodData || []).map(p => p.id);
      if (productIds.length > 0) {
        const { data: itemData } = await supabase
          .from('order_items')
          .select('*, orders(*), products(name, shopkeeper_id)')
          .in('product_id', productIds);

        const uniqueOrdersMap = new Map();
        (itemData || []).forEach(item => {
          if (item.orders) {
            if (!uniqueOrdersMap.has(item.orders.id)) {
              uniqueOrdersMap.set(item.orders.id, { ...item.orders, items: [] });
            }
            uniqueOrdersMap.get(item.orders.id).items.push(item);
          }
        });
        setOrders(Array.from(uniqueOrdersMap.values()));
      } else {
        setOrders([]);
      }

    } catch (err) {
      console.error('Error fetching shopkeeper data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!session || !shopkeeperProfile) return;

    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      mrp: productForm.mrp ? parseFloat(productForm.mrp) : null,
      stock: parseInt(productForm.stock),
      shopkeeper_id: session.user.id,
      approval_status: 'approved'
    };

    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId);
      if (error) alert('Failed to update product: ' + error.message);
      else {
        setEditingId(null);
        setProductForm({ name: '', price: '', mrp: '', stock: '', category_id: '', image_url: '' });
        fetchShopkeeperData(session.user.id);
      }
    } else {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) alert('Failed to add product: ' + error.message);
      else {
        setProductForm({ name: '', price: '', mrp: '', stock: '', category_id: '', image_url: '' });
        fetchShopkeeperData(session.user.id);
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error && session) fetchShopkeeperData(session.user.id);
  };

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const shopkeeperOrderTotal = o.items
        ?.filter(item => item.products?.shopkeeper_id === session?.user?.id)
        .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
      return sum + shopkeeperOrderTotal;
    }, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading store dashboard...</div>;
  if (!session) return <div className="text-center py-20"><p>Please log in as a shopkeeper.</p><button onClick={() => navigate('/login')} className="mt-4 bg-brand-700 text-white px-6 py-2 rounded-xl">Login</button></div>;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-lg font-black text-brand-700">{shopkeeperProfile?.store_name || 'My Store'}</h1>
          <p className="text-xs text-stone-500 truncate mt-0.5">{session.user.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'dashboard' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Store size={18} /> Dashboard & Stats
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'products' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Package size={18} /> My Products ({products.length})
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'orders' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
            <ShoppingCart size={18} /> My Store Orders ({orders.length})
          </button>
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition">
            <Store size={18} /> View Storefront
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Store Performance Dashboard</h2>
              <p className="text-xs text-stone-500 mt-0.5">Overview of your catalog, revenue, and active orders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                    <DollarSign size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-stone-900">₹{totalRevenue.toFixed(2)}</h3>
                <p className="text-xs text-emerald-600 font-medium">From delivered store items</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">My Products</span>
                  <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center font-bold">
                    <Package size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-stone-900">{products.length}</h3>
                <p className="text-xs text-stone-500">Active items in catalog</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Store Orders</span>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                    <ShoppingCart size={20} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-stone-900">{orders.length}</h3>
                <p className="text-xs text-stone-500">Total customer orders</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Manage My Products</h2>
              <p className="text-xs text-stone-500 mt-0.5">Add, edit, or remove items belonging exclusively to your store.</p>
            </div>

            {/* Add / Edit Product Form */}
            <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                <Plus size={16} /> {editingId ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Product Name</label>
                  <input type="text" required className="w-full border border-stone-200 p-2.5 rounded-xl text-sm bg-stone-50" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
                  <select required className="w-full border border-stone-200 p-2.5 rounded-xl text-sm bg-stone-50" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Price (₹)</label>
                  <input type="number" step="0.01" required className="w-full border border-stone-200 p-2.5 rounded-xl text-sm bg-stone-50" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Stock Quantity</label>
                  <input type="number" required className="w-full border border-stone-200 p-2.5 rounded-xl text-sm bg-stone-50" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Image URL</label>
                <input type="url" placeholder="https://..." className="w-full border border-stone-200 p-2.5 rounded-xl text-sm bg-stone-50" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md">
                  {editingId ? 'Update Product' : 'Add Product'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setProductForm({ name: '', price: '', mrp: '', stock: '', category_id: '', image_url: '' }); }} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-4 py-2.5 rounded-xl text-xs">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Products List */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
              <h3 className="font-bold text-sm text-stone-900">Your Product Catalog</h3>
              {products.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-8">You haven't added any products yet.</p>
              ) : (
                <div className="space-y-3">
                  {products.map(prod => (
                    <div key={prod.id} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={prod.image_url || '/placeholder.png'} alt="" className="w-12 h-12 object-cover rounded-xl bg-white border" />
                        <div>
                          <span className="font-bold text-stone-900 block text-sm">{prod.name}</span>
                          <span className="text-stone-500">Stock: {prod.stock} | Price: ₹{prod.price?.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(prod.id); setProductForm({ name: prod.name, price: prod.price, mrp: prod.mrp || '', stock: prod.stock, category_id: prod.category_id || '', image_url: prod.image_url || '' }); }} className="p-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-stone-700"><Edit size={14}/></button>
                        <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Store Orders</h2>
              <p className="text-xs text-stone-500 mt-0.5">Orders containing items from your catalog.</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-stone-400">No orders received for your store items yet.</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                      <div>
                        <span className="font-mono font-bold text-stone-800">Order #{order.id.slice(0, 8)}</span>
                        <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase">Customer Items in this Order:</p>
                      {order.items
                        ?.filter(item => item.products?.shopkeeper_id === session?.user?.id)
                        .map(item => (
                          <div key={item.id} className="flex justify-between items-center text-xs bg-stone-50 p-2.5 rounded-xl">
                            <span className="font-medium text-stone-800">{item.products?.name || 'Product'} × {item.quantity}</span>
                            <span className="font-bold text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                      <span className="text-stone-500">Delivery Address: {order.delivery_address}</span>
                      <span className="font-bold text-stone-900">Phone: {order.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}