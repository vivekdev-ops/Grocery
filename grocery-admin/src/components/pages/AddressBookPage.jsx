// src/components/pages/AddressBookPage.jsx
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Trash2,
  X,
  Navigation,
  ArrowRight,
  Sparkles,
  Building,
  Briefcase,
  Bookmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../../supabaseClient';
import StoreHeader from '../store/StoreHeader';
import Footer from '../Footer';

const emptyAddressForm = {
  title: 'Home',
  house_no: '',
  ward_no_name: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  phone: '',
  address: '',
  latitude: null,
  longitude: null,
  is_default: false,
};

const CustomerAddressBookPage = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (!session || !session.user) {
          navigate('/login');
          return;
        }

        const currentUser = session.user;
        setAuthUser(currentUser);

        const { data: profileData } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (!mounted) return;
        setUser(profileData || { user_id: currentUser.id });

        await loadAddresses(currentUser.id);
      } catch (error) {
        console.error('Address book initialization error:', error);
        navigate('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const loadAddresses = async (overrideUserId = null) => {
    const ownerUserId = overrideUserId || authUser?.id || user?.user_id;

    if (!ownerUserId) {
      setAddresses([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', ownerUserId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddresses([]);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      ...emptyAddressForm,
      is_default: addresses.length === 0,
    });
    setShowAddressForm(true);
  };

  const handleEditAddress = (address) => {
    if (!address) return;
    setEditingAddress(address);
    setAddressForm({
      title: address.title || 'Home',
      house_no: address.house_no || '',
      ward_no_name: address.ward_no_name || '',
      city: address.city || '',
      district: address.district || '',
      state: address.state || '',
      pincode: address.pincode || '',
      phone: address.phone || '',
      address: address.address || '',
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      is_default: Boolean(address.is_default),
    });
    setShowAddressForm(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    const ownerUserId = authUser?.id || user?.user_id;

    if (!ownerUserId) {
      alert('Login required.');
      return;
    }

    if (
      !addressForm.house_no?.trim() ||
      !addressForm.city?.trim() ||
      !addressForm.state?.trim() ||
      !addressForm.pincode?.trim()
    ) {
      alert('Fill required fields.');
      return;
    }

    if (!/^\d{6}$/.test(String(addressForm.pincode).trim())) {
      alert('Invalid pincode.');
      return;
    }

    try {
      setSavingAddress(true);

      const payload = {
        user_id: ownerUserId,
        title: addressForm.title || 'Home',
        house_no: addressForm.house_no?.trim() || null,
        ward_no_name: addressForm.ward_no_name?.trim() || null,
        city: addressForm.city?.trim() || null,
        district: addressForm.district?.trim() || null,
        state: addressForm.state?.trim() || null,
        pincode: addressForm.pincode?.trim() || null,
        phone: addressForm.phone?.trim() || null,
        address: addressForm.address?.trim() || null,
        latitude: addressForm.latitude !== null && addressForm.latitude !== '' ? Number(addressForm.latitude) : null,
        longitude: addressForm.longitude !== null && addressForm.longitude !== '' ? Number(addressForm.longitude) : null,
        is_default: Boolean(addressForm.is_default),
      };

      if (payload.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', ownerUserId);
      }

      if (editingAddress?.id) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq('id', editingAddress.id)
          .eq('user_id', ownerUserId);

        if (error) throw error;
        alert('Updated.');
      } else {
        const shouldBeDefault = payload.is_default || addresses.length === 0;
        const finalPayload = { ...payload, is_default: shouldBeDefault };

        if (shouldBeDefault && addresses.length > 0) {
          await supabase
            .from('customer_addresses')
            .update({ is_default: false })
            .eq('user_id', ownerUserId);
        }

        const { error } = await supabase
          .from('customer_addresses')
          .insert(finalPayload);

        if (error) throw error;
        alert('Saved.');
      }

      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({ ...emptyAddressForm });
      await loadAddresses();
    } catch (error) {
      console.error('Address save error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (address) => {
    if (!address?.id) return;
    if (!window.confirm('Delete address?')) return;

    const ownerUserId = authUser?.id || user?.user_id;

    try {
      setDeletingAddressId(address.id);
      const wasDefault = Boolean(address.is_default);

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', address.id)
        .eq('user_id', ownerUserId);

      if (error) throw error;

      let remaining = addresses.filter((item) => item.id !== address.id);

      if (wasDefault && remaining.length > 0) {
        const nextDefaultId = remaining[0].id;
        const { data } = await supabase
          .from('customer_addresses')
          .update({ is_default: true })
          .eq('id', nextDefaultId)
          .eq('user_id', ownerUserId)
          .select()
          .single();

        if (data) {
          remaining = remaining.map((item) => (item.id === nextDefaultId ? data : { ...item, is_default: false }));
        }
      }

      setAddresses(remaining);
      alert('Deleted.');
    } catch (error) {
      console.error('Delete address error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefaultAddress = async (address) => {
    if (!address?.id || address.is_default) return;
    const ownerUserId = authUser?.id || user?.user_id;

    try {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', ownerUserId);

      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', address.id)
        .eq('user_id', ownerUserId);

      if (error) throw error;
      await loadAddresses();
    } catch (error) {
      console.error('Set default address error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-xs">
        <StoreHeader session={authUser} customerProfile={user} showSearch={false} />
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50/50 to-white pb-28 md:pb-12 font-sans text-stone-900 selection:bg-emerald-500 selection:text-white text-xs">
      <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        
        {/* =================================================
            PAGE HEADER BANNER
        ================================================= */}
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            

            <button
              onClick={handleAddAddress}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-black transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Address
            </button>
        </div>

        {/* =================================================
            ADDRESS LIST SECTION
        ================================================= */}
        {addresses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <MapPin className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-sm">No saved addresses</h3>
              <p className="text-stone-400 text-xs mt-1">Add a delivery address to speed up your checkout process.</p>
            </div>
            <button
              onClick={handleAddAddress}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 cursor-pointer transition active:scale-95"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((address) => {
              const isHome = (address.title || '').toLowerCase() === 'home';
              const isWork = (address.title || '').toLowerCase() === 'work';

              return (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-3xl p-5 transition-all relative bg-white shadow-xs hover:shadow-md flex flex-col justify-between ${
                    address.is_default ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-stone-200/90'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          address.is_default ? 'bg-emerald-500 text-white shadow-sm' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {isHome ? <Home className="w-4 h-4" /> : isWork ? <Briefcase className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-stone-900 text-sm">{address.title || 'Address'}</span>
                            {address.is_default && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black uppercase tracking-wider">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer transition"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address)}
                          disabled={deletingAddressId === address.id}
                          className="p-2 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition"
                          title="Delete"
                        >
                          {deletingAddressId === address.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-stone-600 pl-1 text-xs">
                      <p className="font-bold text-stone-800 leading-relaxed">
                        {[address.house_no, address.ward_no_name, address.address].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-stone-400 font-medium">
                        {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                      </p>
                      {address.phone && (
                        <p className="text-stone-700 flex items-center gap-1.5 pt-1 font-bold">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> {address.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {!address.is_default && (
                    <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
                      <button
                        onClick={() => handleSetDefaultAddress(address)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-black cursor-pointer inline-flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl transition"
                      >
                        Set as Default <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* ADDRESS FORM MODAL */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-100"
          >
            <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-stone-900 text-sm">
                {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h2>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">Address Label</label>
                <select
                  value={addressForm.title}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">House / Flat / Block *</label>
                  <input
                    type="text"
                    value={addressForm.house_no}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, house_no: e.target.value }))}
                    required
                    placeholder="e.g. Flat 402, A-Block"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">Area / Locality</label>
                  <input
                    type="text"
                    value={addressForm.ward_no_name}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, ward_no_name: e.target.value }))}
                    placeholder="e.g. Civil Lines"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">Complete Street Address / Landmark</label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  placeholder="Near central park..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 resize-none font-medium text-stone-900 outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                    placeholder="e.g. New Delhi"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">State *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                    required
                    placeholder="e.g. Delhi"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">Pincode *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                    required
                    placeholder="110001"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px] mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="9876543210"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-bold text-stone-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                  <input
                    type="checkbox"
                    checked={Boolean(addressForm.is_default)}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-stone-800 font-black text-xs">Set as Default Delivery Address</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-black cursor-pointer hover:bg-stone-100 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-black cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition text-xs"
                >
                  {savingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Address
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

CustomerAddressBookPage.displayName = 'CustomerAddressBookPage';

export default CustomerAddressBookPage;