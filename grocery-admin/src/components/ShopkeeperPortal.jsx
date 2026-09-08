// src/components/ShopkeeperPortal.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, Plus, DollarSign, ShoppingCart, Store, Trash2, Edit, 
  CheckCircle, Clock, LogOut, Upload, X, MapPin, Phone, Mail, 
  FileText, Truck, Calendar, Printer, Filter, Bell, Search, Layers, 
  TrendingUp, ArrowUpRight, BarChart3, Download, ShieldCheck, Sparkles, 
  CreditCard, FileSpreadsheet, ChevronDown, ChevronUp, LayoutDashboard, Receipt, 
  ChevronLeft, ChevronRight, Bold, Italic, List, AlignLeft, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { registerPushToken, notifyCustomerOrderStatus, notifyAdminDeliveryUpdate } from '../utils/notifications';
import NotificationBell from './NotificationBell';
import ExcelProductUpload from './ExcelProductUploadshopkeeper';

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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'products' | 'orders' | 'payouts' | 'location'
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Orders status filter state
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [datePreset, setDatePreset] = useState('all'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 8;

  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 6;

  const [payoutPage, setPayoutPage] = useState(1);
  const payoutsPerPage = 6;

  // Excel Bulk Upload Drawer State
  const [isExcelUploadExpanded, setIsExcelUploadExpanded] = useState(false);

  const [productForm, setProductForm] = useState({ 
    name: '', 
    category_id: '', 
    description: '',
    brand: '',
    diet_type: 'Vegetarian',
    shelf_life: '',
    ingredients: '',
    nutritional_info: ''
  });
  
  const [galleryImages, setGalleryImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setShopkeeperProfile(null);
    navigate('/login', { replace: true });
  };

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

      marker.on('dragend', function () {
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
    } catch {
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
      const { data: staffCheck } = await supabase
        .from('staff_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const staffRole = (staffCheck?.role || '').toLowerCase();
      if (staffRole.includes('delivery') || staffRole.includes('rider') || staffRole.includes('boy')) {
        alert("Access Denied: Delivery Partners cannot access the Shopkeeper portal.");
        await supabase.auth.signOut({ scope: 'local' });
        navigate('/login', { replace: true });
        setLoading(false);
        return;
      }

      let { data: profileData, error: profileErr } = await supabase
        .from('shopkeeper_profiles')
        .select('id, user_id, store_name, phone, address, latitude, longitude, custom_commission_pct')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      if (!profileData || profileErr) {
        alert("Access Denied: No merchant/shopkeeper profile found for this account.");
        await supabase.auth.signOut({ scope: 'local' });
        navigate('/login', { replace: true });
        setLoading(false);
        return;
      }

      setShopkeeperProfile(profileData);
      await fetchStoreData(profileData.id);
    } catch (err) {
      console.error('Error handling profile:', err);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreData = async (storeId) => {
    const { data: prodData } = await supabase
      .from('products')
      .select('*, categories(name), product_variants(*)')
      .eq('shopkeeper_id', storeId)
      .order('name');
    
    const formattedProducts = (prodData || []).map(p => {
      const variantsList = Array.isArray(p.product_variants) && p.product_variants.length > 0 
        ? p.product_variants 
        : (Array.isArray(p.variants) ? p.variants : []);
      
      let mergedImages = [];
      if (Array.isArray(p.images)) mergedImages = p.images;
      else if (Array.isArray(p.gallery)) mergedImages = p.gallery;
      else if (typeof p.gallery === 'string') {
        try {
          const parsed = JSON.parse(p.gallery);
          if (Array.isArray(parsed)) mergedImages = parsed;
        } catch {}
      }
      if (mergedImages.length === 0 && p.image_url) mergedImages = [p.image_url];

      return {
        ...p,
        images: mergedImages,
        variants: variantsList
      };
    });

    setProducts(formattedProducts);

    const productIds = (prodData || []).map(p => p.id);
    if (productIds.length > 0) {
      let query = supabase
        .from('order_items')
        .select('*, orders(*), products(name, shopkeeper_id)')
        .in('product_id', productIds);

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

      // Sort orders: Pending/Processing first, followed by others by date
      const sortedOrders = Array.from(uniqueOrdersMap.values()).sort((a, b) => {
        const aStatus = (a.status || 'pending').toLowerCase();
        const bStatus = (b.status || 'pending').toLowerCase();
        
        const isAPending = aStatus === 'pending' || aStatus === 'processing';
        const isBPending = bStatus === 'pending' || bStatus === 'processing';

        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;

        return new Date(b.created_at) - new Date(a.created_at);
      });

      setOrders(sortedOrders);
    } else {
      setOrders([]);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Status Filter
    if (orderStatusFilter !== 'all') {
      result = result.filter(o => (o.status || 'pending').toLowerCase() === orderStatusFilter);
    }

    if (datePreset === 'all') return result;
    const now = new Date();
    return result.filter(order => {
      const orderDate = new Date(order.created_at);
      if (datePreset === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (datePreset === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      } else if (datePreset === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      } else if (datePreset === 'custom') {
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  }, [orders, orderStatusFilter, datePreset, startDate, endDate]);

  const filteredDeliveredOrders = orders.filter(o => o.status === 'delivered');

  const totalFilteredNetRevenue = filteredDeliveredOrders.reduce((sum, o) => {
    const cartAmount = Number(o.total_amount || 0);
    const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);

    const shopkeeperGross = o.items
      ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
      .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

    const adminCut = (shopkeeperGross * tierPct) / 100;
    return sum + (shopkeeperGross - adminCut);
  }, 0);

  const totalLifetimeRevenue = orders
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

  // Graph analytics breakdown by status
  const orderStatusCounts = useMemo(() => {
    const counts = { pending: 0, processing: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => {
      const st = (o.status || 'pending').toLowerCase();
      if (counts[st] !== undefined) counts[st]++;
      else counts.pending++;
    });
    return counts;
  }, [orders]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productsPerPage;
    return products.slice(start, start + productsPerPage);
  }, [products, productPage]);
  const totalProductPages = Math.ceil(products.length / productsPerPage);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, orderPage]);
  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginatedPayouts = useMemo(() => {
    const start = (payoutPage - 1) * payoutsPerPage;
    return filteredDeliveredOrders.slice(start, start + payoutsPerPage);
  }, [filteredDeliveredOrders, payoutPage]);
  const totalPayoutPages = Math.ceil(filteredDeliveredOrders.length / payoutsPerPage);

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

  const handleFormatText = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('shopkeeper-rich-description');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = productForm.description;
    const selectedText = text.substring(start, end);
    const replacement = tagClose ? `${tagOpen}${selectedText}${tagClose}` : `${tagOpen}${selectedText}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setProductForm(prev => ({ ...prev, description: newText }));
  };

  const handleGenerateAiDescription = async () => {
    if (!productForm.name.trim()) {
      alert('Please enter a Product Name first!');
      return;
    }
    setGeneratingAiDesc(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const productName = productForm.name.trim();
      const cleanHtml = `<p>Experience superior quality and freshness with <b>${productName}</b>.</p><ul><li><b>100% Pure & Fresh:</b> Premium quality guaranteed.</li><li><b>Best Value:</b> Packed securely to preserve natural taste and nutrition.</li></ul>`;
      setProductForm(prev => ({ ...prev, description: cleanHtml }));
    } catch (err) {
      alert('Generation error: ' + err.message);
    } finally {
      setGeneratingAiDesc(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!session) {
      alert("Session missing. Please log in again.");
      navigate('/login');
      return;
    }

    if (variants.length === 0) {
      alert("Please add at least one product variant (pack size, price, MRP, stock).");
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.unit_label?.trim()) {
        alert(`Please enter Unit / Pack Size for Variant #${i + 1}`);
        return;
      }
      if (v.price === '' || isNaN(Number(v.price))) {
        alert(`Please enter a valid selling price for Variant #${i + 1}`);
        return;
      }
      if (v.mrp === '' || isNaN(Number(v.mrp))) {
        alert(`Please enter a valid MRP for Variant #${i + 1}`);
        return;
      }
      if (v.stock === '' || isNaN(Number(v.stock))) {
        alert(`Please enter valid stock for Variant #${i + 1}`);
        return;
      }
    }

    let { data: profileCheck } = await supabase
      .from('shopkeeper_profiles')
      .select('id')
      .or(`user_id.eq.${session.user.id},id.eq.${session.user.id}`)
      .maybeSingle();

    let targetShopkeeperId = profileCheck?.id || session.user.id;
    const primaryImage = galleryImages.length > 0 ? galleryImages[0] : null;

    const normalizedVariants = variants.map(v => ({
      unit_label: v.unit_label.trim(),
      price: Number(v.price),
      mrp: Number(v.mrp),
      stock: Number(v.stock)
    }));

    const productPayload = {
      name: productForm.name.trim(),
      category_id: productForm.category_id || null,
      description: productForm.description || null,
      image_url: primaryImage,
      images: galleryImages,
      gallery: galleryImages,
      variants: normalizedVariants,
      shopkeeper_id: targetShopkeeperId,
      approval_status: 'pending',
      specifications: {
        brand: productForm.brand.trim(),
        diet_type: productForm.diet_type,
        shelf_life: productForm.shelf_life.trim(),
        ingredients: productForm.ingredients.trim(),
        nutritional_info: productForm.nutritional_info.trim()
      }
    };

    let productId = editingId;

    if (editingId) {
      const { error } = await supabase.from('products').update(productPayload).eq('id', editingId);
      if (error) {
        alert('Failed to update product: ' + error.message);
        return;
      }

      await supabase.from('product_variants').delete().eq('product_id', editingId);
    } else {
      const { data: newProd, error } = await supabase.from('products').insert([productPayload]).select().single();
      if (error) {
        alert('Failed to add product: ' + error.message);
        return;
      }
      productId = newProd.id;
    }

    const variantPayloads = normalizedVariants.map(v => ({
      product_id: productId,
      unit_label: v.unit_label,
      price: v.price,
      mrp: v.mrp,
      stock: v.stock
    }));

    const { error: variantError } = await supabase.from('product_variants').insert(variantPayloads);
    if (variantError) {
      alert('Failed to save variants: ' + variantError.message);
      return;
    }

    resetForm();
    fetchStoreData(targetShopkeeperId);
    alert(editingId ? 'Product updated successfully!' : 'Product submitted successfully! Pending admin approval.');
  };

  const resetForm = () => {
    setEditingId(null);
    setProductForm({ 
      name: '', 
      category_id: '', 
      description: '',
      brand: '',
      diet_type: 'Vegetarian',
      shelf_life: '',
      ingredients: '',
      nutritional_info: ''
    });
    setGalleryImages([]);
    setVariants([]);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product and its variants?")) return;
    await supabase.from('product_variants').delete().eq('product_id', id);
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

  if (loading) return <div className="flex items-center justify-center min-h-screen text-emerald-800 font-bold bg-[#F0FDF4]">Loading store dashboard...</div>;
  if (!session) return <div className="text-center py-20 bg-[#F0FDF4] min-h-screen"><p className="text-stone-700 font-bold">Please log in as a shopkeeper.</p><button onClick={() => navigate('/login')} className="mt-4 bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-black shadow-md cursor-pointer hover:bg-emerald-800 transition">Login</button></div>;

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.length, badge: orderStatusCounts.pending + orderStatusCounts.processing },
    { id: 'payouts', label: 'Payouts', icon: Receipt, count: filteredDeliveredOrders.length },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-stone-900 pb-28 md:pb-8 text-xs selection:bg-emerald-500 selection:text-white flex flex-col md:flex-row overflow-x-hidden">
      
      {/* ── DESKTOP & MOBILE SIDEBAR ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-emerald-100 flex flex-col shadow-xl transition-transform duration-300 md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 border-b border-emerald-100 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-600/30 shrink-0">
              KD
            </div>
            <div>
              <span className="font-black text-stone-900 text-sm block">KD Store</span>
              <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Merchant Portal</span>
            </div>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden text-stone-400 hover:text-stone-700 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-stone-100 bg-emerald-50/30">
          <p className="text-[10px] font-black uppercase text-stone-400">Logged in Store</p>
          <p className="font-bold text-stone-900 truncate text-xs mt-0.5">{shopkeeperProfile?.store_name || session.user.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-black transition cursor-pointer ${
                  isActive ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20' : 'text-stone-600 hover:bg-emerald-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span className="text-xs">{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 ? (
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {tab.badge}
                  </span>
                ) : tab.count !== undefined && tab.count > 0 ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-900'}`}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 space-y-1 shrink-0">
          <button onClick={() => window.print()} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-stone-600 hover:bg-stone-50 rounded-xl font-bold transition cursor-pointer">
            <Printer size={16} /> Print Report
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl font-black transition cursor-pointer">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div onClick={() => setIsMobileSidebarOpen(false)} className="fixed inset-0 bg-slate-950/50 z-40 md:hidden backdrop-blur-xs" />
      )}

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-2xs print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 rounded-xl bg-stone-100 text-stone-700 cursor-pointer">
              <Menu size={18} />
            </button>
            <h1 className="font-black text-stone-900 text-sm md:text-base capitalize">{activeTab} Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell session={session} size={18} />
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs border border-emerald-200">
              {shopkeeperProfile?.store_name?.[0]?.toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Printable Salary Slip / Statement */}
        <div className="hidden print:block p-8 bg-white text-stone-900 font-sans text-sm space-y-6">
          <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">KD</div>
                <h1 className="text-xl font-black text-stone-900 tracking-tight">KD Store Vendor & Shopkeeper Logistics</h1>
              </div>
              <p className="text-stone-500 text-xs mt-1">Official Merchant Payout & Revenue Statement</p>
            </div>
            <div className="text-right">
              <p className="font-black text-stone-900">Statement Date: {new Date().toLocaleDateString('en-IN')}</p>
              <p className="text-stone-500 text-xs capitalize">Filter: {datePreset} period</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase">1. Store & Merchant Name</p>
              <p className="font-black text-stone-900 text-base">{shopkeeperProfile?.store_name || 'Store Partner'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase">2. Contact Account</p>
              <p className="font-black text-stone-900 text-base">{session.user.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase">3. Period / Date Range</p>
              <p className="font-bold text-stone-800 capitalize">Preset: {datePreset} {startDate && endDate ? `(${startDate} to ${endDate})` : ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase">Fulfilled Delivered Orders</p>
              <p className="font-bold text-stone-800">{filteredDeliveredOrders.length} orders</p>
            </div>
          </div>

          <div>
            <h3 className="font-black text-stone-900 text-sm mb-2">4. Order Line Items & Net Payout Summary</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-600 text-white text-left">
                  <th className="p-2 border border-emerald-700">Order ID</th>
                  <th className="p-2 border border-emerald-700">Customer Location</th>
                  <th className="p-2 border border-emerald-700 text-right">Store Gross</th>
                  <th className="p-2 border border-emerald-700 text-right">Admin Fee %</th>
                  <th className="p-2 border border-emerald-700 text-right">Net Payout Share</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveredOrders.map(order => {
                  const cartAmount = Number(order.total_amount || 0);
                  const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);

                  const storeGross = order.items
                    ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
                    .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

                  const adminCut = (storeGross * tierPct) / 100;
                  const netShare = storeGross - adminCut;

                  return (
                    <tr key={order.id} className="border-b border-stone-200">
                      <td className="p-2 border border-stone-200 font-mono font-bold">#{order.id.slice(0, 8)}</td>
                      <td className="p-2 border border-stone-200 truncate max-w-[220px]">{order.delivery_address || order.address}</td>
                      <td className="p-2 border border-stone-200 text-right">₹{storeGross.toFixed(2)}</td>
                      <td className="p-2 border border-stone-200 text-right">{tierPct}%</td>
                      <td className="p-2 border border-stone-200 text-right font-black text-emerald-700">₹{netShare.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <div className="w-72 bg-emerald-50 border-2 border-emerald-600 p-4 rounded-2xl flex justify-between items-center">
              <span className="font-black text-stone-900 text-sm">5. Grand Total Net Payout:</span>
              <span className="font-black text-emerald-700 text-lg">₹{totalFilteredNetRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 w-full print:hidden">
          
          {/* ── TAB 0: OVERVIEW DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl space-y-3 relative overflow-hidden border border-emerald-800/40">
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
                  <Store size={200} />
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">Store Overview & Intelligence</span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {shopkeeperProfile?.store_name || 'Partner'}! 🚀</h2>
                <p className="text-xs text-emerald-200/80 max-w-xl leading-relaxed">Here is a quick snapshot of your inventory performance, incoming orders, and revenue realization.</p>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-stone-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Lifetime Payout</span>
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold border border-emerald-200">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900">₹{totalLifetimeRevenue.toFixed(2)}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <TrendingUp size={12} /> Realized net earnings
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-stone-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Active Products</span>
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold border border-emerald-200">
                      <Package size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900">{products.length}</h3>
                  <p className="text-[10px] text-stone-500 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-600" /> Catalog items listed
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-stone-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Total Orders</span>
                    <div className="w-9 h-9 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center font-bold border border-teal-200">
                      <ShoppingCart size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900">{orders.length}</h3>
                  <p className="text-[10px] text-teal-700 font-bold flex items-center gap-1">
                    <Clock size={12} /> Fulfilled & active orders
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-stone-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Delivered Share</span>
                    <div className="w-9 h-9 bg-violet-50 text-violet-700 rounded-xl flex items-center justify-center font-bold border border-violet-200">
                      <BarChart3 size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900">{filteredDeliveredOrders.length}</h3>
                  <p className="text-[10px] text-violet-700 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Successfully delivered
                  </p>
                </div>
              </div>

              {/* Visual Analytics Graph Section */}
              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-stone-900 text-sm">Order Status Breakdown</h3>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Real-time Metrics</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-800">Pending</p>
                    <p className="text-xl font-black text-amber-900">{orderStatusCounts.pending}</p>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-sky-800">Processing</p>
                    <p className="text-xl font-black text-sky-900">{orderStatusCounts.processing}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-800">Delivered</p>
                    <p className="text-xl font-black text-emerald-900">{orderStatusCounts.delivered}</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-rose-800">Cancelled</p>
                    <p className="text-xl font-black text-rose-900">{orderStatusCounts.cancelled}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB 1: PRODUCTS ── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Manage My Products</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Add, edit, or remove items belonging exclusively to your store with multi-tier variants.</p>
                </div>
                <button
                  onClick={() => setIsExcelUploadExpanded(!isExcelUploadExpanded)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer border border-emerald-200 shadow-sm active:scale-95"
                >
                  <FileSpreadsheet size={18} className="text-emerald-700" />
                  Bulk Excel Upload
                  {isExcelUploadExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {isExcelUploadExpanded && (
                <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-lg animate-fadeIn">
                  <ExcelProductUpload shopkeeperId={shopkeeperProfile?.id || session?.user?.id} onUploadSuccess={() => shopkeeperProfile?.id && fetchStoreData(shopkeeperProfile.id)} />
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="bg-white p-8 rounded-3xl border border-stone-200/80 shadow-2xs space-y-6">
                <h3 className="font-black text-xs text-slate-900 flex items-center gap-2 border-b border-stone-100 pb-3 uppercase tracking-wider">
                  <Plus size={16} className="text-emerald-700" /> {editingId ? 'Edit Product & Gallery' : 'Add Product & Gallery'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Product Name</label>
                    <input type="text" required className="w-full border border-stone-200 p-3.5 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-bold text-stone-900" placeholder="e.g. Organic Milk" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider mb-1">Select Category</label>
                    <select required className="w-full border border-stone-200 p-3.5 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-bold text-stone-900 cursor-pointer" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})}>
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider">Browse & Upload Multiple Images</label>
                  <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-stone-50/50 transition relative">
                    <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <div className="space-y-2 pointer-events-none">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                        <Upload size={22} />
                      </div>
                      <p className="text-xs font-black text-stone-800">Select multiple files from your device to form the product gallery.</p>
                      <p className="text-[10px] text-stone-400">Supports PNG, JPG, WebP formats</p>
                    </div>
                  </div>

                  {galleryImages.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {galleryImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-stone-200 shadow-2xs group bg-white">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-[10px] cursor-pointer shadow"><X size={10}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DESCRIPTION WITH AI & RICH TOOLBAR */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-black text-stone-700 uppercase tracking-wider text-[11px]">
                      Description
                    </label>

                    <button
                      type="button"
                      onClick={handleGenerateAiDescription}
                      disabled={generatingAiDesc}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-3.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={13} className="text-amber-300 fill-amber-300" />
                      {generatingAiDesc ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>

                  <div className="border border-stone-200 rounded-3xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-stone-50 px-3 py-2 border-b border-stone-100 flex items-center gap-1">
                      <button type="button" onClick={() => handleFormatText('<b>', '</b>')} className="p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer" title="Bold">
                        <Bold size={14} />
                      </button>
                      <button type="button" onClick={() => handleFormatText('<i>', '</i>')} className="p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer" title="Italic">
                        <Italic size={14} />
                      </button>
                      <div className="h-4 w-[1px] bg-stone-200 mx-1" />
                      <button type="button" onClick={() => handleFormatText('<ul>\n  <li>', '</li>\n</ul>')} className="p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer" title="List">
                        <List size={14} />
                      </button>
                      <button type="button" onClick={() => handleFormatText('<p>', '</p>')} className="p-1.5 hover:bg-stone-200/50 rounded-lg cursor-pointer" title="Paragraph">
                        <AlignLeft size={14} />
                      </button>
                    </div>

                    <textarea
                      id="shopkeeper-rich-description"
                      rows="4"
                      placeholder="Enter product description or specifications..."
                      className="w-full p-3.5 text-xs bg-stone-50/20 outline-none font-medium resize-y text-stone-900"
                      value={productForm.description}
                      onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* DETAILED SPECIFICATIONS */}
                <div className="pt-4 border-t border-stone-100 space-y-4">
                  <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={15} className="text-emerald-700" /> Detailed Product Specifications
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. B Natural"
                        className="w-full border border-stone-200 bg-stone-50 p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                        value={productForm.brand}
                        onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Diet Type</label>
                      <select
                        className="w-full border border-stone-200 bg-stone-50 p-3 rounded-2xl text-xs font-bold outline-none text-stone-900 cursor-pointer"
                        value={productForm.diet_type}
                        onChange={e => setProductForm({ ...productForm, diet_type: e.target.value })}
                      >
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Gluten-Free">Gluten-Free</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Shelf Life</label>
                      <input
                        type="text"
                        placeholder="e.g. 180 Days"
                        className="w-full border border-stone-200 bg-stone-50 p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                        value={productForm.shelf_life}
                        onChange={e => setProductForm({ ...productForm, shelf_life: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Nutritional Information</label>
                      <input
                        type="text"
                        placeholder="e.g. Energy: 42 kcal, Carbs: 10.5g"
                        className="w-full border border-stone-200 bg-stone-50 p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                        value={productForm.nutritional_info}
                        onChange={e => setProductForm({ ...productForm, nutritional_info: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Ingredients</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Carbonated Water, Sugar, Coconut Water (2%)..."
                      className="w-full border border-stone-200 bg-stone-50 p-3 rounded-2xl text-xs font-medium outline-none text-stone-900 resize-none"
                      value={productForm.ingredients}
                      onChange={e => setProductForm({ ...productForm, ingredients: e.target.value })}
                    />
                  </div>
                </div>

                {/* VARIANT SECTION */}
                <div className="space-y-3 pt-4 border-t border-stone-100">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={15} className="text-emerald-700" /> Product Variants (e.g. 500g, 1kg, 5L)
                      </h4>
                      <p className="text-[10px] text-stone-500 font-medium">Each variant requires its own pack size, selling price, MRP, and stock level.</p>
                    </div>
                    <button type="button" onClick={addVariantTier} className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
                      <Plus size={14} /> Add Variant Tier
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="text-center py-8 bg-amber-50/80 rounded-2xl border border-amber-200">
                      <p className="text-amber-800 font-black text-xs">No variants added yet.</p>
                      <p className="text-[10px] text-amber-700 font-medium mt-1">Please add at least one variant configuration to list this product.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((v, index) => (
                        <div key={index} className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-stone-900 text-xs uppercase">Variant #{index + 1}</span>
                            <button type="button" onClick={() => removeVariant(index)} className="text-rose-600 hover:text-rose-800 p-1 bg-white rounded-lg border border-rose-200 cursor-pointer shadow-2xs"><Trash2 size={13}/></button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Unit / Pack Size</label>
                              <input type="text" placeholder="e.g. 1 kg" className="w-full border border-stone-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900" value={v.unit_label} onChange={e => updateVariant(index, 'unit_label', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Selling Price (₹)</label>
                              <input type="number" step="0.01" min="0" placeholder="55.00" className="w-full border border-stone-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900" value={v.price} onChange={e => updateVariant(index, 'price', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">MRP (₹)</label>
                              <input type="number" step="0.01" min="0" placeholder="60.00" className="w-full border border-stone-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900" value={v.mrp} onChange={e => updateVariant(index, 'mrp', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Stock</label>
                              <input type="number" min="0" step="1" placeholder="100" className="w-full border border-stone-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900" value={v.stock} onChange={e => updateVariant(index, 'stock', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-stone-100">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer">
                    {editingId ? 'Update Product' : 'Add Product (Pending Approval)'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-black px-6 py-3.5 rounded-2xl text-xs uppercase cursor-pointer transition">
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs">
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Your Product Catalog ({products.length})</h3>
                {products.length === 0 ? (
                  <p className="text-xs text-stone-400 italic text-center py-8">You haven't added any products yet.</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedProducts.map(prod => (
                      <div key={prod.id} className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-200/80 text-xs hover:border-emerald-300 transition">
                        <div className="flex items-center gap-3.5">
                          <img src={prod.image_url || '/placeholder.png'} alt="" className="w-12 h-12 object-cover rounded-xl bg-white border border-stone-200 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 block text-sm">{prod.name}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                prod.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {prod.approval_status || 'pending'}
                              </span>
                            </div>
                            <span className="text-stone-500 font-medium text-[11px]">
                              {prod.variants?.length > 0 ? `${prod.variants.length} variant tier(s)` : 'No variants'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { 
                            setEditingId(prod.id); 
                            const specs = prod.specifications || {};
                            setProductForm({ 
                              name: prod.name, 
                              category_id: prod.category_id || '', 
                              description: prod.description || '',
                              brand: specs.brand || '',
                              diet_type: specs.diet_type || 'Vegetarian',
                              shelf_life: specs.shelf_life || '',
                              ingredients: specs.ingredients || '',
                              nutritional_info: specs.nutritional_info || ''
                            }); 
                            setGalleryImages(prod.gallery || prod.images || []);
                            setVariants(prod.variants || []);
                          }} className="p-2.5 bg-white hover:bg-stone-100 rounded-xl text-stone-700 border border-stone-200 cursor-pointer shadow-2xs transition" title="Edit Product"><Edit size={14}/></button>
                          <button onClick={() => handleDeleteProduct(prod.id)} className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 cursor-pointer shadow-2xs transition" title="Delete Product"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalProductPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 pt-4 border-t border-stone-100">
                    <button disabled={productPage === 1} onClick={() => setProductPage(p => Math.max(1, p - 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronLeft size={14} /></button>
                    {Array.from({ length: totalProductPages }, (_, i) => i + 1).map(num => (
                      <button key={num} onClick={() => setProductPage(num)} className={`w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-2xs ${productPage === num ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>{num}</button>
                    ))}
                    <button disabled={productPage === totalProductPages} onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronRight size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: ORDERS ── */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Store Orders & Fulfillment</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Comprehensive view of customer orders containing items from your catalog.</p>
                </div>

                {/* Status Filter Dropdown / Pills */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-2xs overflow-x-auto">
                  {['all', 'pending', 'processing', 'accepted', 'pickup', 'out_for_delivery', 'delivered', 'cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => { setOrderStatusFilter(st); setOrderPage(1); }}
                      className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase transition cursor-pointer ${
                        orderStatusFilter === st ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {paginatedOrders.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-stone-200 text-center text-stone-400 font-bold shadow-2xs">
                  No orders found matching the selected status filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedOrders.map(order => {
                    const cartAmount = Number(order.total_amount || 0);
                    const storeItems = order.items?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id)) || [];
                    const storeOrderGross = storeItems.reduce((acc, item) => acc + (Number(item.price || 0) * item.quantity), 0);
                    
                    const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);
                    const adminCut = (storeOrderGross * tierPct) / 100;
                    const netPayout = storeOrderGross - adminCut;

                    return (
                      <div key={order.id} className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-2xs hover:border-emerald-300 transition">
                        
                        <div className="flex justify-between items-center pb-4 border-b border-stone-100 flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold border border-emerald-200">
                              <ShoppingCart size={18} />
                            </div>
                            <div>
                              <span className="font-mono font-black text-slate-900 text-sm">Order #{order.id.slice(0, 8)}</span>
                              <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5 font-medium">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100">
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
                          
                          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase text-stone-700 font-black">
                                  <th className="p-3">Product</th>
                                  <th className="p-3">Qty</th>
                                  <th className="p-3">Unit Price</th>
                                  <th className="p-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 font-medium text-slate-800 text-xs">
                                {storeItems.map((item, idx) => {
                                  const subtotal = Number(item.price || 0) * item.quantity;
                                  return (
                                    <tr key={idx} className="hover:bg-stone-50/50">
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

                        <div className="flex justify-between items-center pt-3 border-t border-stone-100 flex-wrap gap-2 text-xs">
                          <span className="text-stone-500 font-medium">
                            Gross Sales: <strong className="text-slate-800 font-bold">₹{storeOrderGross.toLocaleString()}</strong> 
                            <span className="ml-2 px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-lg font-bold border border-amber-200">Tier Rate: {tierPct}%</span>
                          </span>
                          <div className="text-right flex items-center gap-2">
                            <span className="text-[10px] text-stone-400 uppercase font-black">Net Payout Share:</span>
                            <span className="text-sm font-black text-emerald-700">₹{netPayout.toFixed(2)}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {totalOrderPages > 1 && (
                    <div className="flex justify-center items-center gap-1.5 pt-4">
                      <button disabled={orderPage === 1} onClick={() => setOrderPage(p => Math.max(1, p - 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronLeft size={14} /></button>
                      {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map(num => (
                        <button key={num} onClick={() => setOrderPage(num)} className={`w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-2xs ${orderPage === num ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>{num}</button>
                      ))}
                      <button disabled={orderPage === totalOrderPages} onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronRight size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: PAYOUTS & STATEMENT SLIP ── */}
          {activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">KD Store Merchant Payout Portal</span>
                  <span className="font-mono text-xs opacity-90">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div>
                  <p className="text-2xl font-black mt-1">₹{totalFilteredNetRevenue.toFixed(2)}</p>
                  <p className="text-[11px] opacity-90">Calculated net store payout for selected filter range</p>
                </div>
              </div>

              {/* Working Filter Controls */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                    <Filter size={14} className="text-emerald-600" />
                    <span>Filter Payout Statement</span>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <FileText size={14} /> Download PDF Statement
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap pt-1">
                  {['today', 'week', 'month', 'custom', 'all'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDatePreset(d)}
                      className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase transition cursor-pointer ${
                        datePreset === d ? 'bg-stone-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">From Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-stone-400 uppercase mb-1">To Date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Payout breakdown statement */}
              <div className="bg-white rounded-3xl border border-stone-200/80 p-5 space-y-3 shadow-2xs">
                <h3 className="font-black text-slate-900 text-sm">Statement Breakdown ({filteredDeliveredOrders.length} Delivered Orders)</h3>

                {filteredDeliveredOrders.length === 0 ? (
                  <div className="p-12 text-center text-stone-400 font-medium">No delivered store orders found for this period.</div>
                ) : (
                  <div className="space-y-2.5">
                    {paginatedPayouts.map(order => {
                      const cartAmount = Number(order.total_amount || 0);
                      const tierPct = getApplicableCommissionPct(shopkeeperProfile, commissionRules, 'shopkeeper', cartAmount);

                      const storeGross = order.items
                        ?.filter(item => item.products?.shopkeeper_id === (shopkeeperProfile?.id || session?.user?.id))
                        .reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

                      const adminCut = (storeGross * tierPct) / 100;
                      const netShare = storeGross - adminCut;

                      return (
                        <div key={order.id} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                          <div>
                            <p className="font-mono font-black text-slate-900">#{order.id.slice(0, 8)}</p>
                            <p className="text-[10px] text-stone-400">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-700 text-sm">+₹{netShare.toFixed(2)}</p>
                            <p className="text-[9px] text-stone-400 font-bold">Gross: ₹{storeGross.toFixed(0)} (Fee: {tierPct}%)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPayoutPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 pt-4 border-t border-stone-100">
                    <button disabled={payoutPage === 1} onClick={() => setPayoutPage(p => Math.max(1, p - 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronLeft size={14} /></button>
                    {Array.from({ length: totalPayoutPages }, (_, i) => i + 1).map(num => (
                      <button key={num} onClick={() => setPayoutPage(num)} className={`w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-2xs ${payoutPage === num ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>{num}</button>
                    ))}
                    <button disabled={payoutPage === totalPayoutPages} onClick={() => setPayoutPage(p => Math.min(totalPayoutPages, p + 1))} className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"><ChevronRight size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: LOCATION ── */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Store Location & Map Pinned Coordinates</h2>
                <p className="text-xs text-stone-500 mt-0.5">Search by PIN code or drag the marker on the map to pin your store's exact location.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200/80 shadow-2xs space-y-5 max-w-3xl">
                
                <form onSubmit={handleSearchPincode} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Search by PIN Code (e.g. 272155)" 
                      value={pincodeQuery}
                      onChange={e => setPincodeQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-mono font-bold text-stone-900"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={searchingPin}
                    className="bg-stone-900 hover:bg-stone-800 text-white font-black px-6 py-3 rounded-2xl text-xs transition cursor-pointer shrink-0 disabled:opacity-50 uppercase tracking-wider"
                  >
                    {searchingPin ? 'Searching...' : 'Search PIN'}
                  </button>
                </form>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-stone-500 font-black uppercase tracking-wider">
                    <span>Interactive Map (Drag pin or click to relocate)</span>
                    <button type="button" onClick={handleFetchGpsLocation} className="text-emerald-600 hover:underline cursor-pointer">
                      Use Current GPS
                    </button>
                  </div>
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-72 rounded-2xl border border-stone-200 z-10 shadow-inner" 
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
                      onChange={e => getLocationForm({...locationForm, address: e.target.value})}
                      className="w-full border border-stone-200 p-3.5 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-medium text-stone-900 resize-none"
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
                        className="w-full border border-stone-200 p-3.5 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-mono font-bold text-stone-900"
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
                        className="w-full border border-stone-200 p-3.5 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-600 font-mono font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={savingLocation}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 uppercase tracking-wider active:scale-95"
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
    </div>
  );
}