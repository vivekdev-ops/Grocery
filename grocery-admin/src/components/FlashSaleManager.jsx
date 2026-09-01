// src/components/AdminFlashSaleManager.jsx (or add into Banner/FlashSale Manager)
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tag, Sparkles, Trash2, Plus, Percent, CheckCircle } from 'lucide-react';

export default function PersonalizedDealsManager() {
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountTag, setDiscountTag] = useState('20% OFF');
  const [targetCategory, setTargetCategory] = useState('All');

  useEffect(() => {
    fetchDeals();
    fetchProducts();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    const { data } = await supabase.from('personalized_deals').select('*, products(*)').order('created_at', { ascending: false });
    if (data) setDeals(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, price, image_url').eq('approval_status', 'approved');
    if (data) setProducts(data);
  };

  const handleAddDeal = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const { error } = await supabase.from('personalized_deals').insert([{
      product_id: selectedProductId,
      discount_tag: discountTag,
      target_category: targetCategory,
      is_active: true
    }]);

    if (!error) {
      alert("Personalized deal banner added successfully!");
      setSelectedProductId('');
      setDiscountTag('20% OFF');
      fetchDeals();
    } else {
      alert("Error adding deal: " + error.message);
    }
  };

  const handleDeleteDeal = async (id) => {
    if (!window.confirm("Delete this personalized deal?")) return;
    const { error } = await supabase.from('personalized_deals').delete().eq('id', id);
    if (!error) setDeals(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={22} /> Personalized Daily Deals Manager
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Configure tailored product deals showcased dynamically on customer storefronts.</p>
        </div>
      </div>

      <form onSubmit={handleAddDeal} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4 max-w-xl">
        <h3 className="font-black text-sm text-slate-900">Add New Featured Deal</h3>
        <div>
          <label className="block font-bold text-stone-700 mb-1">Select Product</label>
          <select 
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            required
            className="w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl outline-none font-bold text-slate-900"
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Discount Badge Label</label>
            <input 
              type="text" 
              placeholder="e.g. 20% OFF or BOGO"
              value={discountTag}
              onChange={e => setDiscountTag(e.target.value)}
              required
              className="w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl outline-none font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">Target Interest Group</label>
            <select 
              value={targetCategory}
              onChange={e => setTargetCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl outline-none font-bold text-slate-900"
            >
              <option value="All">All Shoppers (General)</option>
              <option value="Groceries">Groceries & Staples</option>
              <option value="Snacks">Snacks & Beverages</option>
              <option value="Dairy">Dairy & Breakfast</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider transition shadow-md cursor-pointer">
          Publish Deal Banner
        </button>
      </form>

      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-slate-900">Active Personalized Deals ({deals.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {deals.map(deal => (
            <div key={deal.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={deal.products?.image_url} alt="" className="w-12 h-12 object-cover rounded-xl border bg-white" />
                <div>
                  <span className="font-bold text-slate-900 block truncate max-w-[140px]">{deal.products?.name}</span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{deal.discount_tag}</span>
                </div>
              </div>
              <button onClick={() => handleDeleteDeal(deal.id)} className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}