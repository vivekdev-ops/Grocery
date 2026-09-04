// src/components/ShopkeeperPortal.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, DollarSign, ShoppingCart, Store, Trash2, Edit, CheckCircle, Clock, LogOut, Upload, X, MapPin, Phone, Mail, FileText, Truck, Calendar, Printer, Filter, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { registerPushToken } from '../utils/notifications';
import NotificationBell from './NotificationBell';

const getApplicableCommissionPct = (profile, rules, roleType, cartAmount) => {
  if (profile?.custom_commission_pct !== null && profile?.custom_commission_pct !== undefined && profile?.custom_commission_pct !== '') {
    return Number(profile.custom_commission_pct);
  }

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return 2;
  }

  const targetRole = typeof roleType === 'string' ? roleType.toLowerCase() : 'shopkeeper';
  const roleRules = rules.filter(r => r.role_type?.toLowerCase() === targetRole && r.is_active);

  const matchedRule = roleRules.find(r => {
    const min = Number(r.min_cart_value || 0);
    const max = r.max_cart_value !== null && r.max_cart_value !== undefined && r.max_cart_value !== '' 
      ? Number(r.max_cart_value) 
      : Infinity;
    return cartAmount >= min && cartAmount <= max;
  });

  if (matchedRule) {
    return Number(matchedRule.commission_pct);
  }

  return 2;
};

export default function ShopkeeperPortal() {
  const [session, setSession] = useState(null);
  const [shopkeeperProfile, setShopkeeperProfile] = useState(null);
  const [commissionRules, setCommissionRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [datePreset, setDatePreset] = useState('all'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Store Location & Map State
  const [locationForm, setLocationForm] = useState({
    address: '',
    latitude: '',
    longitude: ''
  });
  const [pincodeQuery, setPincodeQuery] = useState('');
  const [searchingPin, setSearchingPin] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchOrCreateShopkeeperProfile(session.user);
        registerPushToken(session.user.id, 'shopkeeper');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchOrCreateShopkeeperProfile(session.user);
        registerPushToken(session.user.id, 'shopkeeper');
      } else {
        setLoading(false);
      }
    });

    fetchDependencies();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (shopkeeperProfile?.id) {
      fetchStoreData(shopkeeperProfile.id);
      setLocationForm({
        address: shopkeeperProfile.address || '',
        latitude: shopkeeperProfile.latitude !== null && shopkeeperProfile.latitude !== undefined ? shopkeeperProfile.latitude : '',
        longitude: shopkeeperProfile.longitude !== null && shopkeeperProfile.longitude !== undefined ? shopkeeperProfile.longitude : ''
      });
    }
  }, [datePreset, startDate, endDate, commissionRules, shopkeeperProfile?.id]);

  // Initialize interactive OpenStreetMap (Leaflet) when location tab is active
  useEffect(() => {
    if (activeTab === 'location') {
      const timer = setTimeout(() => {
        initializeMap();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const initializeMap = () => {
    if (!window.L || !mapContainerRef.current) return;

    const initialLat = Number(locationForm.latitude) || 26.8467;
    const initialLon = Number(locationForm.longitude) || 80.9462;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current).setView([initialLat, initialLon], 13);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const marker = window.L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

      marker.on('dragend', function (e) {
        const coords = marker.getLatLng();
        setLocationForm(prev => ({
          ...prev,
          latitude: coords.lat.toFixed(6),
          longitude: coords.lng.toFixed(6)
        }));
      });

      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        setLocationForm(prev => ({
          ...prev,
          latitude: e.latlng.lat.toFixed(6),
          longitude: e.latlng.lng.toFixed(6)
        }));
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      mapInstanceRef.current.setView([initialLat, initialLon], 13);
      markerInstanceRef.current.setLatLng([initialLat, initialLon]);
      mapInstanceRef.current.invalidateSize();
    }
  };

  const updateMapMarker = (lat, lon) => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const newLatLng = [Number(lat), Number(lon)];
      mapInstanceRef.current.setView(newLatLng, 15);
      markerInstanceRef.current.setLatLng(newLatLng);
    }
  };

  const handleSearchPincode = async (e) => {
    e.preventDefault();
    if (!pincodeQuery.trim()) return;

    setSearchingPin(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pincodeQuery.trim())}&country=India&format=json&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setLocationForm(prev => ({
          ...prev,
          latitude: Number(lat).toFixed(6),
          longitude: Number(lon).toFixed(6),
          address: prev.address || display_name
        }));
        updateMapMarker(lat, lon);
        alert(`Location found for PIN ${pincodeQuery}! Pin placed on map.`);
      } else {
        alert("Pincode not found. Please try searching by nearby city or landmark.");
      }
    } catch (err) {
      alert("Error searching location by pincode.");
    } finally {
      setSearchingPin(false);
    }
  };

  const fetchDependencies = async () => {
    const [catData, rulesData] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('cart_commission_rules').select('*').eq('is_active', true)
    ]);
    if (catData.data) setCategories(catData.data);
    if (rulesData.data) setCommissionRules(rulesData.data);
  };

  const fetchOrCreateShopkeeperProfile = async (user) => {
    setLoading(true);
    try {
      let { data: profileData, error: profileErr } = await supabase
        .from('shopkeeper_profiles')
        .select('id, user_id, store_name, phone, address, latitude, longitude, custom_commission_pct')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      if (!profileData || profileErr) {
        const newProfile = {
          id: user.id,
          user_id: user.id,
          store_name: user.email.split('@')[0] + "'s Store"
        };
        const { data: insertedProfile } = await supabase
          .from('shopkeeper_profiles')
          .upsert([newProfile], { onConflict: 'user_id' })
          .select()
          .single();
        
        profileData = insertedProfile || newProfile;
      }

      setShopkeeperProfile(profileData);
      await fetchStoreData(profileData.id);
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
      let query = supabase
        .from('order_items')
        .select('*, orders(*), products(name, shopkeeper_id)')
        .in('product_id', productIds);

      const now = new Date();
      if (datePreset === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('orders.created_at', startOfDay);
      } else if (datePreset === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('orders.created_at', startOfWeek);
      } else if (datePreset === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('orders.created_at', startOfMonth);
      } else if (datePreset === 'custom') {
        if (startDate) query = query.gte('orders.created_at', new Date(startDate).toISOString());
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query = query.lte('orders.created_at', endDateTime.toISOString());
        }
      }

      const { data: itemData } = await query;

      const uniqueOrdersMap = new Map();
      (itemData || []).forEach(item => {
        if (item.orders) {
          if (!uniqueOrdersMap.has(item.orders.id)) {
            uniqueOrdersMap.set(item.orders.id, { ...item.orders, items: [] });
          }
          uniqueOrdersMap.get(item.orders.id).items.push(item);
        }
      });
      setOrders(Array.from(uniqueOrdersMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } else {
      setOrders([]);
    }
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

    let { data: profileCheck } = await supabase
      .from('shopkeeper_profiles')
      .select('id')
      .or(`user_id.eq.${session.user.id},id.eq.${session.user.id}`)
      .maybeSingle();

    let targetShopkeeperId = profileCheck?.id || session.user.id;

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

  const handleFetchGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocationForm(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6)
        }));
        updateMapMarker(lat, lon);
        alert(`GPS Location fetched successfully!\nLat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
      },
      () => {
        alert("Unable to retrieve your location. Please check browser permissions.");
      }
    );
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!shopkeeperProfile?.id) return;

    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from('shopkeeper_profiles')
        .update({
          address: locationForm.address,
          latitude: locationForm.latitude !== '' ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude !== '' ? parseFloat(locationForm.longitude) : null
        })
        .eq('id', shopkeeperProfile.id);

      if (error) throw error;

      setShopkeeperProfile(prev => ({
        ...prev,
        address: locationForm.address,
        latitude: locationForm.latitude !== '' ? parseFloat(locationForm.latitude) : null,
        longitude: locationForm.longitude !== '' ? parseFloat(locationForm.longitude) : null
      }));

      alert("Store location saved successfully!");
    } catch (err) {
      alert("Error saving location: " + err.message);
    } finally {
      setSavingLocation(false);
    }
  };

  const totalNetRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => {
      const cartAmount = Number(o.total_amount || 0);
      const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);

      const shopkeeperGross = o.items
        ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
        .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

      const adminCut = (shopkeeperGross * tierPct) / 100;
      return sum + (shopkeeperGross - adminCut);
    }, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-600 font-medium">Loading store dashboard...</div>;
  if (!session) return <div className="text-center py-20"><p>Please log in as a shopkeeper.</p><button onClick={() => navigate('/login')} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl">Login</button></div>;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans text-xs">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shadow-xs print:hidden">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-sm font-black text-emerald-700 truncate">{shopkeeperProfile?.store_name || 'My Store'}</h1>
            <p className="text-[10px] text-stone-400 truncate mt-0.5">{session.user.email}</p>
          </div>
          <NotificationBell session={session} size={15} />
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Store size={16} /> Dashboard & Stats
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition cursor-pointer ${activeTab === 'products' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs' : 'text-stone-600 hover:bg-stone-50'}`}>
            <Package size={16} /> My Products ({products.length})
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition cursor-pointer ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs' : 'text-stone-600 hover:bg-stone-50'}`}>
            <ShoppingCart size={16} /> My Store Orders ({orders.length})
          </button>
          <button onClick={() => setActiveTab('location')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition cursor-pointer ${activeTab === 'location' ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs' : 'text-stone-600 hover:bg-stone-50'}`}>
            <MapPin size={16} /> Store Location
          </button>
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-medium transition cursor-pointer">
            <Store size={16} /> View Storefront
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition cursor-pointer">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto">
        
        {/* Global Filter & Statement Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-stone-200 shadow-xs mb-6 flex-wrap gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-emerald-700" />
            <span className="font-bold text-stone-700">Filter Range:</span>
            <div className="flex gap-1 flex-wrap">
              {['today', 'week', 'month', 'custom', 'all'].map(d => (
                <button 
                  key={d} 
                  onClick={() => setDatePreset(d)} 
                  className={`px-3 py-1 rounded-xl font-bold transition capitalize cursor-pointer ${datePreset === d ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Printer size={14} /> Print Statement PDF
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs mb-6 flex gap-4 items-center print:hidden">
            <div className="flex-1">
              <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">From Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-stone-50 border p-2.5 rounded-xl text-xs font-bold outline-none" />
            </div>
            <div className="flex-1">
              <label className="block font-bold text-[10px] text-stone-400 uppercase mb-1">To Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-stone-50 border p-2.5 rounded-xl text-xs font-bold outline-none" />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Store Performance Dashboard</h2>
              <p className="text-xs text-stone-500 mt-0.5">Overview of your catalog, net earnings, and filtered orders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Filtered Net Payout</span>
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                    <DollarSign size={18} />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">₹{totalNetRevenue.toFixed(2)}</h3>
                <p className="text-[11px] text-emerald-700 font-bold">From delivered store items</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">My Products</span>
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                    <Package size={18} />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{products.length}</h3>
                <p className="text-[11px] text-stone-500 font-medium">Active items in catalog</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-stone-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Filtered Orders</span>
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    <ShoppingCart size={18} />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{orders.length}</h3>
                <p className="text-[11px] text-stone-500 font-medium">Customer orders matching filter</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 print:hidden">
            <div>
              <h2 className="text-xl font-black text-slate-900">Manage My Products</h2>
              <p className="text-xs text-stone-500 mt-0.5">Add, edit, or remove items belonging exclusively to your store.</p>
            </div>

            <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-6">
              <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2 border-b pb-3 uppercase tracking-wider">
                <Plus size={16} /> {editingId ? 'Edit Product & Gallery' : 'Add Product & Gallery'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Product Name</label>
                  <input type="text" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium" placeholder="e.g. Organic Milk" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Base Price (₹)</label>
                  <input type="number" step="0.01" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium" placeholder="0.00" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium" placeholder="0.00" value={productForm.mrp} onChange={e => setProductForm({...productForm, mrp: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Base Stock</label>
                  <input type="number" required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium" placeholder="Available units" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Select Category</label>
                  <select required className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium cursor-pointer" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider">Browse & Upload Multiple Images</label>
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
                        <button type="button" onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-[10px] cursor-pointer"><X size={10}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Description</label>
                <textarea rows="3" className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium" placeholder="Product details, ingredients, or specifications..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">Product Variants (e.g. 500g, 1kg, 5L)</h4>
                    <p className="text-[10px] text-stone-400">Add custom packaging sizes with individual pricing and stock.</p>
                  </div>
                  <button type="button" onClick={addVariantTier} className="bg-stone-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shadow-2xs hover:bg-stone-800 transition cursor-pointer">
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
                        <button type="button" onClick={() => removeVariant(index)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl text-xs font-bold text-center cursor-pointer">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-2xl text-xs transition shadow-xs active:scale-95 cursor-pointer">
                  {editingId ? 'Update Product' : 'Add Product (Pending Approval)'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold px-5 py-3 rounded-2xl text-xs cursor-pointer">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Your Product Catalog</h3>
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
                            <span className="font-bold text-slate-900 block text-sm">{prod.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              prod.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prod.approval_status || 'pending'}
                            </span>
                          </div>
                          <span className="text-stone-500">Stock: {prod.stock} | Price: ₹{prod.price?.toFixed(2)}</span>
                          {prod.variants?.length > 0 && (
                            <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">{prod.variants.length} variant tier(s)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { 
                          setEditingId(prod.id); 
                          setProductForm({ name: prod.name, price: prod.price, mrp: prod.mrp || '', stock: prod.stock, category_id: prod.category_id || '', description: prod.description || '', image_url: prod.image_url || '' }); 
                          setGalleryImages(prod.gallery || prod.images || []);
                          setVariants(prod.variants || []);
                        }} className="p-2 bg-stone-200 hover:bg-stone-300 rounded-xl text-stone-700 cursor-pointer"><Edit size={14}/></button>
                        <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"><Trash2 size={14}/></button>
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
            <div className="flex justify-between items-center flex-wrap gap-4 print:hidden">
              <div>
                <h2 className="text-xl font-black text-slate-900">Store Orders & Fulfillment</h2>
                <p className="text-xs text-stone-500 mt-0.5">Comprehensive view of customer orders containing items from your catalog.</p>
              </div>
              <div className="flex bg-stone-100 p-1.5 rounded-2xl gap-2 font-bold text-[11px]">
                <span className="bg-white px-3 py-1 rounded-xl shadow-2xs text-stone-800">Total Filtered Orders: {orders.length}</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center text-stone-400 font-bold">
                No orders received for your store items within this period.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => {
                  const cartAmount = Number(order.total_amount || 0);
                  const storeItems = order.items?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id)) || [];
                  const storeOrderGross = storeItems.reduce((acc, item) => acc + (Number(item.price || 0) * item.quantity), 0);
                  
                  const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);
                  const adminCut = (storeOrderGross * tierPct) / 100;
                  const netPayout = storeOrderGross - adminCut;

                  return (
                    <div key={order.id} className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs">
                      
                      <div className="flex justify-between items-center pb-4 border-b border-stone-100 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                            <ShoppingCart size={18} />
                          </div>
                          <div>
                            <span className="font-mono font-black text-slate-900 text-sm">Order #{order.id.slice(0, 8)}</span>
                            <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={12} /> {new Date(order.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800 animate-pulse'
                          }`}>
                            Status: {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50/70 p-4 rounded-2xl border border-stone-100">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Customer Information</span>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Mail size={13} className="text-emerald-700" /> {order.customer_email || 'N/A'}
                          </p>
                          {order.customer_phone && (
                            <p className="font-medium text-stone-600 flex items-center gap-1.5">
                              <Phone size={13} className="text-stone-400" /> {order.customer_phone}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Delivery Address</span>
                          <p className="font-medium text-stone-700 flex items-start gap-1.5 leading-snug">
                            <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" /> 
                            <span>{order.delivery_address || order.address || 'Standard Delivery Location'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">Catalog Items Included from Your Store</span>
                        
                        <div className="border border-stone-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-stone-50 border-b text-[10px] uppercase text-stone-400 font-bold">
                                <th className="p-3">Product</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Unit Price</th>
                                <th className="p-3 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-medium text-slate-800">
                              {storeItems.map((item, idx) => {
                                const subtotal = Number(item.price || 0) * item.quantity;
                                return (
                                  <tr key={idx} className="hover:bg-stone-50">
                                    <td className="p-3 font-bold text-slate-900">{item.products?.name || 'Custom Product'}</td>
                                    <td className="p-3">{item.quantity} units</td>
                                    <td className="p-3">₹{Number(item.price || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-black text-emerald-700">₹{subtotal.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-stone-100 flex-wrap gap-2">
                        <span className="text-stone-500 font-medium text-[11px]">
                          Gross Sales: <strong className="text-slate-800">₹{storeOrderGross.toLocaleString()}</strong> 
                          <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg font-bold">Tier Rate: {tierPct}%</span>
                        </span>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 uppercase font-black">Net Payout Share:</span>
                          <span className="text-sm font-black text-emerald-700">₹{netPayout.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Store Location & Map Pinned Coordinates</h2>
              <p className="text-xs text-stone-500 mt-0.5">Search by PIN code or drag the marker on the map to pin your store's exact location.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5 max-w-3xl">
              
              {/* Pincode Search Bar */}
              <form onSubmit={handleSearchPincode} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                    type="text" 
                    placeholder="Search by PIN Code (e.g. 272155)" 
                    value={pincodeQuery}
                    onChange={e => setPincodeQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={searchingPin}
                  className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-3 rounded-2xl text-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {searchingPin ? 'Searching...' : 'Search PIN'}
                </button>
              </form>

              {/* Interactive Map Container */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  <span>Interactive Map (Drag pin or click to relocate)</span>
                  <button type="button" onClick={handleFetchGpsLocation} className="text-emerald-700 hover:underline cursor-pointer">
                    Use Current GPS
                  </button>
                </div>
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-72 rounded-2xl border border-stone-200 z-10 shadow-2xs" 
                />
              </div>

              <form onSubmit={handleSaveLocation} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider">Store Address</label>
                  <textarea 
                    rows="2" 
                    required 
                    placeholder="e.g. Shop No. 4, Main Market, Civil Lines, Harraiya" 
                    value={locationForm.address} 
                    onChange={e => setLocationForm({...locationForm, address: e.target.value})}
                    className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required
                      placeholder="e.g. 26.8467" 
                      value={locationForm.latitude} 
                      onChange={e => {
                        const val = e.target.value;
                        setLocationForm({...locationForm, latitude: val});
                        if (val && locationForm.longitude) updateMapMarker(val, locationForm.longitude);
                      }}
                      className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required
                      placeholder="e.g. 80.9462" 
                      value={locationForm.longitude} 
                      onChange={e => {
                        const val = e.target.value;
                        setLocationForm({...locationForm, longitude: val});
                        if (locationForm.latitude && val) updateMapMarker(locationForm.latitude, val);
                      }}
                      className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50/50 outline-none focus:border-emerald-600 font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={savingLocation}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-xs cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                  >
                    {savingLocation ? 'Saving Location...' : 'Save Store Location & Pinned Coordinates'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}