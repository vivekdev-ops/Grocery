// src/components/DeliveryFeeManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Plus, Trash2, ShieldAlert } from 'lucide-react';

export default function DeliveryFeeManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ min_cart_value: '', max_cart_value: '', delivery_fee: '' });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('delivery_rules').select('*').order('min_cart_value', { ascending: true });
    if (!error) setRules(data || []);
    setLoading(false);
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('delivery_rules').insert([{
      min_cart_value: parseFloat(form.min_cart_value),
      max_cart_value: parseFloat(form.max_cart_value),
      delivery_fee: parseFloat(form.delivery_fee)
    }]);

    if (error) alert(`Error: ${error.message}`);
    else {
      setForm({ min_cart_value: '', max_cart_value: '', delivery_fee: '' });
      fetchRules();
    }
  };

  const handleDeleteRule = async (id) => {
    const { error } = await supabase.from('delivery_rules').delete().eq('id', id);
    if (!error) fetchRules();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck size={24}/> Delivery Fee Rules</h2>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">Add New Tier</h3>
        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Cart Value (₹)</label>
            <input type="number" required step="0.01" placeholder="0" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.min_cart_value} onChange={e => setForm({...form, min_cart_value: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Cart Value (₹)</label>
            <input type="number" required step="0.01" placeholder="500" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.max_cart_value} onChange={e => setForm({...form, max_cart_value: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Fee (₹)</label>
            <input type="number" required step="0.01" placeholder="40" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.delivery_fee} onChange={e => setForm({...form, delivery_fee: e.target.value})} />
          </div>
          <button type="submit" className="bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 transition">Add Tier</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-sm font-medium text-gray-700">Cart Range</th>
              <th className="p-4 text-sm font-medium text-gray-700">Delivery Fee</th>
              <th className="p-4 text-sm font-medium text-gray-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="p-8 text-center text-gray-500">Loading rules...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan="3" className="p-8 text-center text-gray-500">No delivery rules defined.</td></tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-sm font-medium text-gray-800">₹{rule.min_cart_value} — ₹{rule.max_cart_value}</td>
                  <td className="p-4 text-sm font-bold text-green-700">{rule.delivery_fee === 0 ? 'FREE' : `₹${rule.delivery_fee.toFixed(2)}`}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
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