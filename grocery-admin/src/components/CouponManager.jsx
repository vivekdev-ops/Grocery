// src/components/CouponManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tag, Plus, Trash2 } from 'lucide-react';

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_order_value: '' });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (!error) setCoupons(data || []);
    setLoading(false);
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('coupons').insert([{
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      is_active: true
    }]);

    if (error) alert(`Error: ${error.message}`);
    else {
      setForm({ code: '', discount_type: 'percentage', discount_value: '', min_order_value: '' });
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Tag size={24}/> Coupon & Discount Management</h2>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">Create New Promo Code</h3>
        <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Coupon Code</label>
            <input type="text" required placeholder="e.g. WELCOME50" className="w-full border p-2 rounded-lg text-sm bg-white uppercase" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
            <select className="w-full border p-2 rounded-lg text-sm bg-white" value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}>
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Discount Value</label>
            <input type="number" required step="0.01" placeholder="10 or 100" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Order Value (₹)</label>
            <input type="number" step="0.01" placeholder="0" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.min_order_value} onChange={e => setForm({...form, min_order_value: e.target.value})} />
          </div>
          <button type="submit" className="bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 transition">Create</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-sm font-medium text-gray-700">Code</th>
              <th className="p-4 text-sm font-medium text-gray-700">Discount</th>
              <th className="p-4 text-sm font-medium text-gray-700">Min Order</th>
              <th className="p-4 text-sm font-medium text-gray-700">Status</th>
              <th className="p-4 text-sm font-medium text-gray-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading coupons...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No active coupons.</td></tr>
            ) : (
              coupons.map(coupon => (
                <tr key={coupon.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-mono font-bold text-gray-900">{coupon.code}</td>
                  <td className="p-4 font-medium text-green-700">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}</td>
                  <td className="p-4 text-gray-600 text-sm">₹{coupon.min_order_value || 0}</td>
                  <td className="p-4"><span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">Active</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}