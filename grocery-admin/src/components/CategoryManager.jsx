// src/components/CategoryManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FolderTree, Plus, Trash2, Edit, X, Upload, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, CornerDownRight } from 'lucide-react';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  
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
    setCategoryParentId('');
    setCategoryIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name || '');
    setCategoryImageUrl(cat.image_url || '');
    setCategoryParentId(cat.parent_id || '');
    setCategoryIsActive(cat.is_active !== false);
    setIsModalOpen(true);
  };

  // Toggle active/inactive status inline
  const handleToggleStatus = async (catId, currentStatus) => {
    const nextStatus = currentStatus === false ? true : false;
    const { error } = await supabase
      .from('categories')
      .update({ is_active: nextStatus })
      .eq('id', catId);

    if (error) {
      alert('Failed to update visibility: ' + error.message);
    } else {
      fetchCategories();
    }
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

      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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
      const payload = {
        name: categoryName.trim(),
        image_url: categoryImageUrl.trim(),
        parent_id: categoryParentId || null,
        is_active: categoryIsActive
      };

      if (editingCategory) {
        // Prevent setting category as its own parent
        if (categoryParentId === editingCategory.id) {
          alert("A category cannot be its own parent.");
          setSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);

        if (error) throw error;
        alert('Category updated successfully!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([payload]);

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
    if (confirm('Are you sure you want to delete this category? (Subcategories will also be removed or unlinked)')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        alert('Failed to delete: ' + error.message);
      } else {
        fetchCategories();
      }
    }
  };

  // Separate parent categories (no parent_id) and subcategories
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => categories.filter(c => c.parent_id === parentId);

  const categoriesWithIcons = categories.filter(c => c.image_url && c.image_url.trim() !== '').length;
  const activeCategoriesCount = categories.filter(c => c.is_active !== false).length;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FolderTree size={24} className="text-emerald-700" /> Category & Subcategory Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Create and organize main store categories and subcategories for streamlined navigation.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4.5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-700/25 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Category / Subcategory
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
              <CheckCircle2 size={14} className="text-emerald-400" /> Storefront Visible Taxonomies
            </div>
            <p className="text-emerald-100/90">Your storefront features <strong className="text-white">{activeCategoriesCount}</strong> active items (<strong className="text-emerald-300">{parentCategories.length} parent categories</strong>, <strong className="text-emerald-300">{categories.length - parentCategories.length} subcategories</strong>).</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <Sparkles size={14} className="text-emerald-400" /> Bucket Icon Coverage
            </div>
            <p className="text-emerald-100/90"><strong className="text-white">{categoriesWithIcons}</strong> out of <strong className="text-white">{categories.length}</strong> categories have custom icons uploaded.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500 font-semibold">
              <th className="p-4">Icon</th>
              <th className="p-4">Category / Subcategory Name</th>
              <th className="p-4">Type</th>
              <th className="p-4">Storefront Visibility</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 text-xs">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-medium">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">No categories created yet.</td></tr>
            ) : (
              parentCategories.map(parent => {
                const subcategories = getSubcategories(parent.id);
                const isParentActive = parent.is_active !== false;

                return (
                  <>
                    {/* Parent Row */}
                    <tr key={parent.id} className="hover:bg-emerald-50/40 transition bg-stone-50/50">
                      <td className="p-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 overflow-hidden flex items-center justify-center">
                          {parent.image_url ? (
                            <img src={parent.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-black text-slate-900 text-sm">{parent.name}</td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          Parent Category
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleStatus(parent.id, isParentActive)}
                          className="inline-flex items-center gap-1.5 cursor-pointer font-black text-xs transition"
                        >
                          {isParentActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <ToggleRight size={16} /> Active / Visible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                              <ToggleLeft size={16} /> Disabled / Hidden
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => openEditModal(parent)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-emerald-200 cursor-pointer" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteCategory(parent.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-rose-200 cursor-pointer" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Subcategories Rows */}
                    {subcategories.map(sub => {
                      const isSubActive = sub.is_active !== false;
                      return (
                        <tr key={sub.id} className="hover:bg-emerald-50/30 transition">
                          <td className="p-4 pl-8">
                            <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center">
                              {sub.image_url ? (
                                <img src={sub.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={15} className="text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-800 text-xs flex items-center gap-2">
                            <CornerDownRight size={14} className="text-emerald-600 shrink-0" />
                            <span>{sub.name}</span>
                          </td>
                          <td className="p-4">
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                              Subcategory
                            </span>
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={() => handleToggleStatus(sub.id, isSubActive)}
                              className="inline-flex items-center gap-1.5 cursor-pointer font-black text-xs transition"
                            >
                              {isSubActive ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                  <ToggleRight size={16} /> Active / Visible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                                  <ToggleLeft size={16} /> Disabled / Hidden
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => openEditModal(sub)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-emerald-200 cursor-pointer" title="Edit">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDeleteCategory(sub.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-2xl transition inline-flex items-center gap-1 border border-rose-200 cursor-pointer" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">{editingCategory ? 'Edit Category' : 'Add Category / Subcategory'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-emerald-50 text-slate-500 cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Parent Category (Optional - Leave blank for Main Category)</label>
                <select 
                  className="w-full border border-emerald-200 p-3 rounded-2xl text-xs outline-none focus:border-emerald-600 font-bold bg-emerald-50/20 text-slate-900 cursor-pointer"
                  value={categoryParentId}
                  onChange={e => setCategoryParentId(e.target.value)}
                >
                  <option value="">None (Make this a Main Parent Category)</option>
                  {parentCategories
                    .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input 
                  type="text" required 
                  placeholder="e.g. Dairy, Organic Vegetables, Snacks" 
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

              <div className="flex items-center gap-3 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="category_active_status"
                  checked={categoryIsActive}
                  onChange={e => setCategoryIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="category_active_status" className="font-bold text-slate-800 cursor-pointer">
                  Display Category on Customer Storefront
                </label>
              </div>

              <button 
                type="submit" disabled={submitting || uploading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 rounded-2xl transition text-sm uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
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