// src/components/CategoryManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FolderTree, Plus, Trash2, Edit, X } from 'lucide-react';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
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
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name || '');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSubmitting(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: categoryName.trim() })
          .eq('id', editingCategory.id);

        if (error) throw error;
        alert('Category updated successfully!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ name: categoryName.trim() }]);

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

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <FolderTree size={24} className="text-emerald-600" /> Category Management
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Create, update, or remove store categories for customer navigation.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-stone-500 font-semibold">
              <th className="p-4">Category Name</th>
              <th className="p-4">Category ID</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {loading ? (
              <tr><td colSpan="3" className="p-8 text-center text-stone-500 font-medium">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="3" className="p-8 text-center text-stone-400 italic">No categories created yet.</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-stone-50/80 transition">
                  <td className="p-4 font-bold text-stone-900 text-sm">{cat.name}</td>
                  <td className="p-4 font-mono text-stone-400 text-[11px]">{cat.id}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openEditModal(cat)} className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2 rounded-xl transition inline-flex items-center gap-1" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition inline-flex items-center gap-1" title="Delete">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-stone-900">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-stone-100 text-stone-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Category Name</label>
                <input 
                  type="text" required 
                  placeholder="e.g. Dairy, Snacks, Vegetables" 
                  className="w-full border border-stone-300 p-3 rounded-xl text-sm outline-none focus:border-emerald-600 font-medium bg-stone-50"
                  value={categoryName} 
                  onChange={e => setCategoryName(e.target.value)} 
                />
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-md flex items-center justify-center gap-2 mt-2"
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