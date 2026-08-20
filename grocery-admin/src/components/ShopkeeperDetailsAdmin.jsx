// src/components/ShopkeeperDetailsAdmin.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Store, Package, Mail, Phone, User, CheckCircle, Clock } from 'lucide-react';

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
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('shopkeeper_id', shopkeeper.id);

    if (!error) {
      setShopkeeperProducts(data || []);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium">Loading shopkeeper details...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Shopkeeper-Wise Details</h2>
        <p className="text-xs text-gray-500 mt-0.5">Inspect store profiles, approval statuses, and inventory catalog per merchant.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Shopkeepers List Sidebar */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2 h-[600px] overflow-y-auto">
          <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider px-2 mb-3">All Merchants ({shopkeepers.length})</h3>
          {shopkeepers.map(sk => (
            <div 
              key={sk.id}
              onClick={() => handleSelectShopkeeper(sk)}
              className={`p-3 rounded-xl border cursor-pointer transition ${selectedShopkeeper?.id === sk.id ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                  <Store size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{sk.store_name || 'Unnamed Store'}</h4>
                  <p className="text-xs text-gray-500 truncate">{sk.owner_name || sk.email || 'Merchant'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Shopkeeper Details View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedShopkeeper ? (
            <>
              {/* Profile Overview Card */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded uppercase">Verified Merchant</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{selectedShopkeeper.store_name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total Catalog Items</span>
                    <span className="text-lg font-black text-gray-900">{shopkeeperProducts.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={16} className="text-brand-600" />
                    <span>Owner: <strong>{selectedShopkeeper.owner_name || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} className="text-brand-600" />
                    <span>Phone: <strong>{selectedShopkeeper.phone || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Inventory / Products Table */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Package size={18} className="text-brand-600" /> Products Listed by {selectedShopkeeper.store_name}
                </h4>

                {shopkeeperProducts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No products found for this shopkeeper.</p>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {shopkeeperProducts.map(prod => (
                      <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center gap-3">
                          <img src={prod.image_url || '/placeholder.png'} alt="" className="w-10 h-10 object-cover rounded-lg bg-white border" />
                          <div>
                            <span className="font-bold text-gray-900 block">{prod.name}</span>
                            <span className="text-[10px] text-gray-500">{prod.categories?.name || 'Uncategorized'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-gray-900 block">₹{prod.price?.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prod.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {prod.approval_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border text-center text-gray-400">Select a merchant from the list to view store details.</div>
          )}
        </div>

      </div>
    </div>
  );
}