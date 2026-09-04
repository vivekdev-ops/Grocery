// src/components/DeliveryFeeManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Plus, Trash2, Edit, X } from 'lucide-react';

export default function DeliveryFeeManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State: Prioritizing Min Cart Value & Max Distance rules
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ 
    min_cart_value: 0, 
    max_cart_value: 99999, 
    min_distance_km: 0, 
    max_distance_km: 5, 
    delivery_fee: 30 
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

  const handleSaveRule = async (e) => {
    e.preventDefault();
    
    if (editingId) {
      const { error } = await supabase
        .from('delivery_rules')
        .update(form)
        .eq('id', editingId);

      if (error) {
        alert(error.message);
      } else {
        setEditingId(null);
        setForm({ min_cart_value: 0, max_cart_value: 99999, min_distance_km: 0, max_distance_km: 5, delivery_fee: 30 });
        fetchRules();
      }
    } else {
      const { error } = await supabase.from('delivery_rules').insert([form]);
      if (error) {
        alert(error.message);
      } else {
        setForm({ min_cart_value: 0, max_cart_value: 99999, min_distance_km: 0, max_distance_km: 5, delivery_fee: 30 });
        fetchRules();
      }
    }
  };

  const handleEditClick = (rule) => {
    setEditingId(rule.id);
    setForm({
      min_cart_value: rule.min_cart_value,
      max_cart_value: rule.max_cart_value,
      min_distance_km: rule.min_distance_km,
      max_distance_km: rule.max_distance_km,
      delivery_fee: rule.delivery_fee
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ min_cart_value: 0, max_cart_value: 99999, min_distance_km: 0, max_distance_km: 5, delivery_fee: 30 });
  };

  const handleDeleteRule = async (id) => {
    if (confirm('Delete this rule?')) {
      await supabase.from('delivery_rules').delete().eq('id', id);
      if (editingId === id) handleCancelEdit();
      fetchRules();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Truck className="text-emerald-600" /> Delivery Fee Rules (Min Cart & Max Distance)
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Configure fees triggered when cart subtotal is below a minimum threshold or distance exceeds a maximum limit.</p>
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

      <form onSubmit={handleSaveRule} className={`rounded-3xl p-6 border shadow-xs grid grid-cols-1 sm:grid-cols-5 gap-3 items-end transition-colors ${editingId ? 'bg-amber-50/60 border-amber-200' : 'bg-white'}`}>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">If Cart Below / Min Cart (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm bg-white outline-none" value={form.min_cart_value} onChange={e => setForm({...form, min_cart_value: parseFloat(e.target.value)} )} />
          <span className="text-[10px] text-stone-400 mt-0.5 block">e.g. 99 (triggers fee if cart &lt; 99)</span>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Max Cart Limit (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm bg-white outline-none" value={form.max_cart_value} onChange={e => setForm({...form, max_cart_value: parseFloat(e.target.value)} )} />
          <span className="text-[10px] text-stone-400 mt-0.5 block">e.g. 99999 (upper cap)</span>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">If Distance Above / Max Dist (KM)</label>
          <input type="number" step="0.1" required className="w-full border p-3 rounded-xl text-sm bg-white outline-none" value={form.max_distance_km} onChange={e => setForm({...form, max_distance_km: parseFloat(e.target.value)} )} />
          <span className="text-[10px] text-stone-400 mt-0.5 block">e.g. 5 (triggers fee if distance &gt; 5 KM)</span>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Delivery Fee (₹)</label>
          <input type="number" required className="w-full border p-3 rounded-xl text-sm bg-white outline-none" value={form.delivery_fee} onChange={e => setForm({...form, delivery_fee: parseFloat(e.target.value)} )} />
          <span className="text-[10px] text-stone-400 mt-0.5 block">e.g. 20 or 30</span>
        </div>
        <button type="submit" className={`font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md text-white transition cursor-pointer ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
          <Plus size={16} /> {editingId ? 'Update Rule' : 'Add Rule'}
        </button>
      </form>

      <div className="bg-white rounded-3xl border overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b text-xs uppercase text-stone-500 font-semibold">
              <th className="p-4">Cart Condition</th>
              <th className="p-4">Distance Condition</th>
              <th className="p-4">Fee Charged</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs font-medium text-stone-700">
            {rules.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-stone-400 italic">No delivery rules found. Add one above.</td></tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id} className={`hover:bg-stone-50/50 ${editingId === rule.id ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-4 font-bold text-stone-900">Cart between ₹{rule.min_cart_value} and ₹{rule.max_cart_value}</td>
                  <td className="p-4">Distance up to {rule.max_distance_km} KM</td>
                  <td className="p-4 font-black text-emerald-700">₹{Number(rule.delivery_fee || 0).toFixed(2)}</td>
                  <td className="p-4 text-right space-x-1">
                    <button onClick={() => handleEditClick(rule)} className="text-blue-600 hover:text-blue-800 p-2 cursor-pointer" title="Edit Rule"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-rose-500 hover:text-rose-700 p-2 cursor-pointer" title="Delete Rule"><Trash2 size={16} /></button>
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