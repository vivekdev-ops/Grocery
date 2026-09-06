// src/components/ShopkeeperDetailsAdmin.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Store, Package, Mail, Phone, User, CheckCircle, Clock, ShieldCheck, MapPin, Sparkles, Layers } from 'lucide-react';

export default function ShopkeeperDetailsAdmin() {
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [shopkeeperProducts, setShopkeeperProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopkeepers();
  }, []);

  const fetchShopkeepers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shopkeeper_profiles')
      .select('*')
      .order('store_name');

    if (!error) {
      setShopkeepers(data || []);
      if (data && data.length > 0) {
        handleSelectShopkeeper(data[0]);
      }
    }
    setLoading(false);
  };

  const handleSelectShopkeeper = async (shopkeeper) => {
    setSelectedShopkeeper(shopkeeper);
    // Fetch products along with categories and product_variants
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name), product_variants(*)')
      .eq('shopkeeper_id', shopkeeper.id);

    if (!error) {
      setShopkeeperProducts(data || []);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Loading merchant details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl border border-emerald-800/50 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <Store size={180} />
        </div>
        <div className="relative z-10 space-y-1">
          <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-3.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
            Merchant Moderation & Oversight
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Shopkeeper-Wise Directory</h2>
          <p className="text-xs text-emerald-200/80 max-w-xl">
            Inspect verified store profiles, merchant contact information, and audit individual inventory listings and pricing per vendor.
          </p>
        </div>
        <div className="bg-emerald-900/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-700/60 text-right relative z-10">
          <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider block">Total Merchants</span>
          <span className="text-xl font-black text-white">{shopkeepers.length} Active Stores</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Shopkeepers List Sidebar */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm space-y-3 h-[680px] overflow-y-auto">
          <div className="flex items-center justify-between px-2 pt-2">
            <h3 className="font-black text-xs text-emerald-900 uppercase tracking-wider">Registered Vendors</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">{shopkeepers.length}</span>
          </div>

          {shopkeepers.length === 0 ? (
            <p className="text-xs text-stone-400 italic py-12 text-center">No shopkeepers found.</p>
          ) : (
            <div className="space-y-2">
              {shopkeepers.map(sk => {
                const isSelected = selectedShopkeeper?.id === sk.id;
                return (
                  <div 
                    key={sk.id}
                    onClick={() => handleSelectShopkeeper(sk)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-600/20' 
                        : 'bg-stone-50/60 hover:bg-emerald-50/30 border-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isSelected ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        <Store size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm text-slate-900 truncate">{sk.store_name || 'Unnamed Store'}</h4>
                        <p className="text-[11px] text-stone-500 truncate font-medium mt-0.5">{sk.owner_name || sk.email || 'Merchant'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Shopkeeper Details View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedShopkeeper ? (
            <>
              {/* Profile Overview Card */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-6 relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <ShieldCheck size={140} />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={11} /> Verified Partner Store
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedShopkeeper.store_name}</h3>
                  </div>
                  <div className="bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-200 text-right w-full sm:w-auto">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Total Catalog Items</span>
                    <span className="text-xl font-black text-emerald-800">{shopkeeperProducts.length} Products</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Store Owner</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedShopkeeper.owner_name || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Phone size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Contact Phone</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedShopkeeper.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Email Address</span>
                      <span className="font-bold text-slate-900 text-xs truncate block">{selectedShopkeeper.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Store Location</span>
                      <span className="font-bold text-slate-900 text-xs truncate block">{selectedShopkeeper.address || 'Location registered on file'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory / Products Table */}
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Package size={18} className="text-emerald-700" /> Products Listed by {selectedShopkeeper.store_name}
                  </h4>
                  <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full">{shopkeeperProducts.length} Items</span>
                </div>

                {shopkeeperProducts.length === 0 ? (
                  <div className="text-center py-12 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-2">
                    <Package size={36} className="text-stone-300 mx-auto" />
                    <p className="text-xs text-stone-500 font-bold">No products found for this shopkeeper.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {shopkeeperProducts.map(prod => {
                      const isApproved = prod.approval_status === 'approved';
                      const variants = prod.product_variants || prod.variants || [];

                      return (
                        <div key={prod.id} className="p-4 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-3 hover:bg-emerald-50/50 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-emerald-200 shrink-0 flex items-center justify-center p-1">
                                <img src={prod.image_url || '/placeholder.png'} alt="" className="w-full h-full object-contain" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 block truncate text-sm">{prod.name}</span>
                                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block border border-emerald-200 mt-0.5">
                                  {prod.categories?.name || 'Uncategorized'}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                              isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {prod.approval_status || 'pending'}
                            </span>
                          </div>

                          {/* Variants & Pricing Breakdown */}
                          {variants.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-emerald-100">
                              <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider flex items-center gap-1">
                                <Layers size={12} className="text-emerald-700" /> Variant Price Tiers:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {variants.map((v, idx) => {
                                  const vPrice = Number(v.price || 0);
                                  const vMrp = Number(v.mrp || 0);
                                  const hasMrp = vMrp > vPrice;
                                  const discount = hasMrp ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;

                                  return (
                                    <div key={v.id || idx} className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-bold text-slate-800 block">{v.unit_label || v.label || 'Standard'}</span>
                                        <span className="text-[10px] text-stone-400">Stock: {v.stock ?? 0}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="flex items-baseline gap-1.5 justify-end">
                                          <span className="font-black text-slate-900">₹{vPrice.toFixed(2)}</span>
                                          {hasMrp && (
                                            <span className="text-[10px] text-stone-400 line-through">₹{vMrp.toFixed(2)}</span>
                                          )}
                                        </div>
                                        {discount > 0 && (
                                          <span className="text-[9px] text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                            {discount}% OFF
                                          </span>
                                        )}
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
              </div>
            </>
          ) : (
            <div className="bg-white p-16 rounded-3xl border border-emerald-100 text-center text-stone-400 font-medium">
              Select a merchant from the directory to inspect store details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}