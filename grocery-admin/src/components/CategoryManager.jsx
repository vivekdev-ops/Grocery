// src/components/CategoryManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FolderTree, Plus, Trash2, Edit, X, Upload, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  
  // Local File Upload State
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryImageUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name || '');
    setCategoryImageUrl(cat.image_url || '');
    setIsModalOpen(true);
  };

  // Handle local file upload to Supabase Storage bucket
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'category-icons' bucket
      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('category-icons')
        .getPublicUrl(filePath);

      setCategoryImageUrl(publicUrl);
    } catch (err) {
      alert('Image upload failed: ' + err.message + '\n(Make sure you have created a public bucket named "category-icons" in Supabase Storage)');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSubmitting(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ 
            name: categoryName.trim(),
            image_url: categoryImageUrl.trim() 
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        alert('Category updated successfully!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ 
            name: categoryName.trim(),
            image_url: categoryImageUrl.trim() 
          }]);

        if (error) throw error;
        alert('Category created successfully!');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert('Operation failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('Are you sure you want to delete this category?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        alert('Failed to delete: ' + error.message);
      } else {
        fetchCategories();
      }
    }
  };

  const categoriesWithIcons = categories.filter(c => c.image_url && c.image_url.trim() !== '').length;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FolderTree size={24} className="text-emerald-700" /> Category Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Create, update, or remove store categories and bucket icons for customer storefront navigation.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4.5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-700/25 active:scale-95 shrink-0"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* AI Category Intelligence Diagnostics Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">AI Category Navigation Diagnostics</h3>
            <p className="text-[11px] text-emerald-300/80">Automated structural health of your store taxonomy.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <CheckCircle2 size={14} className="text-emerald-400" /> Total Active Taxonomies
            </div>
            <p className="text-emerald-100/90">Your storefront features <strong className="text-white">{categories.length}</strong> main shopping categories optimized for mobile discovery.</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <Sparkles size={14} className="text-emerald-400" /> Bucket Icon Coverage
            </div>
            <p className="text-emerald-100/90"><strong className="text-white">{categoriesWithIcons}</strong> out of <strong className="text-white">{categories.length}</strong> categories have custom icons uploaded from the bucket storage.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500 font-semibold">
              <th className="p-4">Icon</th>
              <th className="p-4">Category Name</th>
              <th className="p-4">Category ID</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 text-xs">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-medium">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No categories created yet.</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-emerald-50/40 transition">
                  <td className="p-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 overflow-hidden flex items-center justify-center">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={18} className="text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-900 text-sm">{cat.name}</td>
                  <td className="p-4 font-mono text-slate-400 text-[11px]">{cat.id}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEditModal(cat)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-emerald-200" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-rose-200" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-emerald-50 text-slate-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input 
                  type="text" required 
                  placeholder="e.g. Dairy, Snacks, Vegetables" 
                  className="w-full border border-emerald-200 p-3 rounded-2xl text-sm outline-none focus:border-emerald-600 font-medium bg-emerald-50/20 text-slate-900"
                  value={categoryName} 
                  onChange={e => setCategoryName(e.target.value)} 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Icon / Image</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 overflow-hidden flex items-center justify-center shrink-0">
                    {categoryImageUrl ? (
                      <img src={categoryImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl font-bold transition inline-flex items-center gap-1.5 text-xs shadow-sm">
                      <Upload size={14} /> {uploading ? 'Uploading...' : 'Browse Local File'}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400">Recommended: Square PNG or JPG (max 2MB)</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" disabled={submitting || uploading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 rounded-2xl transition text-sm uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}