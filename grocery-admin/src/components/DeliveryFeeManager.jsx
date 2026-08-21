// src/components/DeliveryFeeManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Plus, Trash2 } from 'lucide-react';

export default function DeliveryFeeManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    min_cart_value: 0, 
    max_cart_value: 1000, 
    min_distance_km: 0, 
    max_distance_km: 10, 
    delivery_fee: 40 
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from('delivery_rules').select('*').order('min_cart_value', { ascending: true });
    if (data) setRules(data);
    setLoading(false);
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('delivery_rules').insert([form]);
    if (error) {
      alert(error.message);
    } else {
      setForm({ min_cart_value: 0, max_cart_value: 1000, min_distance_km: 0, max_distance_km: 10, delivery_fee: 40 });
      fetchRules();
    }
  };

  const handleDeleteRule = async (id) => {
    if (confirm('Delete this rule?')) {
      await supabase.from('delivery_rules').delete().eq('id', id);
      fetchRules();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
          <Truck className="text-emerald-600" /> Delivery Fee Tiers (Cart & Distance)
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">Manage fees based on cart subtotals and customer distance ranges.</p>
      </div>

      <form onSubmit={handleAddRule} className="bg-white rounded-3xl p-6 border shadow-xs grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Min Cart (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm" value={form.min_cart_value} onChange={e => setForm({...form, min_cart_value: parseFloat(e.target.value)})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Max Cart (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm" value={form.max_cart_value} onChange={e => setForm({...form, max_cart_value: parseFloat(e.target.value)})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Min Dist (KM)</label>
          <input type="number" step="0.1" required className="w-full border p-3 rounded-xl text-sm" value={form.min_distance_km} onChange={e => setForm({...form, min_distance_km: parseFloat(e.target.value)})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Max Dist (KM)</label>
          <input type="number" step="0.1" required className="w-full border p-3 rounded-xl text-sm" value={form.max_distance_km} onChange={e => setForm({...form, max_distance_km: parseFloat(e.target.value)})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Fee (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm" value={form.delivery_fee} onChange={e => setForm({...form, delivery_fee: parseFloat(e.target.value)})} />
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md">
          <Plus size={16} /> Add Rule
        </button>
      </form>

      <div className="bg-white rounded-3xl border overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b text-xs uppercase text-stone-500 font-semibold">
              <th className="p-4">Cart Range</th>
              <th className="p-4">Distance Range</th>
              <th className="p-4">Fee</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs font-medium text-stone-700">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-stone-50/50">
                <td className="p-4 font-bold text-stone-900">₹{rule.min_cart_value} — ₹{rule.max_cart_value}</td>
                <td className="p-4">{rule.min_distance_km} KM — {rule.max_distance_km} KM</td>
                <td className="p-4 font-black text-emerald-700">₹{rule.delivery_fee.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDeleteRule(rule.id)} className="text-rose-500 hover:text-rose-700 p-2"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}