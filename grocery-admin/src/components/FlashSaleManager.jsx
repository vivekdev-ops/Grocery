// src/components/PersonalizedDealsManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tag, Sparkles, Trash2, Plus, Edit, X, Check, CheckSquare, Square } from 'lucide-react';

export default function PersonalizedDealsManager() {
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for Add / Edit
  const [editingId, setEditingId] = useState(null);
  const [dealType, setDealType] = useState('product'); // 'product' or 'category'
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [discountTag, setDiscountTag] = useState('20% OFF');
  const [targetInterestGroup, setTargetInterestGroup] = useState('All');

  // Search filter for product selector
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetchDeals();
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personalized_deals')
      .select('*, products(*), categories(id, name, image_url)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error.message);
    } else if (data) {
      setDeals(data);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, price, image_url, category_id').eq('approval_status', 'approved');
    if (data) setProducts(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    if (data) setCategories(data);
  };

  const toggleProductId = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCategoryId = (id) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveDeal = async (e) => {
    e.preventDefault();

    if (dealType === 'product' && selectedProductIds.length === 0) {
      alert("Please select at least one product.");
      return;
    }

    if (dealType === 'category' && selectedCategoryIds.length === 0) {
      alert("Please select at least one category.");
      return;
    }

    if (editingId) {
      // Update single active deal
      const payload = {
        deal_type: dealType,
        product_id: dealType === 'product' ? selectedProductIds[0] : null,
        category_id: dealType === 'category' ? selectedCategoryIds[0] : null,
        discount_tag: discountTag,
        target_interest_group: targetInterestGroup,
        is_active: true
      };

      const { error } = await supabase.from('personalized_deals').update(payload).eq('id', editingId);
      if (!error) {
        alert("Personalized deal updated successfully!");
        handleCancelEdit();
        fetchDeals();
      } else {
        alert("Error updating deal: " + error.message);
      }
    } else {
      // Insert new deals (handling multiple selections by generating individual row insertions)
      if (dealType === 'product') {
        const payloads = selectedProductIds.map(pId => ({
          deal_type: 'product',
          product_id: pId,
          category_id: null,
          discount_tag: discountTag,
          target_interest_group: targetInterestGroup,
          is_active: true
        }));
        
        const { error } = await supabase.from('personalized_deals').insert(payloads);
        if (!error) {
          alert("Product deal banners added successfully!");
          handleCancelEdit();
          fetchDeals();
        } else {
          alert("Error adding deals: " + error.message);
        }
      } else {
        const payloads = selectedCategoryIds.map(cId => ({
          deal_type: 'category',
          product_id: null,
          category_id: cId,
          discount_tag: discountTag,
          target_interest_group: targetInterestGroup,
          is_active: true
        }));
        
        const { error } = await supabase.from('personalized_deals').insert(payloads);
        if (!error) {
          alert("Category deal banners added successfully!");
          handleCancelEdit();
          fetchDeals();
        } else {
          alert("Error adding category deals: " + error.message);
        }
      }
    }
  };

  const handleEditClick = (deal) => {
    setEditingId(deal.id);
    const type = deal.deal_type || (deal.category_id ? 'category' : 'product');
    setDealType(type);
    setSelectedProductIds(deal.product_id ? [deal.product_id] : []);
    setSelectedCategoryIds(deal.category_id ? [deal.category_id] : []);
    setDiscountTag(deal.discount_tag || '20% OFF');
    setTargetInterestGroup(deal.target_interest_group || 'All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDealType('product');
    setSelectedProductIds([]);
    setSelectedCategoryIds([]);
    setDiscountTag('20% OFF');
    setTargetInterestGroup('All');
    setProductSearch('');
  };

  const handleDeleteDeal = async (id) => {
    if (!window.confirm("Delete this personalized deal?")) return;
    const { error } = await supabase.from('personalized_deals').delete().eq('id', id);
    if (!error) {
      if (editingId === id) handleCancelEdit();
      setDeals(prev => prev.filter(d => d.id !== id));
    } else {
      alert("Error deleting deal: " + error.message);
    }
  };

  const filteredProductsList = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="space-y-6 font-sans text-xs">
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={22} /> Personalized Daily Deals Manager
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Configure tailored product or full-category automated discount routines.</p>
        </div>
        {editingId && (
          <button 
            onClick={handleCancelEdit}
            className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
          >
            <X size={14} /> Cancel Editing
          </button>
        )}
      </div>

      <form onSubmit={handleSaveDeal} className={`p-6 rounded-3xl border shadow-xs space-y-4 max-w-2xl transition-colors ${editingId ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-stone-200'}`}>
        <div className="flex justify-between items-center">
          <h3 className="font-black text-sm text-slate-900">{editingId ? 'Edit Deal Rule' : 'Add New Featured Deal'}</h3>
        </div>

        {/* Deal Target Selector Tabs */}
        <div className="flex gap-2 bg-stone-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setDealType('product'); setSelectedCategoryIds([]); }}
            className={`flex-1 py-2.5 rounded-xl font-black transition cursor-pointer ${
              dealType === 'product' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Select Specific Products
          </button>
          <button
            type="button"
            onClick={() => { setDealType('category'); setSelectedProductIds([]); }}
            className={`flex-1 py-2.5 rounded-xl font-black transition cursor-pointer ${
              dealType === 'category' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Select Full Category (Auto-Apply)
          </button>
        </div>

        {/* Conditional Product Selection Box */}
        {dealType === 'product' ? (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex justify-between items-center">
              <label className="block font-bold text-stone-700">Select Products ({selectedProductIds.length} Selected)</label>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-xs outline-none font-medium text-slate-800 w-48 bg-white"
              />
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 max-h-52 overflow-y-auto space-y-1.5">
              {filteredProductsList.length === 0 ? (
                <p className="text-stone-400 italic text-center py-4">No matching products found.</p>
              ) : (
                filteredProductsList.map(p => {
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => toggleProductId(p.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isSelected ? <CheckSquare size={16} className="text-emerald-700 shrink-0" /> : <Square size={16} className="text-stone-400 shrink-0" />}
                        <span className="truncate">{p.name} (₹{p.price})</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Conditional Category Selection Box */
          <div className="space-y-2 animate-fadeIn">
            <label className="block font-bold text-stone-700">Select Target Categories ({selectedCategoryIds.length} Selected)</label>
            <p className="text-[11px] text-stone-500">Deals will automatically apply to products falling under these selected categories.</p>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 max-h-52 overflow-y-auto space-y-1.5">
              {categories.length === 0 ? (
                <p className="text-stone-400 italic text-center py-4">No categories found.</p>
              ) : (
                categories.map(cat => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <div 
                      key={cat.id}
                      onClick={() => toggleCategoryId(cat.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isSelected ? <CheckSquare size={16} className="text-emerald-700 shrink-0" /> : <Square size={16} className="text-stone-400 shrink-0" />}
                        <span className="truncate">{cat.name}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Discount Badge Label</label>
            <input 
              type="text" 
              placeholder="e.g. 20% OFF or BOGO"
              value={discountTag}
              onChange={e => setDiscountTag(e.target.value)}
              required
              className="w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl outline-none font-bold text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Target Interest Group</label>
            <select 
              value={targetInterestGroup}
              onChange={e => setTargetInterestGroup(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 p-3 rounded-2xl outline-none font-bold text-slate-900 bg-white"
            >
              <option value="All">All Shoppers (General)</option>
              <option value="Groceries">Groceries & Staples</option>
              <option value="Snacks">Snacks & Beverages</option>
              <option value="Dairy">Dairy & Breakfast</option>
            </select>
          </div>
        </div>

        <button type="submit" className={`w-full text-white py-3.5 rounded-2xl font-black uppercase tracking-wider transition shadow-md cursor-pointer ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
          {editingId ? 'Update Deal Rule' : dealType === 'product' ? `Publish ${selectedProductIds.length} Product Deal(s)` : `Publish ${selectedCategoryIds.length} Category Deal(s)`}
        </button>
      </form>

      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-slate-900">Active Personalized Deals ({deals.length})</h3>
        {loading ? (
          <p className="text-stone-400 italic py-4 text-center">Loading deals...</p>
        ) : deals.length === 0 ? (
          <p className="text-stone-400 italic py-4 text-center">No active personalized deals found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deals.map(deal => {
              const isCategoryDeal = deal.deal_type === 'category' || deal.category_id;
              const targetName = isCategoryDeal ? deal.categories?.name || 'Category Rule' : deal.products?.name || 'Product Rule';
              const targetImg = isCategoryDeal ? deal.categories?.image_url : deal.products?.image_url;

              return (
                <div key={deal.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${editingId === deal.id ? 'bg-amber-50/60 border-amber-300' : 'bg-stone-50/50 border-stone-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {targetImg ? (
                      <img src={targetImg} alt="" className="w-12 h-12 object-cover rounded-xl border bg-white shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-xs">
                        {isCategoryDeal ? 'CAT' : 'PROD'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{targetName}</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1 inline-block">{deal.discount_tag}</span>
                      <span className="text-[9px] text-stone-500 block truncate mt-0.5 uppercase tracking-wide font-bold">{isCategoryDeal ? '⚡ Full Category Rule' : '🛒 Specific Product'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleEditClick(deal)} className="text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer" title="Edit Deal">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteDeal(deal.id)} className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer" title="Delete Deal">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}