// src/components/Staff.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Edit, Mail, Phone, MapPin, ExternalLink, X, Store, Truck } from 'lucide-react';
import AdminUserDetailModal from './AdminUserDetailModal';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [activeTab, setActiveTab] = useState('shopkeepers'); // 'shopkeepers' or 'staff'
  const [loading, setLoading] = useState(true);

  // Modal State for Performance Details
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('shopkeeper');

  // Modal State for CRUD (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null); // null = Creating, object = Editing
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
    const [staffRes, shopRes] = await Promise.all([
      supabase.from('staff_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('shopkeeper_profiles').select('*').order('created_at', { ascending: false })
    ]);

    if (!staffRes.error) setStaffList(staffRes.data || []);
    if (!shopRes.error) setShopkeepers(shopRes.data || []);
    setLoading(false);
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
      // UPDATE EXISTING RECORD
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
      // CREATE NEW RECORD
      const currentSession = await supabase.auth.getSession();

      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        alert(authError.message);
        return;
      }

      if (data?.user) {
        const userId = data.user.id;

        // Restore admin session
        if (currentSession?.data?.session) {
          await supabase.auth.setSession(currentSession.data.session);
        }

        if (form.role === 'shopkeeper') {
          const { error: shopError } = await supabase.from('shopkeeper_profiles').insert([{
            user_id: userId, // Satisfies foreign key constraint referencing auth.users(id)
            store_name: form.store_name || 'My Store',
            phone: form.phone || '',
            address: form.address || ''
          }]);

          if (shopError) {
            alert('Auth user created, but profile insertion failed: ' + shopError.message);
          } else {
            alert('Shopkeeper account created successfully!');
            closeAndResetModal();
          }
        } else {
          const { error: staffError } = await supabase.from('staff_profiles').insert([{
            user_id: userId,
            email: form.email,
            role: form.role
          }]);

          if (staffError) {
            alert('Auth user created, but staff profile insertion failed: ' + staffError.message);
          } else {
            alert('Staff account created successfully!');
            closeAndResetModal();
          }
        }
      }
    }
  };

  const closeAndResetModal = () => {
    setForm({ email: '', password: '', role: 'delivery', store_name: '', phone: '', address: '' });
    setEditingEntity(null);
    setIsModalOpen(false);
    fetchData();
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Staff & Shopkeeper Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendors, managers, and delivery partners with full CRUD options.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-white p-1 rounded-xl border shadow-sm">
            <button onClick={() => setActiveTab('shopkeepers')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'shopkeepers' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              Shopkeepers ({shopkeepers.length})
            </button>
            <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'staff' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              Staff & Delivery ({staffList.length})
            </button>
          </div>

          <button 
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition shadow-sm"
          >
            <UserPlus size={18} /> Create Account
          </button>
        </div>
      </div>

      {/* Main Content Table */}
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
                        className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1"
                      >
                        <ExternalLink size={14}/> View Details
                      </button>
                      <button onClick={() => openEditModal(shop, 'shopkeeper')} className="text-blue-600 hover:text-blue-800 p-1.5" title="Edit"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteShopkeeper(shop.id)} className="text-red-500 hover:text-red-700 p-1.5" title="Delete"><Trash2 size={16}/></button>
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
                        onClick={() => { setSelectedUser(staff); setSelectedRole('delivery'); }} 
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1"
                      >
                        <ExternalLink size={14}/> View Performance
                      </button>
                      <button onClick={() => openEditModal(staff, 'staff')} className="text-blue-600 hover:text-blue-800 p-1.5" title="Edit Role"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 p-1.5" title="Delete"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-900">{editingEntity ? 'Edit Account Details' : 'Create New Team Account'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><X size={18}/></button>
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

              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-md mt-2">
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