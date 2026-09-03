// src/components/CustomerOrdersPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Package, MapPin, FileText, Gift, Shield, LogOut, CheckCircle2, ChevronRight, ArrowLeft, Download, MessageSquare, Copy, Check, User, Plus, Edit2, Trash2, Phone, Save, ChevronDown, Upload } from 'lucide-react';
import StoreHeader from './store/StoreHeader';
import Footer from './Footer';
import InvoiceModal from './InvoiceModal';

export default function CustomerOrdersPage() {
  const [session, setSession] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'addresses' | 'profile'
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Address Form State for Add / Edit
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    title: 'Home',
    house_no: '',
    ward_no_name: '',
    city: 'Harraiya',
    district: 'Basti',
    state: 'Uttar Pradesh',
    pincode: '272155',
    phone: '',
    latitude: null,
    longitude: null
  });

  // Profile Form, Base64 Image Reader & Multiselect Dropdown State
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    interests: []
  });

  const availableInterests = [
    'Organic Groceries',
    'Snacks & Munchies',
    'Dairy & Milk',
    'Fresh Fruits & Vegetables',
    'Beverages & Juices',
    'Personal Care',
    'Household Essentials'
  ];

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
        fetchUserData(session.user.id, session.user.email);
      }
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navigate]);

  const fetchUserData = async (userId, email) => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setCustomerProfile(profileData);
        let parsedInterests = [];
        if (typeof profileData.interests === 'string') {
          parsedInterests = profileData.interests.split(',').map(i => i.trim()).filter(Boolean);
        } else if (Array.isArray(profileData.interests)) {
          parsedInterests = profileData.interests;
        }

        setProfileForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || '',
          interests: parsedInterests
        });
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });

      if (ordersData) setMyOrders(ordersData);

      const { data: addressData } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (addressData) setSavedAddresses(addressData);
    } catch (err) {
      console.error('Error loading account data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyOrderId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setProfileForm(prev => ({ ...prev, phone: val }));
    }
  };

  const handleInterestToggle = (interest) => {
    setProfileForm(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      } else {
        return { ...prev, interests: [...prev.interests, interest] };
      }
    });
  };

  // Base64 Reader approach to bypass bucket-not-found issues and save reliably locally/in DB
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, avatar_url: reader.result }));
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Failed to read local file.');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    console.log("Save Profile button clicked! Current form state:", profileForm);

    if (!session?.user) {
      alert("No active session found. Please log in again.");
      return;
    }

    if (!profileForm.phone || profileForm.phone.length !== 10) {
      alert('Mobile number must be exactly 10 numeric digits.');
      return;
    }

    setSavingProfile(true);
    try {
      const interestsString = Array.isArray(profileForm.interests) ? profileForm.interests.join(', ') : profileForm.interests;
      
      const updates = {
        user_id: session.user.id,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        avatar_url: profileForm.avatar_url,
        interests: interestsString,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('customer_profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) {
        console.error('Supabase save error details:', error);
        throw error;
      }

      setCustomerProfile(updates);
      alert('Profile settings saved successfully!');
    } catch (err) {
      alert('Error saving profile: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      title: 'Home',
      house_no: '',
      ward_no_name: '',
      city: 'Harraiya',
      district: 'Basti',
      state: 'Uttar Pradesh',
      pincode: '272155',
      phone: profileForm.phone || '',
      latitude: null,
      longitude: null
    });
    setShowAddressForm(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAddressForm(prev => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
        },
        (err) => console.warn('Geolocation error:', err.message),
        { timeout: 10000 }
      );
    }
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      title: addr.title || 'Home',
      house_no: addr.house_no || '',
      ward_no_name: addr.ward_no_name || '',
      city: addr.city || 'Harraiya',
      district: addr.district || 'Basti',
      state: addr.state || 'Uttar Pradesh',
      pincode: addr.pincode || '272155',
      phone: addr.phone || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null
    });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!session) return;

    const fullFormattedAddress = `${addressForm.house_no}, ${addressForm.ward_no_name}, ${addressForm.city}, ${addressForm.district}, ${addressForm.state} - ${addressForm.pincode}`;

    if (editingAddressId) {
      const { error } = await supabase
        .from('customer_addresses')
        .update({
          title: addressForm.title,
          house_no: addressForm.house_no,
          ward_no_name: addressForm.ward_no_name,
          city: addressForm.city,
          district: addressForm.district,
          state: addressForm.state,
          pincode: addressForm.pincode,
          phone: addressForm.phone,
          address: fullFormattedAddress
        })
        .eq('id', editingAddressId);

      if (error) {
        alert('Error updating address: ' + error.message);
      } else {
        alert('Address updated successfully!');
        setShowAddressForm(false);
        fetchUserData(session.user.id, session.user.email);
      }
    } else {
      const { error } = await supabase
        .from('customer_addresses')
        .insert([{
          user_id: session.user.id,
          title: addressForm.title,
          house_no: addressForm.house_no,
          ward_no_name: addressForm.ward_no_name,
          city: addressForm.city,
          district: addressForm.district,
          state: addressForm.state,
          pincode: addressForm.pincode,
          phone: addressForm.phone,
          latitude: addressForm.latitude,
          longitude: addressForm.longitude,
          address: fullFormattedAddress
        }]);

      if (error) {
        alert('Error adding address: ' + error.message);
      } else {
        alert('Address added successfully!');
        setShowAddressForm(false);
        fetchUserData(session.user.id, session.user.email);
      }
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    await supabase.from('customer_addresses').delete().eq('id', id);
    if (session) fetchUserData(session.user.id, session.user.email);
  };

  const userPhone = profileForm.phone || session?.user?.email || '8955782853';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
      <StoreHeader session={session} customerProfile={customerProfile} totalItemsCount={0} onOpenCart={() => {}} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Left Sidebar Navigation */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden md:col-span-1">
            <div 
              onClick={() => setActiveTab('profile')} 
              className="p-5 border-b border-stone-100 bg-stone-50/50 hover:bg-emerald-50/40 transition cursor-pointer group"
              title="Manage Profile"
            >
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition">
                  {profileForm.full_name || 'My Account'}
                </p>
                <ChevronRight size={14} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-stone-500 text-xs mt-0.5 font-medium truncate">{userPhone}</p>
            </div>

            <nav className="p-2 space-y-1 text-xs font-bold text-stone-600">
              <button 
                onClick={() => { setActiveTab('addresses'); setShowAddressForm(false); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${activeTab === 'addresses' ? 'bg-emerald-50 text-emerald-800 font-black' : 'hover:bg-stone-50'}`}
              >
                <MapPin size={16} className={activeTab === 'addresses' ? 'text-emerald-600' : 'text-stone-400'} /> My Addresses
              </button>
              <button 
                onClick={() => { setActiveTab('orders'); setSelectedOrder(null); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-800 font-black' : 'hover:bg-stone-50'}`}
              >
                <Package size={16} className={activeTab === 'orders' ? 'text-emerald-600' : 'text-stone-400'} /> My Orders
              </button>
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-800 font-black' : 'hover:bg-stone-50'}`}
              >
                <User size={16} className={activeTab === 'profile' ? 'text-emerald-600' : 'text-stone-400'} /> Profile Settings
              </button>
              <button onClick={() => alert('Prescriptions feature')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-stone-50 transition cursor-pointer">
                <FileText size={16} className="text-stone-400" /> My Prescriptions
              </button>
              <button onClick={() => alert('Gift cards')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-stone-50 transition cursor-pointer">
                <Gift size={16} className="text-stone-400" /> E-Gift Cards
              </button>
              <button onClick={() => navigate('/privacy-policy')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-stone-50 transition cursor-pointer">
                <Shield size={16} className="text-stone-400" /> Account privacy
              </button>
              <div className="pt-2 border-t border-stone-100 mt-2">
                <button onClick={() => { supabase.auth.signOut(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-50 transition cursor-pointer">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="md:col-span-3 space-y-4">
            
            {activeTab === 'profile' ? (
              /* --- PROFILE SETTINGS VIEW WITH LOCAL FILE UPLOAD & MULTISELECT --- */
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <h2 className="font-black text-lg text-slate-900">Profile Settings</h2>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Manage your personal information and preferences</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                  
                  {/* Avatar Upload Preview & Local File Input */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 overflow-hidden flex items-center justify-center shrink-0">
                      {profileForm.avatar_url ? (
                        <img src={profileForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-emerald-700" />
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="block font-black text-stone-700 uppercase text-[10px] tracking-wider">Profile Picture</label>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer transition">
                        <Upload size={14} />
                        <span>{uploadingImage ? 'Loading...' : 'Browse Local File'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarFileUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-stone-700 uppercase text-[10px] tracking-wider">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input 
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={profileForm.full_name}
                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-medium focus:border-emerald-600 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Mobile Number with strict 10-digit validation */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-stone-700 uppercase text-[10px] tracking-wider">Mobile Number (10 Digits)</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input 
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={profileForm.phone}
                        onChange={handlePhoneChange}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-mono font-bold tracking-widest focus:border-emerald-600 focus:bg-white transition"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400">Must be exactly 10 numeric digits.</p>
                  </div>

                  {/* Interests & Preferences Multiselect Dropdown */}
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="block font-black text-stone-700 uppercase text-[10px] tracking-wider">Interests & Preferences (Multiselect)</label>
                    <p className="text-[11px] text-stone-500">Choose categories to tailor your recommendations:</p>
                    
                    <div 
                      onClick={() => setIsDropdownOpen(prev => !prev)}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl cursor-pointer flex items-center justify-between transition hover:border-emerald-500"
                    >
                      <div className="flex flex-wrap gap-1.5 min-h-[20px] items-center">
                        {profileForm.interests.length === 0 ? (
                          <span className="text-stone-400 font-medium">Select preferences...</span>
                        ) : (
                          profileForm.interests.map(item => (
                            <span key={item} className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              {item}
                            </span>
                          ))
                        )}
                      </div>
                      <ChevronDown size={16} className={`text-stone-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-stone-200 shadow-xl py-2 z-50 max-h-56 overflow-y-auto space-y-0.5">
                        {availableInterests.map(item => {
                          const isSelected = profileForm.interests.includes(item);
                          return (
                            <div
                              key={item}
                              onClick={() => handleInterestToggle(item)}
                              className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-black' : 'hover:bg-stone-50 text-stone-700 font-medium'
                              }`}
                            >
                              <span>{item}</span>
                              {isSelected && <Check size={14} className="text-emerald-700" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={savingProfile || profileForm.phone.length !== 10}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider transition shadow-lg shadow-emerald-700/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> {savingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
                    </button>
                  </div>

                </form>
              </div>
            ) : activeTab === 'addresses' ? (
              /* --- SAVED ADDRESSES VIEW --- */
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                  <h1 className="font-black text-lg text-slate-900">Saved Addresses</h1>
                  {!showAddressForm && (
                    <button 
                      onClick={handleOpenAddAddress}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={14} /> Add Address
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <form onSubmit={handleSaveAddress} className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-200 space-y-3.5 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-black text-emerald-900 text-sm">{editingAddressId ? 'Edit Address' : 'Add New Address'}</p>
                      <button 
                        type="button" 
                        onClick={() => setShowAddressForm(false)}
                        className="text-stone-500 font-bold hover:text-stone-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Address Title (Home / Work)</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                        value={addressForm.title}
                        onChange={e => setAddressForm({...addressForm, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">House / Flat No.</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Flat 402, Block B"
                          className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                          value={addressForm.house_no}
                          onChange={e => setAddressForm({...addressForm, house_no: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Ward / Colony / Street</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Civil Lines"
                          className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                          value={addressForm.ward_no_name}
                          onChange={e => setAddressForm({...addressForm, ward_no_name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">City</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                          value={addressForm.city}
                          onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">District</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                          value={addressForm.district}
                          onChange={e => setAddressForm({...addressForm, district: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Pincode</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                          value={addressForm.pincode}
                          onChange={e => setAddressForm({...addressForm, pincode: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Contact Phone Number</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="10-digit mobile number"
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none font-medium"
                        value={addressForm.phone}
                        onChange={e => setAddressForm({...addressForm, phone: e.target.value})}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-black uppercase tracking-wider transition shadow-sm cursor-pointer mt-2"
                    >
                      {editingAddressId ? 'Update Address' : 'Save Address'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {savedAddresses.length === 0 ? (
                      <p className="text-stone-400 italic py-8 text-center">No saved addresses found. Click "Add Address" above to create one.</p>
                    ) : (
                      savedAddresses.map(addr => (
                        <div key={addr.id} className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/80 flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 block text-xs">{addr.title}</span>
                            <span className="text-stone-600 block mt-1 text-xs leading-relaxed">{addr.address}</span>
                            <span className="text-stone-400 font-mono text-[11px] block mt-1">Phone: {addr.phone}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => handleOpenEditAddress(addr)}
                              className="p-2 text-stone-500 hover:text-emerald-700 rounded-lg transition cursor-pointer"
                              title="Edit Address"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-2 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                              title="Delete Address"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : !selectedOrder ? (
              /* --- ORDERS LIST VIEW --- */
              <>
                <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs flex justify-between items-center">
                  <h1 className="font-black text-lg text-slate-900">Your Orders</h1>
                  <span className="text-xs font-bold text-stone-500">{myOrders.length} Total Orders</span>
                </div>

                {loading ? (
                  <div className="bg-white p-12 rounded-3xl text-center text-stone-400 font-medium">Loading orders...</div>
                ) : myOrders.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl text-center space-y-3">
                    <Package size={48} className="mx-auto text-stone-300" />
                    <p className="font-bold text-stone-700">No orders found</p>
                    <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs cursor-pointer">Start Shopping</button>
                  </div>
                ) : (
                  myOrders.map(order => {
                    const dateFormatted = new Date(order.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 space-y-4 hover:border-emerald-500 transition cursor-pointer group"
                      >
                        <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <CheckCircle2 size={18} />
                            </div>
                            <div>
                              <p className="font-black text-sm text-slate-900 capitalize">
                                {order.status === 'delivered' ? 'Arrived / Delivered' : order.status}
                              </p>
                              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                ₹{order.total_amount} • {dateFormatted}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-1 transition-transform" />
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="flex gap-3 overflow-x-auto py-1">
                          {order.order_items?.map(item => {
                            const img = item.products?.image_url || (item.products?.images && item.products.images[0]) || '';
                            return (
                              <div key={item.id} className="w-16 h-16 rounded-2xl border border-stone-200 bg-stone-50 p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                {img ? (
                                  <img src={img} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <Package size={20} className="text-stone-300" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              /* --- ORDER DETAILS SCREEN --- */
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
                
                {/* Back button & Title */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition cursor-pointer text-stone-700"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="text-right">
                    <button 
                      onClick={() => setSelectedInvoiceOrder(selectedOrder)}
                      className="inline-flex items-center gap-1.5 text-emerald-700 font-black text-xs hover:underline cursor-pointer"
                    >
                      <Download size={14} /> Download Invoice
                    </button>
                  </div>
                </div>

                {/* Arrived status & time */}
                <div>
                  <h2 className="font-black text-lg text-slate-900">Order summary</h2>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Arrived at {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>

                {/* Items in this order */}
                <div className="space-y-3 pt-2">
                  <p className="font-black text-xs text-stone-900 uppercase tracking-wider">{selectedOrder.order_items?.length || 0} items in this order</p>
                  <div className="space-y-3 divide-y divide-stone-100">
                    {selectedOrder.order_items?.map(item => {
                      const img = item.products?.image_url || (item.products?.images && item.products.images[0]) || '';
                      return (
                        <div key={item.id} className="pt-3 flex items-center justify-between gap-4 first:pt-0">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-14 rounded-2xl border border-stone-200 bg-stone-50 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                              <img src={img} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">{item.products?.name || 'Product Item'}</p>
                              <p className="text-[11px] text-stone-500 mt-0.5">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-black text-slate-900 text-xs shrink-0">₹{item.price * item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bill details */}
                <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/60 space-y-2 text-xs">
                  <p className="font-black text-stone-900 uppercase tracking-wider text-[11px] mb-2">Bill details</p>
                  <div className="flex justify-between text-stone-600">
                    <span>Item total</span>
                    <span className="font-bold text-stone-900">₹{selectedOrder.total_amount}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Handling charge</span>
                    <span className="font-bold text-stone-900">+₹5</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery charges</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-stone-200 font-black text-slate-900 text-sm">
                    <span>Bill total</span>
                    <span>₹{selectedOrder.total_amount}</span>
                  </div>
                </div>

                {/* Order details meta info */}
                <div className="space-y-3 text-xs border-t border-stone-100 pt-4">
                  <p className="font-black text-stone-900 uppercase tracking-wider text-[11px]">Order details</p>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-stone-400 text-[10px] uppercase font-bold">Order id</p>
                      <p className="font-mono font-bold text-stone-800 mt-0.5">ORD{selectedOrder.id.replace(/-/g, '').slice(0, 12).toUpperCase()}</p>
                    </div>
                    <button 
                      onClick={() => copyOrderId(selectedOrder.id)}
                      className="p-2 text-stone-500 hover:text-emerald-700 transition cursor-pointer"
                      title="Copy Order ID"
                    >
                      {copiedId ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </div>

                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Payment</p>
                    <p className="font-medium text-stone-800 mt-0.5">Paid Online</p>
                  </div>

                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Deliver to</p>
                    <p className="font-medium text-stone-800 mt-0.5 leading-snug">{selectedOrder.delivery_address}</p>
                  </div>

                  <div>
                    <p className="text-stone-400 text-[10px] uppercase font-bold">Order placed</p>
                    <p className="font-medium text-stone-800 mt-0.5">
                      {new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Need help with your order banner */}
                <div className="pt-2 border-t border-stone-100">
                  <p className="font-black text-stone-900 uppercase tracking-wider text-[11px] mb-3">Need help with your order?</p>
                  <button 
                    onClick={() => alert('Opening customer support chat...')}
                    className="w-full bg-stone-50 hover:bg-stone-100 p-4 rounded-2xl border border-stone-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-stone-900 text-xs">Chat with us</p>
                        <p className="text-[11px] text-stone-500 font-medium">About any issues related to your order</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-stone-400" />
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* Invoice Modal Integration */}
      <InvoiceModal 
        order={selectedInvoiceOrder} 
        isOpen={Boolean(selectedInvoiceOrder)} 
        onClose={() => setSelectedInvoiceOrder(null)} 
      />

      <Footer />
    </div>
  );
}