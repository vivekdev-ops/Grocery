// src/components/StoreLocationManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Store, MapPin, Save, Navigation } from 'lucide-react';

export default function StoreLocationManager() {
  const [store, setStore] = useState({ id: '', store_name: '', latitude: '', longitude: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
    if (data && !error) {
      setStore(data);
    }
    setLoading(false);
  };

  // Automatically detect GPS location from browser
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStore(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setDetecting(false);
        alert("Store GPS coordinates detected successfully!");
      },
      (error) => {
        setDetecting(false);
        alert("Unable to retrieve your location: " + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      store_name: store.store_name,
      latitude: parseFloat(store.latitude),
      longitude: parseFloat(store.longitude),
      address: store.address
    };

    let error;
    // Check if a valid record ID exists before updating or inserting
    if (store.id && store.id !== 'undefined') {
      const res = await supabase.from('store_settings').update(payload).eq('id', store.id);
      error = res.error;
    } else {
      // If no ID exists, insert a new row
      const res = await supabase.from('store_settings').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert('Error saving store location: ' + error.message);
    } else {
      alert('Store location updated successfully!');
      fetchStore();
    }
  };

  if (loading) return <div className="p-8 text-stone-500 font-medium">Loading store location...</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
          <Store className="text-emerald-600" /> Store Location & GPS
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">Manage your central warehouse or store coordinates for distance-based delivery calculations.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Store Name</label>
          <input 
            type="text" 
            required
            className="w-full border border-stone-300 p-3 rounded-xl text-sm outline-none font-medium bg-stone-50/50" 
            value={store.store_name || ''} 
            onChange={e => setStore({...store, store_name: e.target.value})} 
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Coordinates</span>
          <button 
            type="button" 
            onClick={handleDetectLocation}
            disabled={detecting}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Navigation size={14} className={detecting ? "animate-spin" : ""} />
            {detecting ? 'Detecting GPS...' : 'Detect Current GPS Location'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Latitude</label>
            <input 
              type="number" step="0.000001" required 
              className="w-full border border-stone-300 p-3 rounded-xl text-sm outline-none font-medium bg-stone-50/50 font-mono" 
              value={store.latitude || ''} 
              onChange={e => setStore({...store, latitude: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Longitude</label>
            <input 
              type="number" step="0.000001" required 
              className="w-full border border-stone-300 p-3 rounded-xl text-sm outline-none font-medium bg-stone-50/50 font-mono" 
              value={store.longitude || ''} 
              onChange={e => setStore({...store, longitude: e.target.value})} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Store Full Address</label>
          <textarea 
            rows="2" required 
            className="w-full border border-stone-300 p-3 rounded-xl text-sm outline-none font-medium bg-stone-50/50" 
            value={store.address || ''} 
            onChange={e => setStore({...store, address: e.target.value})} 
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
        >
          <Save size={16} /> Save Store Location
        </button>
      </form>
    </div>
  );
}