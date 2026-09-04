// src/components/StoreLocationManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Store, MapPin, Save, Navigation, Map } from 'lucide-react';

export default function StoreLocationManager() {
  const [store, setStore] = useState({ id: '', store_name: '', latitude: '', longitude: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [mapQuery, setMapQuery] = useState('');

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
    if (data && !error) {
      setStore(data);
      setMapQuery(data.address || `${data.latitude}, ${data.longitude}`);
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
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Optional reverse geocoding to auto-fill address
        let resolvedAddress = store.address;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            resolvedAddress = data.display_name;
          }
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }

        setStore(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: resolvedAddress
        }));
        setMapQuery(resolvedAddress || `${lat}, ${lng}`);
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

  // Geocode address from map search query using OpenStreetMap Nominatim
  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const bestMatch = data[0];
        setStore(prev => ({
          ...prev,
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          address: bestMatch.display_name || prev.address
        }));
        alert(`Location found & pinned: ${bestMatch.display_name}`);
      } else {
        alert("Location not found on map. Please refine your search query or enter coordinates directly.");
      }
    } catch (err) {
      alert("Map search failed: " + err.message);
    }
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
    if (store.id && store.id !== 'undefined') {
      const res = await supabase.from('store_settings').update(payload).eq('id', store.id);
      error = res.error;
    } else {
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

  // Generate OpenStreetMap embed iframe URL dynamically
  const lat = store.latitude || 28.6139;
  const lon = store.longitude || 77.2090;
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
          <Store className="text-emerald-600" /> Store Location & Interactive Map
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">Manage your central store coordinates and pin location for precise distance-based delivery calculations.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
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

        {/* Map Pin Picker Search & Preview */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Pin Location on Map</label>
            <button 
              type="button" 
              onClick={handleDetectLocation}
              disabled={detecting}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Navigation size={14} className={detecting ? "animate-spin" : ""} />
              {detecting ? 'Detecting GPS...' : 'Detect Current GPS Location'}
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text"
                placeholder="Search area, landmark or address to pin on map..."
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-sm outline-none bg-stone-50/50 font-medium"
                value={mapQuery}
                onChange={e => setMapQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMapSearch(); }}}
              />
            </div>
            <button
              type="button"
              onClick={handleMapSearch}
              className="bg-stone-900 hover:bg-stone-800 text-white px-5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Map size={14} /> Search Pin
            </button>
          </div>

          {/* Interactive Map Preview Box */}
          <div className="w-full h-64 rounded-2xl border border-stone-200 overflow-hidden relative shadow-inner bg-stone-100">
            <iframe
              title="Store Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src={mapEmbedUrl}
              className="w-full h-full"
            />
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono text-stone-600 border border-stone-200 shadow-xs pointer-events-none">
              Lat: {Number(lat).toFixed(6)}, Lon: {Number(lon).toFixed(6)}
            </div>
          </div>
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer uppercase tracking-wider"
        >
          <Save size={16} /> Save Store Location
        </button>
      </form>
    </div>
  );
}