// src/components/ProductManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, Trash2, Edit, X, Layers, Store, Filter } from 'lucide-react';
import ExcelProductUpload from './ExcelProductUpload';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedShopkeeperFilter, setSelectedShopkeeperFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'approvals'
  const [loading, setLoading] = useState(true);

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); 
  const [form, setForm] = useState({
    name: '',
    price: '',
    mrp: '',
    stock: '',
    category_id: '',
    description: ''
  });

  // Multiple Images State
  const [imageFiles, setImageFiles] = useState([]); 
  const [existingImages, setExistingImages] = useState([]); 

  // Variants State
  const [variants, setVariants] = useState([]); 
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, varRes, shopRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_variants').select('*'),
        supabase.from('shopkeeper_profiles').select('*')
      ]);

      const rawProducts = prodRes.data || [];
      const rawCategories = catRes.data || [];
      const rawVariants = varRes.data || [];
      const shopkeepersList = shopRes.data || [];

      // DEBUG LOGS TO INSPECT PROFILES AND IDS IN CONSOLE
      console.log("Admin Panel - Fetched Shopkeepers List:", shopkeepersList);
      console.log("Admin Panel - All Products shopkeeper_ids:", rawProducts.map(p => ({ name: p.name, shopkeeper_id: p.shopkeeper_id })));

      setShopkeepers(shopkeepersList);

      const combined = rawProducts.map(p => {
        const relationalVariants = rawVariants.filter(v => v.product_id === p.id);
        const jsonVariants = p.variants || [];
        const mergedVariants = relationalVariants.length > 0 ? relationalVariants : jsonVariants;
        const mergedImages = p.images || p.gallery || (p.image_url ? [p.image_url] : []);
        
        // Robust ID matching (converting both to strings to prevent type mismatches)
        const ownerProfile = shopkeepersList.find(s => String(s.id).trim() === String(p.shopkeeper_id).trim());
        const categoryObj = rawCategories.find(c => c.id === p.category_id);

        return {
          ...p,
          categories: categoryObj || { name: 'General' },
          shopkeeper_profiles: ownerProfile || { store_name: 'Admin / Direct', email: 'admin@hub.com' },
          images: mergedImages,
          variants: mergedVariants
        };
      });

      setProducts(combined);
      setCategories(rawCategories);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApproval = async (productId, status) => {
    const { error } = await supabase.from('products').update({ approval_status: status }).eq('id', productId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Delete this product and all its variants/images?')) {
      await supabase.from('product_variants').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({ name: '', price: '', mrp: '', stock: '', category_id: '', description: '' });
    setImageFiles([]);
    setExistingImages([]);
    setVariants([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      price: product.price || '',
      mrp: product.mrp || '',
      stock: product.stock || '',
      category_id: product.category_id || '',
      description: product.description || ''
    });
    setExistingImages(product.images || product.gallery || (product.image_url ? [product.image_url] : []));
    setImageFiles([]);
    setVariants(product.variants || []);
    setIsModalOpen(true);
  };

  const addVariantRow = () => {
    setVariants([...variants, { unit_label: '', price: '', mrp: '', stock: '' }]);
  };

  const updateVariantRow = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const removeVariantRow = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const uploadImagesToStorage = async () => {
    let uploadedUrls = [...existingImages];
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        continue;
      }
      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const allImageUrls = await uploadImagesToStorage();
      const primaryImageUrl = allImageUrls.length > 0 ? allImageUrls[0] : null;

      const productPayload = {
        name: form.name,
        price: parseFloat(form.price || 0),
        mrp: parseFloat(form.mrp || form.price || 0),
        stock: parseInt(form.stock || 0),
        category_id: form.category_id || null,
        image_url: primaryImageUrl,
        images: allImageUrls,
        gallery: allImageUrls,
        variants: variants,
        description: form.description,
        approval_status: 'approved'
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', editingProduct.id);
        if (error) throw error;
        await supabase.from('product_variants').delete().eq('product_id', editingProduct.id);
      } else {
        const { data, error } = await supabase.from('products').insert([productPayload]).select().single();
        if (error) throw error;
        productId = data.id;
      }

      if (variants.length > 0) {
        const variantPayloads = variants.map(v => ({
          product_id: productId,
          unit_label: v.unit_label || v.label,
          price: parseFloat(v.price || 0),
          mrp: parseFloat(v.mrp || v.price || 0),
          stock: parseInt(v.stock || 0)
        }));

        const { error: varError } = await supabase.from('product_variants').insert(variantPayloads);
        if (varError) throw varError;
      }

      alert('Product saved successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Operation failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesTab = activeTab === 'inventory' ? true : (p.approval_status === 'pending' || !p.approval_status);
    const matchesShopkeeper = selectedShopkeeperFilter === 'all' || String(p.shopkeeper_id).trim() === String(selectedShopkeeperFilter).trim();
    return matchesTab && matchesShopkeeper;
  });

  const pendingCount = products.filter(p => p.approval_status === 'pending' || !p.approval_status).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Product Inventory & Shopkeeper Moderation</h2>
          <p className="text-sm text-gray-500 mt-0.5">Filter products by store owner, check galleries, and approve listings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shopkeeper Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border shadow-2xs">
            <Filter size={14} className="text-gray-400" />
            <select 
              className="text-xs font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
              value={selectedShopkeeperFilter}
              onChange={e => setSelectedShopkeeperFilter(e.target.value)}
            >
              <option value="all">All Shopkeepers (Stores)</option>
              {shopkeepers.map(sk => (
                <option key={sk.id} value={sk.id}>{sk.store_name} ({sk.email})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 bg-white p-1 rounded-xl border shadow-2xs">
            <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'inventory' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              All Inventory ({products.length})
            </button>
            <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-lg text-xs font-bold transition relative ${activeTab === 'approvals' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              Pending Approvals {pendingCount > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1.5">{pendingCount}</span>}
            </button>
          </div>

          <button 
            onClick={openAddModal}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <ExcelProductUpload onUploadSuccess={fetchData} />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
              <th className="p-4">Product & Store</th>
              <th className="p-4">Images</th>
              <th className="p-4">Variants</th>
              <th className="p-4">Price / Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading inventory...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">No products found matching this filter.</td></tr>
            ) : (
              filteredProducts.map(p => {
                const imgList = p.images || p.gallery || [];
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border">
                        {p.image_url || imgList.length > 0 ? (
                          <img src={p.image_url || imgList[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-gray-400 m-2"/>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 block">{p.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5 border border-emerald-200">
                          <Store size={10} /> {p.shopkeeper_profiles?.store_name || 'Admin Store'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      {imgList.length} loaded
                    </td>
                    <td className="p-4">
                      {p.variants?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.variants.map((v, i) => (
                            <span key={v.id || i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold border">
                              {v.unit_label || v.label}: ₹{Number(v.price || 0)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No variants</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-bold block">₹{Number(p.price || 0).toFixed(2)}</span>
                      <span className="text-gray-400 text-[10px]">Stock: {p.stock}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        p.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                        p.approval_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.approval_status || 'pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {(!p.approval_status || p.approval_status === 'pending') && (
                        <button onClick={() => handleUpdateApproval(p.id, 'approved')} className="bg-green-600 text-white px-3 py-1 rounded-lg font-bold shadow-2xs">Approve</button>
                      )}
                      <button onClick={() => openEditModal(p)} className="text-blue-600 hover:text-blue-800 p-1.5" title="Edit"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700 p-1.5" title="Delete"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit with Images & Variants */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-900">{editingProduct ? 'Edit Product & Gallery' : 'Add Product with Gallery & Variants'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name</label>
                <input 
                  type="text" required placeholder="Aashirvaad Atta / Fresh Milk" 
                  className="w-full border p-3 rounded-xl outline-none focus:border-green-600 text-sm"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Base Price (₹)</label>
                  <input type="number" step="0.01" required placeholder="45.00" className="w-full border p-3 rounded-xl text-sm" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" placeholder="50.00" className="w-full border p-3 rounded-xl text-sm" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Base Stock</label>
                  <input type="number" required placeholder="100" className="w-full border p-3 rounded-xl text-sm" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Category</label>
                <select className="w-full border p-3 rounded-xl text-sm bg-white font-medium" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              {/* MULTIPLE IMAGE UPLOAD SECTION */}
              <div className="pt-2">
                <label className="block font-bold text-gray-700 mb-1">Browse & Upload Multiple Images</label>
                <div className="border-2 border-dashed border-gray-300 p-4 rounded-xl text-center bg-gray-50">
                  <input 
                    type="file" multiple accept="image/*" 
                    onChange={e => setImageFiles(Array.from(e.target.files))}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Select multiple files from your device to form the product gallery.</p>
                </div>

                {existingImages.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {existingImages.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl border relative overflow-hidden bg-gray-100 shadow-2xs">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setExistingImages(existingImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow">
                          <X size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea rows="3" placeholder="Product details..." className="w-full border p-3 rounded-xl text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              {/* VARIANTS SECTION */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-green-600" />
                    <span className="font-bold text-gray-900 text-sm">Product Variants (e.g. 500g, 1kg, 5L)</span>
                  </div>
                  <button type="button" onClick={addVariantRow} className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg text-xs">
                    + Add Variant Tier
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-gray-400 italic text-center py-2 bg-gray-50 rounded-xl border">No pack variants added.</p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border">
                        <input 
                          type="text" placeholder="Unit Label (e.g. 1 kg)" required 
                          className="flex-1 border p-2 rounded-lg text-xs bg-white"
                          value={v.unit_label || v.label} onChange={e => updateVariantRow(index, 'unit_label', e.target.value)}
                        />
                        <input 
                          type="number" step="0.01" placeholder="Price (₹)" required 
                          className="w-24 border p-2 rounded-lg text-xs bg-white"
                          value={v.price} onChange={e => updateVariantRow(index, 'price', e.target.value)}
                        />
                        <input 
                          type="number" step="0.01" placeholder="MRP (₹)" 
                          className="w-24 border p-2 rounded-lg text-xs bg-white"
                          value={v.mrp} onChange={e => updateVariantRow(index, 'mrp', e.target.value)}
                        />
                        <input 
                          type="number" placeholder="Stock" required 
                          className="w-20 border p-2 rounded-lg text-xs bg-white"
                          value={v.stock} onChange={e => updateVariantRow(index, 'stock', e.target.value)}
                        />
                        <button type="button" onClick={() => removeVariantRow(index)} className="text-red-500 hover:text-red-700 p-1.5"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-md flex items-center justify-center gap-2 mt-4"
              >
                <Plus size={16} /> {submitting ? 'Uploading & Saving...' : (editingProduct ? 'Update Product & Gallery' : 'Publish Product')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}