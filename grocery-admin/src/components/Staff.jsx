// src/components/Staff.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Edit, Mail, Phone, MapPin, ExternalLink, X, Store, Truck, Percent, Save, Plus } from 'lucide-react';
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
      // Capture current admin session to restore it right after
      const { data: sessionData } = await supabase.auth.getSession();
      const adminSession = sessionData?.session;

      // 1. Create user in auth.users
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
        // 2. Explicitly ensure staff_profiles entry is written
        await supabase.from('staff_profiles').upsert([
          { user_id: newUserId, email: form.email, role: form.role }
        ], { onConflict: 'user_id' });

        // 3. Explicitly ensure shopkeeper_profiles entry is written if role is shopkeeper
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

      // Restore admin session immediately
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
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Staff & Payout Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendors, delivery partners, and cart-value commission tiers.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-1 bg-white p-1 rounded-xl border shadow-sm">
            <button onClick={() => setActiveTab('shopkeepers')} className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'shopkeepers' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              Shopkeepers ({shopkeepers.length})
            </button>
            <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'staff' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              Staff & Delivery ({staffList.length})
            </button>
            <button onClick={() => setActiveTab('commissions')} className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${activeTab === 'commissions' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Percent size={14} /> Commission Tiers
            </button>
          </div>

          {activeTab !== 'commissions' && (
            <button 
              onClick={openAddModal}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <UserPlus size={18} /> Create Account
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'commissions' ? (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <Percent className="text-green-600" size={20} /> Cart-Value Commission Rules
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure tiered commission percentages based on order cart totals.</p>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Role</label>
                  <select 
                    value={commissionForm.role_type}
                    onChange={e => setCommissionForm({...commissionForm, role_type: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
                  >
                    <option value="shopkeeper">Shopkeeper</option>
                    <option value="delivery">Delivery Agent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Min Cart Value (₹)</label>
                  <input 
                    type="number" 
                    step="1" 
                    required 
                    placeholder="e.g. 0"
                    value={commissionForm.min_cart_value}
                    onChange={e => setCommissionForm({...commissionForm, min_cart_value: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Max Cart Value (₹)</label>
                  <input 
                    type="number" 
                    step="1" 
                    placeholder="Leave empty for infinity"
                    value={commissionForm.max_cart_value}
                    onChange={e => setCommissionForm({...commissionForm, max_cart_value: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Commission Share (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="e.g. 85"
                    value={commissionForm.commission_pct}
                    onChange={e => setCommissionForm({...commissionForm, commission_pct: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={savingRule}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> {savingRule ? 'Adding...' : 'Add Tier Rule'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-500 font-bold">
                  <th className="p-4">Role</th>
                  <th className="p-4">Cart Value Range</th>
                  <th className="p-4">Commission %</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-medium">
                {commissionRules.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">No tiered rules configured yet.</td></tr>
                ) : (
                  commissionRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="p-4 uppercase font-bold text-gray-800">{rule.role_type}</td>
                      <td className="p-4 text-gray-700 font-bold">
                        ₹{rule.min_cart_value} {rule.max_cart_value !== null ? `to ₹${rule.max_cart_value}` : 'and above'}
                      </td>
                      <td className="p-4 font-black text-green-700">{rule.commission_pct}%</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer">
                          <Trash2 size={16} />
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
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {activeTab === 'shopkeepers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
                  <th className="p-4">Store Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Pickup Address</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading shopkeepers...</td></tr>
                ) : shopkeepers.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No shopkeepers registered yet.</td></tr>
                ) : (
                  shopkeepers.map(shop => (
                    <tr key={shop.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-900 text-sm flex items-center gap-2"><Store size={16} className="text-green-600"/> {shop.store_name}</td>
                      <td className="p-4 text-gray-600 flex items-center gap-1"><Phone size={14} className="text-gray-400"/> {shop.phone || 'N/A'}</td>
                      <td className="p-4 text-gray-600"><MapPin size={14} className="inline text-red-500 mr-1"/> {shop.address || 'N/A'}</td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => { setSelectedUser(shop); setSelectedRole('shopkeeper'); }}
                          className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={14}/> View Details
                        </button>
                        <button onClick={() => openEditModal(shop, 'shopkeeper')} className="text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer" title="Edit"><Edit size={16}/></button>
                        <button onClick={() => handleDeleteShopkeeper(shop.id)} className="text-red-500 hover:text-red-700 p-1.5 cursor-pointer" title="Delete"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
                  <th className="p-4">Staff Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {loading ? (
                  <tr><td colSpan="3" className="p-8 text-center text-gray-500">Loading staff...</td></tr>
                ) : staffList.length === 0 ? (
                  <tr><td colSpan="3" className="p-8 text-center text-gray-400">No staff accounts created yet.</td></tr>
                ) : (
                  staffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-900 text-sm flex items-center gap-2"><Mail size={14} className="text-gray-400"/> {staff.email}</td>
                      <td className="p-4">
                        <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full uppercase text-[10px]">
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => { 
                            setSelectedUser(staff); 
                            setSelectedRole(staff.role === 'shopkeeper' ? 'shopkeeper' : 'delivery'); 
                          }} 
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={14}/> View Performance
                        </button>
                        <button onClick={() => openEditModal(staff, 'staff')} className="text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer" title="Edit Role"><Edit size={16}/></button>
                        <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 p-1.5 cursor-pointer" title="Delete"><Trash2 size={16}/></button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-900">{editingEntity ? 'Edit Account Details' : 'Create New Team Account'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              {!editingEntity && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Role Type</label>
                  <select className="w-full border p-3 rounded-xl text-sm bg-white font-medium outline-none focus:border-green-600" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="delivery">Delivery Partner / Boy</option>
                    <option value="manager">Store Manager</option>
                    <option value="shopkeeper">Shopkeeper / Vendor</option>
                  </select>
                </div>
              )}

              {!editingEntity && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                    <input type="email" required className="w-full border p-3 rounded-xl text-sm outline-none focus:border-green-600" placeholder="name@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Password</label>
                    <input type="password" required className="w-full border p-3 rounded-xl text-sm outline-none focus:border-green-600" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                </>
              )}

              {(form.role === 'shopkeeper' || editingEntity?.type === 'shopkeeper') && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="font-bold text-gray-900 text-xs">Store Details</p>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Store Name</label>
                    <input type="text" required className="w-full border p-2.5 rounded-xl text-sm outline-none" placeholder="Harraiya Organic Store" value={form.store_name} onChange={e => setForm({...form, store_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Phone Number</label>
                    <input type="tel" className="w-full border p-2.5 rounded-xl text-sm outline-none" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Pickup Address</label>
                    <input type="text" className="w-full border p-2.5 rounded-xl text-sm outline-none" placeholder="Main Market, Harraiya" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                </div>
              )}

              {editingEntity?.type === 'staff' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Change Role</label>
                  <select className="w-full border p-3 rounded-xl text-sm bg-white font-medium outline-none" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="delivery">Delivery Partner / Boy</option>
                    <option value="manager">Store Manager</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-md mt-2 cursor-pointer">
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