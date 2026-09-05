// src/components/Staff.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Edit, Mail, Phone, MapPin, ExternalLink, X, Store, Truck, Percent, Save, Plus, ShieldCheck } from 'lucide-react';
import AdminUserDetailModal from './AdminUserDetailModal';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [activeTab, setActiveTab] = useState('shopkeepers'); // 'shopkeepers', 'staff', or 'commissions'
  const [loading, setLoading] = useState(true);

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
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [staffRes, shopRes, rulesRes] = await Promise.all([
      supabase.from('staff_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('shopkeeper_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('cart_commission_rules').select('*').order('min_cart_value', { ascending: true })
    ]);

    if (!staffRes.error) setStaffList(staffRes.data || []);
    if (!shopRes.error) setShopkeepers(shopRes.data || []);
    if (!rulesRes.error) setCommissionRules(rulesRes.data || []);
    setLoading(false);
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
    setForm({ email: '', password: '', role: 'delivery', store_name: '', phone: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (entity, type) => {
    setEditingEntity({ ...entity, type });
    if (type === 'shopkeeper') {
      setForm({
        email: '',
        password: '',
        role: 'shopkeeper',
        store_name: entity.store_name || '',
        phone: entity.phone || '',
        address: entity.address || ''
      });
    } else {
      setForm({
        email: entity.email || '',
        password: '',
        role: entity.role || 'delivery',
        store_name: '',
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
        const { error } = await supabase.from('shopkeeper_profiles').update({
          store_name: form.store_name,
          phone: form.phone,
          address: form.address
        }).eq('id', editingEntity.id);

        if (error) alert(error.message);
        else {
          alert('Shopkeeper updated successfully!');
          closeAndResetModal();
        }
      } else {
        const { error } = await supabase.from('staff_profiles').update({
          role: form.role
        }).eq('id', editingEntity.id);

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
              phone: form.phone || '', 
              address: form.address || '' 
            }
          ], { onConflict: 'user_id' });
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
    setForm({ email: '', password: '', role: 'delivery', store_name: '', phone: '', address: '' });
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
    }
  };

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
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Staff & Payout Management</h2>
          <p className="text-xs text-emerald-200/80 max-w-xl">
            Manage vendors, delivery partners, and cart-value commission tiers seamlessly from one centralized dashboard.
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

      {/* ── METRICS & TAB NAVIGATION BAR ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
        
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('shopkeepers')} 
            className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'shopkeepers' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Store size={15} />
            <span>Shopkeepers ({shopkeepers.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('staff')} 
            className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'staff' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Truck size={15} />
            <span>Staff & Delivery ({staffList.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('commissions')} 
            className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'commissions' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Percent size={15} />
            <span>Commission Tiers</span>
          </button>
        </div>

        <div className="text-xs font-bold text-stone-500 px-2 hidden sm:block">
          {activeTab === 'commissions' ? `${commissionRules.length} Active Rules` : `Viewing ${activeTab}`}
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
        <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden">
          {activeTab === 'shopkeepers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">
                  <th className="p-4 sm:p-5">Store Name</th>
                  <th className="p-4 sm:p-5">Phone</th>
                  <th className="p-4 sm:p-5">Pickup Address</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-xs">
                {loading ? (
                  <tr><td colSpan="4" className="p-16 text-center text-stone-500 font-bold">Loading shopkeepers...</td></tr>
                ) : shopkeepers.length === 0 ? (
                  <tr><td colSpan="4" className="p-16 text-center text-stone-400 italic font-medium">No shopkeepers registered yet.</td></tr>
                ) : (
                  shopkeepers.map(shop => (
                    <tr key={shop.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-4 sm:p-5 font-black text-slate-900 text-sm flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Store size={16} />
                        </div>
                        <span>{shop.store_name}</span>
                      </td>
                      <td className="p-4 sm:p-5 text-stone-600 font-bold flex items-center gap-1.5 pt-6">
                        <Phone size={13} className="text-stone-400 shrink-0" /> {shop.phone || 'N/A'}
                      </td>
                      <td className="p-4 sm:p-5 text-stone-600 font-medium">
                        <span className="flex items-start gap-1.5 leading-snug">
                          <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" /> 
                          <span>{shop.address || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => { setSelectedUser(shop); setSelectedRole('shopkeeper'); }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer border border-emerald-200 text-xs shadow-2xs"
                          >
                            <ExternalLink size={14} /> View Details
                          </button>
                          <button onClick={() => openEditModal(shop, 'shopkeeper')} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer" title="Edit">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => handleDeleteShopkeeper(shop.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">
                  <th className="p-4 sm:p-5">Staff Email</th>
                  <th className="p-4 sm:p-5">Role</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-xs">
                {loading ? (
                  <tr><td colSpan="3" className="p-16 text-center text-stone-500 font-bold">Loading staff...</td></tr>
                ) : staffList.length === 0 ? (
                  <tr><td colSpan="3" className="p-16 text-center text-stone-400 italic font-medium">No staff accounts created yet.</td></tr>
                ) : (
                  staffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-4 sm:p-5 font-black text-slate-900 text-sm flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <Mail size={16} />
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
                            onClick={() => { 
                              setSelectedUser(staff); 
                              setSelectedRole(staff.role === 'shopkeeper' ? 'shopkeeper' : 'delivery'); 
                            }} 
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
          )}
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