// src/components/BannerManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Image, Trash2 } from 'lucide-react';

export default function BannerManager() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState({ title: '', image_url: '', display_order: 0 });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('display_order', { ascending: true });
    if (data) setBanners(data);
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `banner-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      alert(`Error uploading banner: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    setForm(prev => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('banners').insert([form]);
    if (error) alert(error.message);
    else {
      setForm({ title: '', image_url: '', display_order: 0 });
      fetchBanners();
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Image size={24}/> Promotional Banner Slider</h2>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">Add New Banner Slide</h3>
        <form onSubmit={handleAddBanner} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input type="text" placeholder="Summer Sale" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banner Image File</label>
            <input 
              type="file" 
              accept="image/*"
              required 
              onChange={handleBannerImageUpload} 
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 bg-white border rounded-lg" 
            />
            {uploading && <p className="text-xs text-green-600 mt-1">Uploading banner...</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
            <input type="number" placeholder="0" className="w-full border p-2 rounded-lg text-sm bg-white" value={form.display_order} onChange={e => setForm({...form, display_order: parseInt(e.target.value) || 0})} />
          </div>
          <button type="submit" className="bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700">Add Slide</button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {banners.map(b => (
          <div key={b.id} className="bg-white rounded-xl border p-3 shadow-sm relative group overflow-hidden">
            <img src={b.image_url} alt="" className="w-full h-36 object-cover rounded-lg mb-2" />
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold">{b.title || 'Untitled Banner'}</span>
              <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}