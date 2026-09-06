// src/components/Staff.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Edit, Mail, Phone, MapPin, ExternalLink, X, Store, Truck, Percent, Save, Plus, ShieldCheck, Briefcase, Package, ShoppingBag, Banknote, Layers, FileText, Eye, Grid, Filter } from 'lucide-react';
import AdminUserDetailModal from './AdminUserDetailModal';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [activeTab, setActiveTab] = useState('shopkeepers'); // 'shopkeepers', 'delivery', 'managers', or 'commissions'
  const [loading, setLoading] = useState(true);

  // Selected Shopkeeper Detailed Breakdown State
  const [selectedShopkeeperDetails, setSelectedShopkeeperDetails] = useState(null);
  const [shopkeeperProducts, setShopkeeperProducts] = useState([]);
  const [shopkeeperOrders, setShopkeeperOrders] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Catalog Popup Filters State
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Detailed Order, Product, and Full Catalog Pop-up States
  const [inspectedOrder, setInspectedOrder] = useState(null);
  const [inspectedProduct, setInspectedProduct] = useState(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Commission Rules & Settings State
  const [commissionRules, setCommissionRules] = useState([]);
  const [commissionForm, setCommissionForm] = useState({
    role_type: 'shopkeeper',
    min_cart_value: '',
    max_cart_value: '',
    commission_pct: ''
  });
  const [savingRule, setSavingRule] = useState(false);

  // Modal State for Performance Details
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('shopkeeper');

  // Modal State for CRUD (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    role: 'delivery',
    store_name: '',
    owner_name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [staffRes, shopRes, rulesRes, catRes] = await Promise.all([
      supabase.from('staff_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('shopkeeper_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('cart_commission_rules').select('*').order('min_cart_value', { ascending: true }),
      supabase.from('categories').select('*').order('name')
    ]);

    if (!staffRes.error) setStaffList(staffRes.data || []);
    if (!catRes.error) setCategoriesList(catRes.data || []);
    if (!shopRes.error) {
      const shops = shopRes.data || [];
      setShopkeepers(shops);
      if (shops.length > 0 && !selectedShopkeeperDetails) {
        fetchShopkeeperMetrics(shops[0]);
      } else if (selectedShopkeeperDetails) {
        const updatedCurrent = shops.find(s => s.id === selectedShopkeeperDetails.id);
        if (updatedCurrent) setSelectedShopkeeperDetails(updatedCurrent);
      }
    }
    if (!rulesRes.error) setCommissionRules(rulesRes.data || []);
    setLoading(false);
  };

  const fetchShopkeeperMetrics = async (shopkeeper) => {
    setSelectedShopkeeperDetails(shopkeeper);
    setLoadingDetails(true);

    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(*), product_variants(*)')
        .eq('shopkeeper_id', shopkeeper.id);

      setShopkeeperProducts(prodData || []);

      const productIds = (prodData || []).map(p => p.id);
      if (productIds.length > 0) {
        const { data: itemData } = await supabase
          .from('order_items')
          .select('order_id, quantity, price, variant_id, variant_label, products(*, product_variants(*)), orders(*)')
          .in('product_id', productIds);

        const uniqueOrdersMap = {};
        (itemData || []).forEach(item => {
          if (item.orders) {
            uniqueOrdersMap[item.orders.id] = {
              ...item.orders,
              matched_items: (uniqueOrdersMap[item.orders.id]?.matched_items || []).concat(item)
            };
          }
        });

        setShopkeeperOrders(Object.values(uniqueOrdersMap));
      } else {
        setShopkeeperOrders([]);
      }
    } catch (err) {
      console.error("Error fetching shopkeeper specifics:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    setSavingRule(true);
    const { error } = await supabase.from('cart_commission_rules').insert([{
      role_type: commissionForm.role_type,
      min_cart_value: Number(commissionForm.min_cart_value),
      max_cart_value: commissionForm.max_cart_value ? Number(commissionForm.max_cart_value) : null,
      commission_pct: Number(commissionForm.commission_pct),
      is_active: true
    }]);

    if (error) {
      alert("Error adding rule: " + error.message);
    } else {
      alert("Cart-value commission rule added successfully!");
      setCommissionForm({ role_type: 'shopkeeper', min_cart_value: '', max_cart_value: '', commission_pct: '' });
      fetchData();
    }
    setSavingRule(false);
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this commission rule?")) return;
    const { error } = await supabase.from('cart_commission_rules').delete().eq('id', id);
    if (!error) {
      setCommissionRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingEntity(null);
    setForm({ 
      email: '', 
      password: '', 
      role: activeTab === 'managers' ? 'manager' : activeTab === 'delivery' ? 'delivery' : 'shopkeeper', 
      store_name: '', 
      owner_name: '', 
      phone: '', 
      address: '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (entity, type) => {
    setEditingEntity({ ...entity, type });
    if (type === 'shopkeeper') {
      setForm({
        email: entity.email || '',
        password: '',
        role: 'shopkeeper',
        store_name: entity.store_name || '',
        owner_name: entity.owner_name || '',
        phone: entity.phone || '',
        address: entity.address || ''
      });
    } else {
      setForm({
        email: entity.email || '',
        password: '',
        role: entity.role || 'delivery',
        store_name: '',
        owner_name: '',
        phone: '',
        address: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();

    if (editingEntity) {
      if (editingEntity.type === 'shopkeeper') {
        const targetId = editingEntity.id;
        const { error } = await supabase.from('shopkeeper_profiles').update({
          store_name: form.store_name,
          owner_name: form.owner_name,
          phone: form.phone,
          address: form.address
        }).or(`id.eq.${targetId},user_id.eq.${targetId}`);

        if (error) {
          alert(error.message);
        } else {
          alert('Shopkeeper updated successfully!');
          closeAndResetModal();
          if (selectedShopkeeperDetails?.id === targetId) {
            fetchShopkeeperMetrics({ ...selectedShopkeeperDetails, store_name: form.store_name, owner_name: form.owner_name, phone: form.phone, address: form.address });
          }
        }
      } else {
        const targetId = editingEntity.id;
        const { error } = await supabase.from('staff_profiles').update({
          role: form.role
        }).eq('id', targetId);

        if (error) alert(error.message);
        else {
          alert('Staff role updated successfully!');
          closeAndResetModal();
        }
      }
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      const adminSession = sessionData?.session;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: form.role,
            store_name: form.store_name,
            owner_name: form.owner_name,
            phone: form.phone,
            address: form.address
          }
        }
      });

      if (authError) {
        alert("Auth error: " + authError.message);
        return;
      }

      const newUserId = authData?.user?.id;

      if (newUserId) {
        await supabase.from('staff_profiles').upsert([
          { user_id: newUserId, email: form.email, role: form.role }
        ], { onConflict: 'user_id' });

        if (form.role === 'shopkeeper') {
          await supabase.from('shopkeeper_profiles').upsert([
            { 
              id: newUserId,
              user_id: newUserId, 
              store_name: form.store_name || 'My Store', 
              owner_name: form.owner_name || '',
              phone: form.phone || '', 
              address: form.address || '',
              email: form.email
            }
          ], { onConflict: 'id' });
        }
      }

      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      alert('Account and profile created successfully!');
      closeAndResetModal();
    }
  };
  
  const closeAndResetModal = () => {
    setForm({ email: '', password: '', role: 'delivery', store_name: '', owner_name: '', phone: '', address: '' });
    setEditingEntity(null);
    setIsModalOpen(false);
    
    setTimeout(() => {
      fetchData();
    }, 400);
  };

  const handleDeleteStaff = async (id) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      await supabase.from('staff_profiles').delete().eq('id', id);
      fetchData();
    }
  };

  const handleDeleteShopkeeper = async (id) => {
    if (confirm('Are you sure you want to delete this shopkeeper?')) {
      await supabase.from('shopkeeper_profiles').delete().eq('id', id);
      fetchData();
      setSelectedShopkeeperDetails(null);
    }
  };

  const deliveryStaff = staffList.filter(s => s.role === 'delivery');
  const managerStaff = staffList.filter(s => s.role === 'manager' || s.role === 'admin');

  const totalShopkeeperSales = shopkeeperOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, ord) => {
      const matchSum = (ord.matched_items || []).reduce((itemSum, i) => itemSum + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
      return sum + matchSum;
    }, 0);

  // Parent categories vs subcategories for modal filter
  const parentCategories = categoriesList.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => categoriesList.filter(c => c.parent_id === parentId);

  // Filtered catalog list for modal popup
  const filteredCatalogProducts = shopkeeperProducts.filter(p => {
    const matchesSearch = !catalogSearchQuery.trim() || p.name.toLowerCase().includes(catalogSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (catalogCategoryFilter === 'all') return true;

    // Check if product category matches parent or is a subcategory belonging to the parent
    const pCatId = p.category_id || p.categories?.id;
    if (String(pCatId) === String(catalogCategoryFilter)) return true;

    const subcats = getSubcategories(catalogCategoryFilter);
    if (subcats.some(sub => String(sub.id) === String(pCatId))) return true;

    return false;
  });

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* ── HEADER SECTION ── */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl border border-emerald-800/50 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <Users size={220} />
        </div>

        <div className="relative z-10 space-y-1">
          <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-3.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
            Team & Partner Control Hub
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Staff & Vendor Management</h2>
          <p className="text-xs text-emerald-200/80 max-w-xl">
            Manage shopkeepers, store managers, delivery agents, and commission structures from one centralized dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          {activeTab !== 'commissions' && (
            <button 
              onClick={openAddModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer ml-auto md:ml-0"
            >
              <UserPlus size={16} /> Create Account
            </button>
          )}
        </div>
      </div>

      {/* ── NAVIGATION TABS BAR ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('shopkeepers')} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'shopkeepers' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Store size={15} />
            <span>Shopkeepers ({shopkeepers.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('managers')} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'managers' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Briefcase size={15} />
            <span>Managers ({managerStaff.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('delivery')} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'delivery' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Truck size={15} />
            <span>Delivery Boys ({deliveryStaff.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('commissions')} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'commissions' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Percent size={15} />
            <span>Commissions</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'commissions' ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-6">
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <Percent size={18} />
                </div>
                <span>Cart-Value Commission Rules</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">Configure tiered commission percentages based on order cart totals.</p>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">Target Role</label>
                  <select 
                    value={commissionForm.role_type}
                    onChange={e => setCommissionForm({...commissionForm, role_type: e.target.value})}
                    className="w-full bg-emerald-50/30 border border-emerald-200 p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="shopkeeper">Shopkeeper</option>
                    <option value="delivery">Delivery Agent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">Min Cart Value (₹)</label>
                  <input 
                    type="number" 
                    step="1" 
                    required 
                    placeholder="e.g. 0"
                    value={commissionForm.min_cart_value}
                    onChange={e => setCommissionForm({...commissionForm, min_cart_value: e.target.value})}
                    className="w-full bg-emerald-50/30 border border-emerald-200 p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">Max Cart Value (₹)</label>
                  <input 
                    type="number" 
                    step="1" 
                    placeholder="Leave empty for infinity"
                    value={commissionForm.max_cart_value}
                    onChange={e => setCommissionForm({...commissionForm, max_cart_value: e.target.value})}
                    className="w-full bg-emerald-50/30 border border-emerald-200 p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">Commission Share (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="e.g. 85"
                    value={commissionForm.commission_pct}
                    onChange={e => setCommissionForm({...commissionForm, commission_pct: e.target.value})}
                    className="w-full bg-emerald-50/30 border border-emerald-200 p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={savingRule}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-8 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-700/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <Plus size={16} /> {savingRule ? 'Adding...' : 'Add Tier Rule'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">
                  <th className="p-4 sm:p-5">Role</th>
                  <th className="p-4 sm:p-5">Cart Value Range</th>
                  <th className="p-4 sm:p-5">Commission %</th>
                  <th className="p-4 sm:p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-xs font-medium">
                {commissionRules.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-stone-400 italic font-medium">No tiered rules configured yet.</td></tr>
                ) : (
                  commissionRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-4 sm:p-5 uppercase font-black text-slate-800">{rule.role_type}</td>
                      <td className="p-4 sm:p-5 text-stone-700 font-bold">
                        ₹{rule.min_cart_value} {rule.max_cart_value !== null ? `to ₹${rule.max_cart_value}` : 'and above'}
                      </td>
                      <td className="p-4 sm:p-5 font-black text-emerald-700">{rule.commission_pct}%</td>
                      <td className="p-4 sm:p-5 text-right">
                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer" title="Delete Rule">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'shopkeepers' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: List of Shopkeepers */}
              <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm p-4 h-[750px] overflow-y-auto space-y-2.5">
                <div className="px-3 pt-2 pb-1">
                  <h3 className="font-black text-xs text-emerald-900 uppercase tracking-wider">All Shopkeepers ({shopkeepers.length})</h3>
                </div>

                {loading ? (
                  <p className="text-center py-12 text-stone-400 text-xs font-bold">Loading vendors...</p>
                ) : shopkeepers.length === 0 ? (
                  <p className="text-center py-12 text-stone-400 text-xs italic">No shopkeepers registered.</p>
                ) : (
                  shopkeepers.map(shop => {
                    const isSelected = selectedShopkeeperDetails?.id === shop.id;
                    return (
                      <div 
                        key={shop.id}
                        onClick={() => fetchShopkeeperMetrics(shop)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-600/20' 
                            : 'bg-stone-50/60 hover:bg-emerald-50/40 border-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            isSelected ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            <Store size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm text-slate-900 truncate">{shop.store_name}</h4>
                            <p className="text-[11px] text-stone-500 truncate font-medium">Owner: {shop.owner_name || 'N/A'}</p>
                            <p className="text-[10px] text-emerald-800 truncate font-bold mt-0.5">📞 {shop.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Deep Comprehensive Shopkeeper Breakdown */}
              <div className="lg:col-span-2 space-y-6">
                {selectedShopkeeperDetails ? (
                  <>
                    {/* Summary Card with Phone, Address & Owner Info */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-emerald-100">
                        <div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">Verified Merchant</span>
                          <h3 className="text-2xl font-black text-slate-900 mt-1">{selectedShopkeeperDetails.store_name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(selectedShopkeeperDetails, 'shopkeeper')} className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs">
                            <Edit size={14} /> Edit Store Details
                          </button>
                          <button onClick={() => handleDeleteShopkeeper(selectedShopkeeperDetails.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer" title="Delete Store">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Contact & Address Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                          <Users size={16} className="text-emerald-700 shrink-0" />
                          <div>
                            <span className="text-[9px] text-stone-400 font-black uppercase block">Contact Person</span>
                            <span className="font-bold text-slate-900">{selectedShopkeeperDetails.owner_name || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                          <Phone size={16} className="text-emerald-700 shrink-0" />
                          <div>
                            <span className="text-[9px] text-stone-400 font-black uppercase block">Phone Number</span>
                            <span className="font-bold text-slate-900">{selectedShopkeeperDetails.phone || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                          <MapPin size={16} className="text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] text-stone-400 font-black uppercase block">Pickup Address</span>
                            <span className="font-bold text-slate-900 truncate block">{selectedShopkeeperDetails.address || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Metrics Row + Products Catalog Button */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium pt-2 items-center">
                        <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                          <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider block">Products Added</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-lg font-black text-slate-900">{shopkeeperProducts.length} Items</span>
                            <button 
                              onClick={() => { setCatalogCategoryFilter('all'); setCatalogSearchQuery(''); setIsCatalogModalOpen(true); }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <Grid size={13} /> View Catalog Icon
                            </button>
                          </div>
                        </div>

                        <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                          <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider block">Orders Received</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">{shopkeeperOrders.length} Orders</span>
                        </div>

                        <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                          <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider block">Delivered Sales (Payout)</span>
                          <span className="text-lg font-black text-emerald-700 mt-0.5 block">₹{totalShopkeeperSales.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs for Products & Variants vs Orders & Payouts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Products Added Preview */}
                      <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <Package size={16} className="text-emerald-700" /> Products & Variants ({shopkeeperProducts.length})
                          </h4>
                          <button 
                            onClick={() => { setCatalogCategoryFilter('all'); setCatalogSearchQuery(''); setIsCatalogModalOpen(true); }}
                            className="text-emerald-700 font-black text-[11px] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            Expand Catalog <ExternalLink size={12} />
                          </button>
                        </div>
                        {loadingDetails ? (
                          <p className="text-xs text-stone-400 italic py-6 text-center">Loading items...</p>
                        ) : shopkeeperProducts.length === 0 ? (
                          <p className="text-xs text-stone-400 italic py-6 text-center">No products cataloged yet.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 text-xs">
                            {shopkeeperProducts.slice(0, 5).map(p => (
                              <div key={p.id} className="p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img src={p.image_url || '/placeholder.png'} alt="" className="w-10 h-10 object-cover rounded-xl border bg-white shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-black text-slate-900 block truncate">{p.name}</span>
                                    <span className="text-[10px] text-stone-400 font-medium">₹{p.price} • {p.categories?.name || 'General'}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setInspectedProduct(p)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl font-black transition text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Eye size={12} /> Details
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Orders & Status Breakdown */}
                      <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm p-6 space-y-4">
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <ShoppingBag size={16} className="text-emerald-700" /> Order History & Status ({shopkeeperOrders.length})
                        </h4>
                        {loadingDetails ? (
                          <p className="text-xs text-stone-400 italic py-6 text-center">Loading orders...</p>
                        ) : shopkeeperOrders.length === 0 ? (
                          <p className="text-xs text-stone-400 italic py-6 text-center">No orders fulfilled yet.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 text-xs">
                            {shopkeeperOrders.map(ord => (
                              <div key={ord.id} className="p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-bold text-slate-900">#{ord.id.slice(0, 8)}</span>
                                  <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${
                                    ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>{ord.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-stone-500 font-medium pt-1 border-t border-emerald-100">
                                  <span>{new Date(ord.created_at).toLocaleDateString()}</span>
                                  <span className="font-black text-slate-900">₹{ord.total_amount}</span>
                                </div>
                                <button 
                                  onClick={() => setInspectedOrder(ord)}
                                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 rounded-xl font-black transition text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FileText size={12} /> View Customer & Order Details
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="bg-white p-16 rounded-[2.5rem] border text-center text-stone-400 font-medium">Select a shopkeeper to inspect performance and payouts.</div>
                )}
              </div>

            </div>
          ) : activeTab === 'managers' ? (
            <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">
                    <th className="p-4 sm:p-5">Manager Email</th>
                    <th className="p-4 sm:p-5">Role</th>
                    <th className="p-4 sm:p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 text-xs">
                  {loading ? (
                    <tr><td colSpan="3" className="p-16 text-center text-stone-500 font-bold">Loading managers...</td></tr>
                  ) : managerStaff.length === 0 ? (
                    <tr><td colSpan="3" className="p-16 text-center text-stone-400 italic font-medium">No store managers created yet.</td></tr>
                  ) : (
                    managerStaff.map(staff => (
                      <tr key={staff.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-4 sm:p-5 font-black text-slate-900 text-sm flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                            <Mail size={16} />
                          </div>
                          <span>{staff.email}</span>
                        </td>
                        <td className="p-4 sm:p-5">
                          <span className="bg-blue-100 text-blue-800 font-black px-3 py-1 rounded-full uppercase text-[10px] tracking-wider border border-blue-200 shadow-2xs">
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                              onClick={() => { setSelectedUser(staff); setSelectedRole('manager'); }} 
                              className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-black px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer border border-teal-200 text-xs shadow-2xs"
                            >
                              <ExternalLink size={14} /> View Performance
                            </button>
                            <button onClick={() => openEditModal(staff, 'staff')} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer" title="Edit Role">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">
                    <th className="p-4 sm:p-5">Delivery Agent Email</th>
                    <th className="p-4 sm:p-5">Role</th>
                    <th className="p-4 sm:p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 text-xs">
                  {loading ? (
                    <tr><td colSpan="3" className="p-16 text-center text-stone-500 font-bold">Loading delivery agents...</td></tr>
                  ) : deliveryStaff.length === 0 ? (
                    <tr><td colSpan="3" className="p-16 text-center text-stone-400 italic font-medium">No delivery partners created yet.</td></tr>
                  ) : (
                    deliveryStaff.map(staff => (
                      <tr key={staff.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-4 sm:p-5 font-black text-slate-900 text-sm flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <Truck size={16} />
                          </div>
                          <span>{staff.email}</span>
                        </td>
                        <td className="p-4 sm:p-5">
                          <span className="bg-purple-100 text-purple-800 font-black px-3 py-1 rounded-full uppercase text-[10px] tracking-wider border border-purple-200 shadow-2xs">
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                              onClick={() => { setSelectedUser(staff); setSelectedRole('delivery'); }} 
                              className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-black px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer border border-teal-200 text-xs shadow-2xs"
                            >
                              <ExternalLink size={14} /> View Performance
                            </button>
                            <button onClick={() => openEditModal(staff, 'staff')} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer" title="Edit Role">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Full Catalog Expandable Modal Popup with Category/Subcategory Filters */}
      {isCatalogModalOpen && selectedShopkeeperDetails && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-5xl w-full shadow-2xl border border-emerald-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black">
                  <Grid size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Expanded Store Catalog</span>
                  <h3 className="font-black text-lg text-slate-900 mt-0.5">{selectedShopkeeperDetails.store_name} - Full Inventory</h3>
                </div>
              </div>
              <button onClick={() => setIsCatalogModalOpen(false)} className="p-2 bg-emerald-50 rounded-full text-stone-600 hover:bg-emerald-100 cursor-pointer" title="Close"><X size={18}/></button>
            </div>

            {/* Filter Bar: Category/Subcategory & Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 items-center justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter size={15} className="text-emerald-700 shrink-0" />
                <select 
                  value={catalogCategoryFilter}
                  onChange={e => setCatalogCategoryFilter(e.target.value)}
                  className="bg-white border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer w-full sm:w-64"
                >
                  <option value="all">📁 All Categories & Subcategories</option>
                  {parentCategories.map(parent => {
                    const subs = getSubcategories(parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>📂 {parent.name} (Main)</option>
                        {subs.map(sub => (
                          <option key={sub.id} value={sub.id}>&nbsp;&nbsp;&nbsp;&nbsp;└─ {sub.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="w-full sm:w-72">
                <input 
                  type="text" 
                  placeholder="Search catalog products..." 
                  value={catalogSearchQuery}
                  onChange={e => setCatalogSearchQuery(e.target.value)}
                  className="w-full bg-white border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-medium outline-none"
                />
              </div>
            </div>

            {filteredCatalogProducts.length === 0 ? (
              <p className="text-center py-16 text-stone-400 italic">No products found matching your filter.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCatalogProducts.map(p => {
                  const variants = p.product_variants || p.variants || [];
                  return (
                    <div key={p.id} className="bg-stone-50 p-4 rounded-3xl border border-stone-200/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="aspect-[4/3] bg-white rounded-2xl border border-stone-200 overflow-hidden flex items-center justify-center p-2 relative">
                          <img src={p.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                          <span className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded uppercase ${p.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {p.approval_status || 'pending'}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-sm line-clamp-1">{p.name}</h4>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold inline-block border border-emerald-200">{p.categories?.name || 'General'}</span>
                      </div>

                      {variants.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-stone-200">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Variants & Pricing:</span>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {variants.map((v, idx) => {
                              const vPrice = Number(v.price || 0);
                              const vMrp = Number(v.mrp || 0);
                              const hasMrp = vMrp > vPrice;
                              const discount = hasMrp ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;

                              return (
                                <div key={v.id || idx} className="bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-800">{v.unit_label || v.label || 'Pack'} (Stock: {v.stock ?? 0})</span>
                                  <div className="text-right">
                                    <div className="flex items-baseline gap-1 justify-end">
                                      <span className="font-black text-slate-900">₹{vPrice.toFixed(2)}</span>
                                      {hasMrp && <span className="text-[9px] text-stone-400 line-through">₹{vMrp.toFixed(2)}</span>}
                                    </div>
                                    {discount > 0 && <span className="text-[9px] text-emerald-700 font-black">{discount}% OFF</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => setIsCatalogModalOpen(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase cursor-pointer transition">
              Close Catalog
            </button>
          </div>
        </div>
      )}

      {/* Inspected Product Details Modal */}
      {inspectedProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <img src={inspectedProduct.image_url || '/placeholder.png'} alt="" className="w-12 h-12 object-cover rounded-2xl border bg-white shrink-0" />
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{inspectedProduct.categories?.name || 'Product'}</span>
                  <h3 className="font-black text-base text-slate-900 mt-0.5">{inspectedProduct.name}</h3>
                </div>
              </div>
              <button onClick={() => setInspectedProduct(null)} className="p-2 bg-emerald-50 rounded-full text-stone-600 hover:bg-emerald-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider block">Variant Pricing & Stock Tiers</span>
                <div className="space-y-2">
                  {(inspectedProduct.product_variants || inspectedProduct.variants || []).map((v, idx) => {
                    const vPrice = Number(v.price || 0);
                    const vMrp = Number(v.mrp || 0);
                    const hasMrp = vMrp > vPrice;
                    const discount = hasMrp ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;

                    return (
                      <div key={v.id || idx} className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-black text-slate-900 block">{v.unit_label || v.label || 'Standard Pack'}</span>
                          <span className="text-[10px] text-stone-500 font-bold">Inventory Stock: {v.stock ?? 0} units</span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="font-black text-slate-900 text-sm">₹{vPrice.toFixed(2)}</span>
                            {hasMrp && (
                              <span className="text-xs text-stone-400 line-through">₹{vMrp.toFixed(2)}</span>
                            )}
                          </div>
                          {discount > 0 && (
                            <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={() => setInspectedProduct(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase cursor-pointer transition">
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Inspected Order Details Modal */}
      {inspectedOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Order Fulfillment Details</span>
                <h3 className="font-black text-base text-slate-900 mt-1">Order #{inspectedOrder.id.slice(0, 8)}</h3>
              </div>
              <button onClick={() => setInspectedOrder(null)} className="p-2 bg-emerald-50 rounded-full text-stone-600 hover:bg-emerald-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <div className="space-y-4">
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider block">Customer Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-emerald-700 shrink-0" />
                    <span>Email: <strong className="text-slate-900">{inspectedOrder.customer_email || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-emerald-700 shrink-0" />
                    <span>Phone: <strong className="text-slate-900">{inspectedOrder.phone || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-1">
                <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider block">Delivery Address</span>
                <p className="text-stone-700 font-medium leading-snug flex items-start gap-1.5">
                  <MapPin size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{inspectedOrder.delivery_address || 'No address provided'}</span>
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider block">Ordered Items & Variants</span>
                <div className="space-y-2">
                  {(inspectedOrder.matched_items || []).map((item, i) => {
                    const prod = item.products || {};
                    const images = prod.images || prod.gallery || [prod.image_url].filter(Boolean);
                    const variantsList = prod.product_variants || prod.variants || [];
                    const matchedVar = variantsList.find(v => String(v.id) === String(item.variant_id) || String(v.unit_label || v.label || '') === String(item.variant_label || ''));
                    const itemMrp = Number(matchedVar?.mrp || prod.mrp || item.price || 0);

                    return (
                      <div key={i} className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={images[0] || '/placeholder.png'} alt="" className="w-10 h-10 object-cover rounded-xl bg-white border shrink-0" />
                          <div className="min-w-0">
                            <span className="font-black text-slate-900 block truncate">{prod.name || 'Product'}</span>
                            <div className="flex items-center gap-2 text-[10px] text-stone-500 font-medium mt-0.5">
                              {item.variant_label && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">{item.variant_label}</span>}
                              <span>Qty: {item.quantity}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-slate-900 block">₹{Number(item.price || 0) * Number(item.quantity || 1)}</span>
                          {itemMrp > Number(item.price || 0) && (
                            <span className="text-[10px] text-stone-400 line-through">₹{itemMrp * Number(item.quantity || 1)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-100 flex justify-between items-center font-black text-sm text-slate-900">
                <span>Total Order Amount:</span>
                <span className="text-emerald-700">₹{inspectedOrder.total_amount}</span>
              </div>
            </div>

            <button onClick={() => setInspectedOrder(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase cursor-pointer transition">
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
              <h3 className="font-black text-base text-slate-900">{editingEntity ? 'Edit Account Details' : 'Create New Team Account'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-emerald-50 rounded-full text-stone-600 hover:bg-emerald-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              {!editingEntity && (
                <div className="space-y-1.5">
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">Select Role Type</label>
                  <select className="w-full border border-emerald-200 p-3.5 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-900 outline-none focus:border-emerald-600 cursor-pointer" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="delivery">Delivery Partner / Boy</option>
                    <option value="manager">Store Manager</option>
                    <option value="shopkeeper">Shopkeeper / Vendor</option>
                  </select>
                </div>
              )}

              {!editingEntity && (
                <>
                  <div className="space-y-1.5">
                    <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">Email Address</label>
                    <input type="email" required className="w-full border border-emerald-200 p-3.5 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-900 outline-none focus:border-emerald-600" placeholder="name@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">Password</label>
                    <input type="password" required className="w-full border border-emerald-200 p-3.5 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-900 outline-none focus:border-emerald-600" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                </>
              )}

              {(form.role === 'shopkeeper' || editingEntity?.type === 'shopkeeper') && (
                <div className="space-y-3 pt-3 border-t border-emerald-100">
                  <p className="font-black text-slate-900 text-xs uppercase tracking-wider">Store Details</p>
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-600 text-[11px]">Store Name</label>
                    <input type="text" required className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium outline-none" placeholder="Harraiya Organic Store" value={form.store_name} onChange={e => setForm({...form, store_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-600 text-[11px]">Contact Person / Owner Name</label>
                    <input type="text" className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium outline-none" placeholder="Vivek Kumar" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-600 text-[11px]">Phone Number</label>
                    <input type="tel" className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium outline-none" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-600 text-[11px]">Pickup Address</label>
                    <input type="text" className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium outline-none" placeholder="Main Market, Harraiya" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                </div>
              )}

              {editingEntity?.type === 'staff' && (
                <div className="space-y-1.5">
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">Change Role</label>
                  <select className="w-full border border-emerald-200 p-3.5 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-900 outline-none cursor-pointer" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="delivery">Delivery Partner / Boy</option>
                    <option value="manager">Store Manager</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 rounded-2xl transition text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 mt-2 cursor-pointer active:scale-95">
                {editingEntity ? 'Save Changes' : 'Create Account & Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin User Detail Performance Modal */}
      <AdminUserDetailModal 
        user={selectedUser} 
        role={selectedRole} 
        isOpen={Boolean(selectedUser)} 
        onClose={() => setSelectedUser(null)} 
      />
    </div>
  );
}