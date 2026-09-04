// src/components/CouponManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tag, Plus, Trash2, Edit3, X, Sparkles, CheckCircle2, BarChart3 } from 'lucide-react';

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usageStats, setUsageStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ 
    code: '', 
    discount_type: 'percentage', 
    discount_value: '', 
    min_order_value: '',
    usage_limit_type: 'multiple', // 'one_time' or 'multiple'
    expiry_date: '',
    product_id: '',
    category_id: ''
  });

  useEffect(() => {
    fetchCouponsProductsCategoriesAndStats();
  }, []);

  const fetchCouponsProductsCategoriesAndStats = async () => {
    setLoading(true);

    // 1. Fetch coupons
    const { data: couponData } = await supabase
      .from('coupons')
      .select('*, products(name), categories(name)')
      .order('created_at', { ascending: false });

    if (couponData) setCoupons(couponData);

    // 2. Fetch products for product-specific coupon rules
    const { data: prodData } = await supabase
      .from('products')
      .select('id, name')
      .order('name');

    if (prodData) setProducts(prodData);

    // 3. Fetch categories for category-specific coupon rules
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (catData) setCategories(catData);

    // 4. Fetch usage statistics from orders table
    const { data: orderData } = await supabase
      .from('orders')
      .select('coupon_code');

    if (orderData) {
      const stats = {};
      orderData.forEach(order => {
        if (order.coupon_code) {
          const upperCode = order.coupon_code.toUpperCase();
          stats[upperCode] = (stats[upperCode] || 0) + 1;
        }
      });
      setUsageStats(stats);
    }

    setLoading(false);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      usage_limit_type: form.usage_limit_type,
      expiry_date: form.expiry_date || null,
      product_id: form.product_id ? form.product_id : null,
      category_id: form.category_id ? form.category_id : null,
      is_active: true
    };

    if (editingId) {
      const { error } = await supabase
        .from('coupons')
        .update(payload)
        .eq('id', editingId);

      if (error) alert(`Error updating: ${error.message}`);
      else {
        alert("Coupon updated successfully!");
        resetForm();
        fetchCouponsProductsCategoriesAndStats();
      }
    } else {
      const { error } = await supabase
        .from('coupons')
        .insert([payload]);

      if (error) alert(`Error creating: ${error.message}`);
      else {
        alert("Coupon created successfully!");
        resetForm();
        fetchCouponsProductsCategoriesAndStats();
      }
    }
  };

  const handleEditClick = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value || '',
      usage_limit_type: coupon.usage_limit_type || 'multiple',
      expiry_date: coupon.expiry_date || '',
      product_id: coupon.product_id || '',
      category_id: coupon.category_id || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ 
      code: '', 
      discount_type: 'percentage', 
      discount_value: '', 
      min_order_value: '',
      usage_limit_type: 'multiple',
      expiry_date: '',
      product_id: '',
      category_id: ''
    });
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) fetchCouponsProductsCategoriesAndStats();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Tag size={24} className="text-emerald-700"/> Coupon & Discount Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Create, edit, and track promo codes with cart, product, and category restrictions.</p>
        </div>
      </div>

      {/* AI Intelligence Diagnostics Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">Promo Code Performance Insights</h3>
            <p className="text-[11px] text-emerald-300/80">Monitor active discount campaigns and total redemptions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <CheckCircle2 size={14} className="text-emerald-400" /> Active Campaigns
            </div>
            <p className="text-emerald-100/90">You currently have <strong className="text-white">{coupons.length}</strong> promo codes configured across the store.</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <BarChart3 size={14} className="text-emerald-400" /> Total Redemptions
            </div>
            <p className="text-emerald-100/90">Coupons have been successfully redeemed across <strong className="text-white">{Object.values(usageStats).reduce((a, b) => a + b, 0)}</strong> customer orders.</p>
          </div>
        </div>
      </div>

      {/* Create / Edit Coupon Form Card */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
            {editingId ? `Edit Promo Code: ${form.code}` : 'Create New Promo Code'}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-xs font-bold text-rose-600 flex items-center gap-1 hover:underline cursor-pointer">
              <X size={14} /> Cancel Editing
            </button>
          )}
        </div>
        
        <form onSubmit={handleSaveCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Coupon Code</label>
            <input 
              type="text" required placeholder="e.g. GROCERY50" 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs uppercase bg-emerald-50/20 font-mono font-bold text-slate-900 outline-none focus:border-emerald-600" 
              value={form.code} onChange={e => setForm({...form, code: e.target.value})} 
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
            <select 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-800 outline-none cursor-pointer" 
              value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Discount Value</label>
            <input 
              type="number" required step="0.01" placeholder="10 or 100" 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium text-slate-900 outline-none" 
              value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} 
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Min Order Value (₹)</label>
            <input 
              type="number" step="0.01" placeholder="0" 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium text-slate-900 outline-none" 
              value={form.min_order_value} onChange={e => setForm({...form, min_order_value: e.target.value})} 
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Specific Product Target (Optional)</label>
            <select 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-800 outline-none cursor-pointer truncate" 
              value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}
            >
              <option value="">Any Product (Storewide)</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Specific Category Target (Optional)</label>
            <select 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-800 outline-none cursor-pointer truncate" 
              value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
            >
              <option value="">Any Category (Storewide)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Usage Limit</label>
            <select 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-bold text-slate-800 outline-none cursor-pointer" 
              value={form.usage_limit_type} onChange={e => setForm({...form, usage_limit_type: e.target.value})}
            >
              <option value="multiple">Multiple Uses (Unlimited)</option>
              <option value="one_time">One-Time Use Per Customer</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Expiry / Valid Until Date</label>
            <input 
              type="date" 
              className="w-full border border-emerald-200 p-3 rounded-2xl text-xs bg-emerald-50/20 font-medium text-slate-900 outline-none cursor-pointer" 
              value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} 
            />
          </div>

          <div className="lg:col-span-3 pt-2 flex gap-2">
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button 
              type="submit" 
              className={`w-full ${editingId ? 'w-2/3 bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'} text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2`}
            >
              {editingId ? <><Edit3 size={16} /> Update Promo Code</> : <><Plus size={16} /> Create Promo Code</>}
            </button>
          </div>
        </form>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500 font-semibold">
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Min Order</th>
              <th className="p-4">Target Rule</th>
              <th className="p-4">Usage Limit</th>
              <th className="p-4">Times Used</th>
              <th className="p-4">Expiry Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 text-xs">
            {loading ? (
              <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-medium">Loading coupons...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="9" className="p-8 text-center text-slate-400 italic">No active coupons created yet.</td></tr>
            ) : (
              coupons.map(coupon => {
                const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                const timesUsed = usageStats[coupon.code.toUpperCase()] || 0;
                
                let targetText = 'Storewide';
                if (coupon.product_id && coupon.products?.name) {
                  targetText = `Product: ${coupon.products.name}`;
                } else if (coupon.category_id && coupon.categories?.name) {
                  targetText = `Category: ${coupon.categories.name}`;
                }

                return (
                  <tr key={coupon.id} className="hover:bg-emerald-50/40 transition">
                    <td className="p-4 font-mono font-black text-slate-900">{coupon.code}</td>
                    <td className="p-4 font-black text-emerald-700">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}</td>
                    <td className="p-4 font-medium text-slate-700">₹{coupon.min_order_value || 0}</td>
                    <td className="p-4 font-semibold text-slate-700">{targetText}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        coupon.usage_limit_type === 'one_time' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {coupon.usage_limit_type === 'one_time' ? 'One-Time Use' : 'Multiple Uses'}
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-800">
                      <span className="bg-emerald-100 px-2.5 py-1 rounded-full">
                        {timesUsed} orders
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {coupon.expiry_date ? (
                        <span className={isExpired ? 'text-rose-600 font-bold' : ''}>
                          {coupon.expiry_date} {isExpired ? '(Expired)' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No expiry</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        isExpired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(coupon)} 
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-2.5 rounded-2xl transition border border-amber-200 cursor-pointer" 
                        title="Edit Coupon"
                      >
                        <Edit3 size={14}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteCoupon(coupon.id)} 
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-2xl transition border border-rose-200 cursor-pointer" 
                        title="Delete Coupon"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}