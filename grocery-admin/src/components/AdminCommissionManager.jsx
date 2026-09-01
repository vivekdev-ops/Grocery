// src/components/AdminCommissionManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Percent, Save, Store, Truck, Plus, Trash2 } from 'lucide-react';

export default function AdminCommissionManager() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    role_type: 'shopkeeper',
    min_cart_value: '',
    max_cart_value: '',
    commission_pct: ''
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cart_commission_rules')
      .select('*')
      .order('min_cart_value', { ascending: true });

    if (data) setRules(data);
    setLoading(false);
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('cart_commission_rules').insert([{
      role_type: form.role_type,
      min_cart_value: Number(form.min_cart_value),
      max_cart_value: form.max_cart_value ? Number(form.max_cart_value) : null,
      commission_pct: Number(form.commission_pct),
      is_active: true
    }]);

    if (error) {
      alert("Error adding rule: " + error.message);
    } else {
      alert("Cart-value commission rule added successfully!");
      setForm({ role_type: 'shopkeeper', min_cart_value: '', max_cart_value: '', commission_pct: '' });
      fetchRules();
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this commission rule?")) return;
    const { error } = await supabase.from('cart_commission_rules').delete().eq('id', id);
    if (!error) {
      setRules(prev => prev.filter(r => r.id !== id));
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400 text-xs font-bold">Loading commission tiers...</div>;

  return (
    <div className="space-y-6 max-w-4xl font-sans text-xs">
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Percent className="text-emerald-600" size={24} /> Cart-Value Commission Engine
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Define sliding commission percentages based on total cart thresholds.</p>
      </div>

      {/* Add New Rule Form */}
      <form onSubmit={handleAddRule} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-gray-900">Add Cart-Tier Rule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Target Role</label>
            <select 
              value={form.role_type}
              onChange={e => setForm({...form, role_type: e.target.value})}
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
              value={form.min_cart_value}
              onChange={e => setForm({...form, min_cart_value: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Max Cart Value (₹)</label>
            <input 
              type="number" 
              step="1" 
              placeholder="Leave empty for infinity"
              value={form.max_cart_value}
              onChange={e => setForm({...form, max_cart_value: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Commission Share (%)</label>
            <input 
              type="number" 
              step="0.1" 
              required
              placeholder="e.g. 90"
              value={form.commission_pct}
              onChange={e => setForm({...form, commission_pct: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-900 outline-none"
            />
          </div>
        </div>

        <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer flex items-center gap-2">
          <Plus size={16} /> Add Tier Rule
        </button>
      </form>

      {/* Existing Rules Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
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
            {rules.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">No tiered rules configured yet.</td></tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="p-4 uppercase font-bold text-gray-800">{rule.role_type}</td>
                  <td className="p-4 text-gray-700 font-bold">
                    ₹{rule.min_cart_value} {rule.max_cart_value ? `to ₹${rule.max_cart_value}` : 'and above'}
                  </td>
                  <td className="p-4 font-black text-emerald-700">{rule.commission_pct}%</td>
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
  );
}