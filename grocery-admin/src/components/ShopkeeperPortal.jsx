// src/components/ShopkeeperPortal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, DollarSign, ShoppingCart, Store, Trash2, Edit, CheckCircle, Clock, LogOut, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ShopkeeperPortal() {
  const [session, setSession] = useState(null);
  const [shopkeeperProfile, setShopkeeperProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [productForm, setProductForm] = useState({ 
    name: '', 
    price: '', 
    mrp: '', 
    stock: '', 
    category_id: '', 
    description: '',
    image_url: '' 
  });
  
  const [galleryImages, setGalleryImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchOrCreateShopkeeperProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchOrCreateShopkeeperProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    fetchCategories();
    return () => subscription.unsubscribe();
  }, []);

  const fetchOrCreateShopkeeperProfile = async (user) => {
    setLoading(true);
    try {
      // Check profile by user_id or id
      let { data: profileData } = await supabase
        .from('shopkeeper_profiles')
        .select('*')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profileData) {
        const newProfile = {
          id: user.id,
          user_id: user.id, // Providing user_id to satisfy the column constraint
          store_name: user.email.split('@')[0] + "'s Store"
        };
        const { data: insertedProfile, error: insertErr } = await supabase
          .from('shopkeeper_profiles')
          .insert([newProfile])
          .select()
          .single();
        
        if (insertErr) {
          console.error("Error creating shopkeeper profile:", insertErr.message);
        }
        profileData = insertedProfile || newProfile;
      }

      setShopkeeperProfile(profileData);
      await fetchStoreData(profileData?.id || user.id);
    } catch (err) {
      console.error('Error handling profile:', err);
      setShopkeeperProfile({ id: user.id, store_name: 'My Store' });
      await fetchStoreData(user.id);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreData = async (storeId) => {
    const { data: prodData } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('shopkeeper_id', storeId)
      .order('name');
    setProducts(prodData || []);

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
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    let uploadedUrls = [...galleryImages];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) {
        console.error('Storage upload error:', uploadError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }

    setGalleryImages(uploadedUrls);
    if (!productForm.image_url && uploadedUrls.length > 0) {
      setProductForm(prev => ({ ...prev, image_url: uploadedUrls[0] }));
    }
  };

  const addVariantTier = () => {
    setVariants(prev => [...prev, { unit_label: '', price: '', mrp: '', stock: '' }]);
  };

  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!session) {
      alert("Session missing. Please log in again.");
      navigate('/login');
      return;
    }

    const targetShopkeeperId = shopkeeperProfile?.id || session.user.id;

    const payload = {
      name: productForm.name,
      price: parseFloat(productForm.price),
      mrp: productForm.mrp ? parseFloat(productForm.mrp) : null,
      stock: parseInt(productForm.stock),
      category_id: productForm.category_id || null,
      description: productForm.description || null,
      image_url: productForm.image_url || galleryImages[0] || null,
      gallery: galleryImages,
      images: galleryImages,
      variants: variants,
      shopkeeper_id: targetShopkeeperId,
      approval_status: 'pending' 
    };

    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId);
      if (error) alert('Failed to update product: ' + error.message);
      else {
        resetForm();
        fetchStoreData(targetShopkeeperId);
        alert('Product updated successfully!');
      }
    } else {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) alert('Failed to add product: ' + error.message);
      else {
        resetForm();
        fetchStoreData(targetShopkeeperId);
        alert('Product submitted successfully! Pending admin approval.');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setProductForm({ name: '', price: '', mrp: '', stock: '', category_id: '', description: '', image_url: '' });
    setGalleryImages([]);
    setVariants([]);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error && session) fetchStoreData(shopkeeperProfile?.id || session.user.id);
  };

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const shopkeeperOrderTotal = o.items
        ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
        .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
      return sum + shopkeeperOrderTotal;
    }, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading store dashboard...</div>;
  if (!session) return <div className="text-center py-20"><p>Please log in as a shopkeeper.</p><button onClick={() => navigate('/login')} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl">Login</button></div>;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-lg font-black text-emerald-600">{shopkeeperProfile?.store_name || 'My Store'}</h1>
          <p className="text-xs text-stone-500 truncate mt-0.5">{session.user.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Store size={18} /> Dashboard & Stats
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'products' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Package size={18} /> My Products ({products.length})
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}>
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
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
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

            {/* Add / Edit Product Form matching Admin Module UI */}
            <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-stone-800 flex items-center gap-2 border-b pb-3">
                <Plus size={16} /> {editingId ? 'Edit Product & Gallery' : 'Add Product & Gallery'}
              </h3>
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Product Name</label>
                  <input type="text" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium" placeholder="e.g. Organic Milk" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Base Price (₹)</label>
                  <input type="number" step="0.01" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium" placeholder="0.00" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium" placeholder="0.00" value={productForm.mrp} onChange={e => setProductForm({...productForm, mrp: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Base Stock</label>
                  <input type="number" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium" placeholder="Available units" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Select Category</label>
                  <select required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium cursor-pointer" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Browse & Upload Multiple Images */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">Browse & Upload Multiple Images</label>
                <div className="border-2 border-dashed border-stone-200 rounded-3xl p-6 text-center bg-stone-50/50 hover:bg-stone-50 transition relative">
                  <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="space-y-1">
                    <Upload className="mx-auto text-stone-400" size={24} />
                    <p className="text-xs font-bold text-stone-700">Select multiple files from your device to form the product gallery.</p>
                    <p className="text-[10px] text-stone-400">Supports PNG, JPG, WebP</p>
                  </div>
                </div>

                {galleryImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border shadow-2xs group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-[10px]"><X size={10}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea rows="3" className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium" placeholder="Product details, ingredients, or specifications..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              </div>

              {/* Product Variants */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">Product Variants (e.g. 500g, 1kg, 5L)</h4>
                    <p className="text-[10px] text-stone-400">Add custom packaging sizes with individual pricing and stock.</p>
                  </div>
                  <button type="button" onClick={addVariantTier} className="bg-stone-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shadow-2xs hover:bg-stone-800 transition">
                    <Plus size={14} /> Add Variant Tier
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-xs text-stone-400 italic bg-stone-50 p-4 rounded-2xl border text-center">No pack variants added.</p>
                ) : (
                  <div className="space-y-3">
                    {variants.map((v, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-stone-50 p-3 rounded-2xl border">
                        <input type="text" placeholder="Size (e.g. 500g)" className="border bg-white p-2 rounded-xl text-xs font-medium outline-none" value={v.unit_label} onChange={e => updateVariant(index, 'unit_label', e.target.value)} />
                        <input type="number" step="0.01" placeholder="Price (₹)" className="border bg-white p-2 rounded-xl text-xs font-medium outline-none" value={v.price} onChange={e => updateVariant(index, 'price', e.target.value)} />
                        <input type="number" step="0.01" placeholder="MRP (₹)" className="border bg-white p-2 rounded-xl text-xs font-medium outline-none" value={v.mrp} onChange={e => updateVariant(index, 'mrp', e.target.value)} />
                        <input type="number" placeholder="Stock" className="border bg-white p-2 rounded-xl text-xs font-medium outline-none" value={v.stock} onChange={e => updateVariant(index, 'stock', e.target.value)} />
                        <button type="button" onClick={() => removeVariant(index)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl text-xs font-bold text-center">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs transition shadow-md active:scale-95">
                  {editingId ? 'Update Product' : 'Add Product (Pending Approval)'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-5 py-3 rounded-2xl text-xs">
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 block text-sm">{prod.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              prod.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prod.approval_status || 'pending'}
                            </span>
                          </div>
                          <span className="text-stone-500">Stock: {prod.stock} | Price: ₹{prod.price?.toFixed(2)}</span>
                          {prod.variants?.length > 0 && (
                            <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">{prod.variants.length} variant tier(s)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { 
                          setEditingId(prod.id); 
                          setProductForm({ name: prod.name, price: prod.price, mrp: prod.mrp || '', stock: prod.stock, category_id: prod.category_id || '', description: prod.description || '', image_url: prod.image_url || '' }); 
                          setGalleryImages(prod.gallery || prod.images || []);
                          setVariants(prod.variants || []);
                        }} className="p-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-stone-700"><Edit size={14}/></button>
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
                        ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
                        .map(item => (
                          <span key={item.id} className="block text-xs bg-stone-50 p-2.5 rounded-xl">
                            {item.products?.name} x {item.quantity}
                          </span>
                        ))}
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