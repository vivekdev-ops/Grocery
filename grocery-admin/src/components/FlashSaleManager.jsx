// src/components/FlashSaleManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Flame, Clock, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export default function FlashSaleManager() {
  const [flashSale, setFlashSale] = useState({
    title: 'Flash Sale Live!',
    subtitle: 'Extra discounts on daily essentials & snacks.',
    end_time: '',
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFlashSale();
  }, []);

  const fetchFlashSale = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flash_sales').select('*').limit(1).single();
    if (data && !error) {
      // Format datetime-local string properly
      const formattedDate = data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '';
      setFlashSale({ ...data, end_time: formattedDate });
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: flashSale.title,
      subtitle: flashSale.subtitle,
      end_time: new Date(flashSale.end_time).toISOString(),
      is_active: flashSale.is_active
    };

    let error;
    if (flashSale.id) {
      const res = await supabase.from('flash_sales').update(payload).eq('id', flashSale.id);
      error = res.error;
    } else {
      const res = await supabase.from('flash_sales').insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert('Error saving flash sale: ' + error.message);
    } else {
      alert('Flash sale banner updated successfully!');
      fetchFlashSale();
    }
  };

  if (loading) return <div className="p-8 text-stone-500 font-medium">Loading flash sale configuration...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
          <Flame className="text-rose-600" /> Flash Sale Banner Management
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">Configure live countdown timers and promotional banners for your customers.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border">
          <div>
            <span className="font-bold text-stone-900 block text-sm">Flash Sale Status</span>
            <span className="text-xs text-stone-500">Toggle whether the banner is visible on the storefront.</span>
          </div>
          <button
            type="button"
            onClick={() => setFlashSale({ ...flashSale, is_active: !flashSale.is_active })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${flashSale.is_active ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-200 text-stone-700'}`}
          >
            {flashSale.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {flashSale.is_active ? 'ACTIVE' : 'INACTIVE'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Sale Title</label>
          <input
            type="text"
            required
            className="w-full border border-stone-300 p-3.5 rounded-xl text-sm outline-none font-medium focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
            placeholder="e.g., Flash Sale Live!"
            value={flashSale.title}
            onChange={e => setFlashSale({ ...flashSale, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Subtitle / Description</label>
          <input
            type="text"
            required
            className="w-full border border-stone-300 p-3.5 rounded-xl text-sm outline-none font-medium focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
            placeholder="e.g., Extra discounts on daily essentials & snacks."
            value={flashSale.subtitle}
            onChange={e => setFlashSale({ ...flashSale, subtitle: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Sale Expiry Date & Time</label>
          <input
            type="datetime-local"
            required
            className="w-full border border-stone-300 p-3.5 rounded-xl text-sm outline-none font-medium focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
            value={flashSale.end_time}
            onChange={e => setFlashSale({ ...flashSale, end_time: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save & Publish Flash Sale'}
        </button>
      </form>
    </div>
  );
}