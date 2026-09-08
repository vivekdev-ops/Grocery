// src/components/StoreStatusManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Power, Image, MessageSquare, Save } from 'lucide-react';

export default function StoreStatusManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [settings, setSettings] = useState({
    is_portal_active: true,
    maintenance_message: '',
    maintenance_image: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    // Fetch the first settings record without assuming integer ID
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setRecordId(data.id);
      setSettings({
        is_portal_active: data.is_portal_active ?? true,
        maintenance_message: data.maintenance_message || '',
        maintenance_image: data.maintenance_image || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    let error = null;

    if (recordId) {
      // Update existing row using its UUID
      const res = await supabase
        .from('store_settings')
        .update({
          is_portal_active: settings.is_portal_active,
          maintenance_message: settings.maintenance_message,
          maintenance_image: settings.maintenance_image,
          updated_at: new Date()
        })
        .eq('id', recordId);
      error = res.error;
    } else {
      // Insert if no row exists yet
      const res = await supabase
        .from('store_settings')
        .insert([{
          is_portal_active: settings.is_portal_active,
          maintenance_message: settings.maintenance_message,
          maintenance_image: settings.maintenance_image
        }])
        .select()
        .single();
      
      if (!res.error && res.data) {
        setRecordId(res.data.id);
      }
      error = res.error;
    }

    if (error) {
      alert("Failed to update portal status: " + error.message);
    } else {
      alert("Portal status updated successfully!");
      fetchSettings();
    }
    setSaving(false);
  };

  if (loading) return <div className="text-xs p-4 text-stone-500 font-bold">Loading portal control settings...</div>;

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5 max-w-xl">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 className="font-black text-stone-900 text-sm">Portal Active / Inactive Status</h3>
          <p className="text-stone-400 text-[11px]">Toggle store availability and show a maintenance overlay with a message & picture.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${settings.is_portal_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {settings.is_portal_active ? 'Portal Live' : 'Portal Offline'}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
          <div>
            <span className="font-bold text-stone-900 block">Portal Availability Toggle</span>
            <span className="text-[10px] text-stone-500">When disabled, customers will see the maintenance screen.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.is_portal_active} 
              onChange={e => setSettings({...settings, is_portal_active: e.target.checked})}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider">Maintenance / Inactive Message</label>
          <textarea 
            rows="3" 
            value={settings.maintenance_message} 
            onChange={e => setSettings({...settings, maintenance_message: e.target.value})}
            placeholder="e.g. We are currently undergoing scheduled upgrades. We will be back online soon!"
            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-black text-stone-700 uppercase tracking-wider">Image URL (Banner / Graphic)</label>
          <input 
            type="url" 
            value={settings.maintenance_image} 
            onChange={e => setSettings({...settings, maintenance_image: e.target.value})}
            placeholder="https://images.unsplash.com/..."
            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 uppercase tracking-wider"
        >
          {saving ? 'Saving Changes...' : 'Save Portal Status'}
        </button>
      </form>
    </div>
  );
}