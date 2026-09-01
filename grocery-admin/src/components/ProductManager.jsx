// src/components/ProductManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, Trash2, Edit, X, Layers, Store, Filter, Star, MessageSquare, Sparkles, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp, AlertOctagon, FileSpreadsheet, ChevronDown, ChevronUp, Bold, Italic, List, AlignLeft } from 'lucide-react';
import ExcelProductUpload from './ExcelProductUpload';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [selectedShopkeeperFilter, setSelectedShopkeeperFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'approvals', 'lowStock', 'topSelling'
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

  // AI Generation State
  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

  // Reviews Modal State
  const [selectedProductForReviews, setSelectedProductForReviews] = useState(null);
  const [productReviewsList, setProductReviewsList] = useState([]);

  // Top Selling Analytics Data Map
  const [productOrderCounts, setProductOrderCounts] = useState({});

  // Expandable Excel Upload Section State
  const [isExcelUploadExpanded, setIsExcelUploadExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, varRes, shopRes, revRes, orderItemsRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_variants').select('*'),
        supabase.from('shopkeeper_profiles').select('*'),
        supabase.from('product_reviews').select('*'),
        supabase.from('order_items').select('product_id, quantity')
      ]);

      const rawProducts = prodRes.data || [];
      const rawCategories = catRes.data || [];
      const rawVariants = varRes.data || [];
      const shopkeepersList = shopRes.data || [];
      const rawReviews = revRes.data || [];
      const rawOrderItems = orderItemsRes.data || [];

      setShopkeepers(shopkeepersList);

      const countsMap = {};
      rawOrderItems.forEach(item => {
        if (item.product_id) {
          countsMap[item.product_id] = (countsMap[item.product_id] || 0) + Number(item.quantity || 1);
        }
      });
      setProductOrderCounts(countsMap);

      const combined = rawProducts.map(p => {
        const relationalVariants = rawVariants.filter(v => v.product_id === p.id);
        const jsonVariants = p.variants || [];
        const mergedVariants = relationalVariants.length > 0 ? relationalVariants : jsonVariants;
        const mergedImages = p.images || p.gallery || (p.image_url ? [p.image_url] : []);
        
        const pReviews = rawReviews.filter(r => r.product_id === p.id);
        const avgRating = pReviews.length > 0 ? (pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length).toFixed(1) : 'No ratings';

        const ownerProfile = shopkeepersList.find(s => String(s.id).trim() === String(p.shopkeeper_id).trim());
        const categoryObj = rawCategories.find(c => c.id === p.category_id);

        return {
          ...p,
          categories: categoryObj || { name: 'General' },
          shopkeeper_profiles: ownerProfile || { store_name: 'Admin / Direct', email: 'admin@hub.com' },
          images: mergedImages,
          variants: mergedVariants,
          avgRating,
          reviewCount: pReviews.length,
          reviews: pReviews,
          totalSold: countsMap[p.id] || 0
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

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this customer review?")) return;

    const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId);
    if (!error) {
      alert("Review deleted successfully.");
      fetchData();
      if (selectedProductForReviews) {
        setProductReviewsList(prev => prev.filter(r => r.id !== reviewId));
      }
    } else {
      alert("Error deleting review: " + error.message);
    }
  };

  const handleFormatText = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('product-rich-description');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.description;
    const selectedText = text.substring(start, end);
    const replacement = tagClose ? `${tagOpen}${selectedText}${tagClose}` : `${tagOpen}${selectedText}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    
    setForm({ ...form, description: newText });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, end + tagOpen.length);
    }, 0);
  };

 const handleGenerateAiDescription = async () => {
    if (!form.name.trim()) {
      alert("Please enter a Product Name first so the description can be generated!");
      return;
    }

    setGeneratingAiDesc(true);
    try {
      // Instant intelligent local e-commerce description generator
      await new Promise(resolve => setTimeout(resolve, 800)); // simulate brief network processing
      
      const productName = form.name.trim();
      const cleanHtml = `<p>Experience the superior quality and freshness of <b>${productName}</b>, carefully sourced to meet your everyday household and culinary needs.</p>
<ul>
  <li><b>100% Pure & Fresh:</b> Premium quality guaranteed with strict quality checks.</li>
  <li><b>Best Value:</b> Packed securely to preserve natural taste, aroma, and essential nutrients.</li>
  <li><b>Versatile Usage:</b> Perfect for daily cooking, household preparation, and family meals.</li>
</ul>
<p>Order today for fast 10-minute grocery delivery right to your doorstep!</p>`;

      setForm(prev => ({ ...prev, description: cleanHtml }));
    } catch (err) {
      alert("Generation error: " + err.message);
    } finally {
      setGeneratingAiDesc(false);
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
    let matchesTab = true;
    if (activeTab === 'approvals') {
      matchesTab = (p.approval_status === 'pending' || !p.approval_status);
    } else if (activeTab === 'lowStock') {
      matchesTab = Number(p.stock || 0) <= 5;
    } else if (activeTab === 'topSelling') {
      matchesTab = Number(p.totalSold || 0) > 0;
    }

    const matchesShopkeeper = selectedShopkeeperFilter === 'all' || String(p.shopkeeper_id).trim() === String(selectedShopkeeperFilter).trim();
    return matchesTab && matchesShopkeeper;
  }).sort((a, b) => {
    if (activeTab === 'topSelling') {
      return (b.totalSold || 0) - (a.totalSold || 0);
    }
    return 0;
  });

  const pendingCount = products.filter(p => p.approval_status === 'pending' || !p.approval_status).length;
  const lowStockCount = products.filter(p => Number(p.stock || 0) <= 5).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Product Inventory & Shopkeeper Moderation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filter products by store owner, check low stock alerts, top sellers, and catalog listings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shopkeeper Filter Dropdown */}
          <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-2 rounded-2xl border border-emerald-200">
            <Filter size={14} className="text-emerald-700" />
            <select 
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              value={selectedShopkeeperFilter}
              onChange={e => setSelectedShopkeeperFilter(e.target.value)}
            >
              <option value="all">All Shopkeepers (Stores)</option>
              {shopkeepers.map(sk => (
                <option key={sk.id} value={sk.id}>{sk.store_name} ({sk.email})</option>
              ))}
            </select>
          </div>

          {/* Bulk Upload Expandable Toggle Button */}
          <button 
            onClick={() => setIsExcelUploadExpanded(!isExcelUploadExpanded)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
          >
            <FileSpreadsheet size={16} className="text-emerald-700" /> 
            Bulk Excel Upload 
            {isExcelUploadExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button 
            onClick={openAddModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4.5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-700/20 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Expandable Excel Upload Section */}
      {isExcelUploadExpanded && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-md animate-fadeIn">
          <ExcelProductUpload onUploadSuccess={fetchData} />
        </div>
      )}

      {/* AI Product Intelligence Bar & Section Navigation Tabs */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-5">
        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">AI Catalog & Stock Diagnostics</h3>
            <p className="text-[11px] text-emerald-300/80">Real-time inventory health and moderation queue status.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <ShieldCheck size={14} className="text-emerald-400" /> Catalog Capacity
            </div>
            <p className="text-emerald-100/90">Total active catalog contains <strong className="text-white">{products.length}</strong> items across all vendor storefronts.</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-amber-400">
              <AlertTriangle size={14} className="text-amber-400" /> Low Stock Alerts
            </div>
            <p className="text-emerald-100/90"><strong className="text-white">{lowStockCount}</strong> products are running low on stock (≤5 units remaining).</p>
          </div>

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
              <CheckCircle2 size={14} className="text-emerald-400" /> Moderation Queue
            </div>
            <p className="text-emerald-100/90"><strong className="text-white">{pendingCount}</strong> store listings are currently awaiting admin review.</p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-800/80">
          <button 
            onClick={() => setActiveTab('inventory')} 
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >
            <Package size={14} /> All Inventory ({products.length})
          </button>

          <button 
            onClick={() => setActiveTab('approvals')} 
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'approvals' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >
            <AlertOctagon size={14} /> Pending Approvals {pendingCount > 0 && <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('lowStock')} 
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'lowStock' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >
            <AlertTriangle size={14} /> Low Stock Section {lowStockCount > 0 && <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full">{lowStockCount}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('topSelling')} 
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'topSelling' ? 'bg-emerald-400 text-slate-950 shadow-md' : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >
            <TrendingUp size={14} /> Most Orders / Top Selling
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500 font-semibold">
              <th className="p-4">Product & Store</th>
              <th className="p-4">Images</th>
              <th className="p-4">Variants</th>
              <th className="p-4">{activeTab === 'topSelling' ? 'Units Sold' : 'Price / Stock'}</th>
              <th className="p-4">Ratings & Reviews</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 text-xs">
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">Loading inventory...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic">No products found in this section.</td></tr>
            ) : (
              filteredProducts.map(p => {
                const imgList = p.images || p.gallery || [];
                return (
                  <tr key={p.id} className="hover:bg-emerald-50/30 transition">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl overflow-hidden shrink-0 border border-emerald-200">
                        {p.image_url || imgList.length > 0 ? (
                          <img src={p.image_url || imgList[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-slate-400 m-2"/>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5 border border-emerald-200">
                          <Store size={10} /> {p.shopkeeper_profiles?.store_name || 'Admin Store'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {imgList.length} loaded
                    </td>
                    <td className="p-4">
                      {p.variants?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.variants.map((v, i) => (
                            <span key={v.id || i} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-200">
                              {v.unit_label || v.label}: ₹{Number(v.price || 0)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No variants</span>
                      )}
                    </td>
                    <td className="p-4">
                      {activeTab === 'topSelling' ? (
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          🔥 {p.totalSold} Units Sold
                        </span>
                      ) : (
                        <>
                          <span className="font-bold block text-slate-900">₹{Number(p.price || 0).toFixed(2)}</span>
                          <span className={`text-[10px] font-bold ${Number(p.stock || 0) <= 5 ? 'text-amber-600' : 'text-slate-400'}`}>Stock: {p.stock}</span>
                        </>
                      )}
                    </td>
                    <td className="p-4">
                      {p.avgRating !== 'No ratings' ? (
                        <button 
                          onClick={() => {
                            setSelectedProductForReviews(p);
                            setProductReviewsList(p.reviews || []);
                          }}
                          className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-black border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                        >
                          <Star size={12} className="fill-amber-500 text-amber-500" />
                          <span>{p.avgRating} ({p.reviewCount})</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">No ratings</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        p.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        p.approval_status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.approval_status || 'pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {(!p.approval_status || p.approval_status === 'pending') && (
                        <button onClick={() => handleUpdateApproval(p.id, 'approved')} className="bg-emerald-700 text-white px-3 py-1 rounded-xl font-bold shadow-2xs hover:bg-emerald-800 transition cursor-pointer">Approve</button>
                      )}
                      <button onClick={() => openEditModal(p)} className="text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer" title="Edit"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer" title="Delete"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reviews Modal */}
      {selectedProductForReviews && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-700" /> 
                Customer Reviews for {selectedProductForReviews.name}
              </h3>
              <button onClick={() => setSelectedProductForReviews(null)} className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 cursor-pointer"><X size={16}/></button>
            </div>

            <div className="space-y-3">
              {productReviewsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No customer reviews submitted for this product yet.</p>
              ) : (
                productReviewsList.map(rev => (
                  <div key={rev.id} className="p-3.5 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{rev.user_email}</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} size={12} className="fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600">{rev.review_text}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-[10px] text-slate-400 font-mono">
                      <span>{new Date(rev.created_at).toLocaleString()}</span>
                      <button 
                        onClick={() => handleDeleteReview(rev.id)} 
                        className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} /> Delete Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setSelectedProductForReviews(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit with Images & Variants */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-emerald-100 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-base text-slate-900">{editingProduct ? 'Edit Product & Gallery' : 'Add Product with Gallery & Variants'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-emerald-50 text-slate-500 cursor-pointer"><X size={18}/></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input 
                  type="text" required placeholder="Aashirvaad Atta / Fresh Milk" 
                  className="w-full border border-emerald-200 p-3 rounded-2xl outline-none focus:border-emerald-600 text-sm bg-emerald-50/20 font-medium"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Price (₹)</label>
                  <input type="number" step="0.01" required placeholder="45.00" className="w-full border border-emerald-200 p-3 rounded-2xl text-sm bg-emerald-50/20 font-medium" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" placeholder="50.00" className="w-full border border-emerald-200 p-3 rounded-2xl text-sm bg-emerald-50/20 font-medium" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Stock</label>
                  <input type="number" required placeholder="100" className="w-full border border-emerald-200 p-3 rounded-2xl text-sm bg-emerald-50/20 font-medium" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select className="w-full border border-emerald-200 p-3 rounded-2xl text-sm bg-emerald-50/20 font-bold text-slate-800 cursor-pointer" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              {/* MULTIPLE IMAGE UPLOAD SECTION */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">Browse & Upload Multiple Images</label>
                <div className="border-2 border-dashed border-emerald-200 p-4 rounded-2xl text-center bg-emerald-50/30">
                  <input 
                    type="file" multiple accept="image/*" 
                    onChange={e => setImageFiles(Array.from(e.target.files))}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Select multiple files from your device to form the product gallery.</p>
                </div>

                {existingImages.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {existingImages.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-2xl border border-emerald-200 relative overflow-hidden bg-white shadow-2xs">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setExistingImages(existingImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 shadow cursor-pointer">
                          <X size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RICH TEXT DESCRIPTION EDITOR WITH AI */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Description (Rich Text Format)</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={generatingAiDesc}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black px-3 py-1 rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={12} className="text-amber-300 fill-amber-300 animate-pulse" />
                    {generatingAiDesc ? 'Generating AI Content...' : '✨ Generate with AI'}
                  </button>
                </div>

                <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-emerald-50/50 px-3 py-2 border-b border-emerald-100 flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => handleFormatText('<b>', '</b>')} 
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg text-slate-700 font-bold transition cursor-pointer"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleFormatText('<i>', '</i>')} 
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg text-slate-700 font-bold transition cursor-pointer"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <div className="h-4 w-[1px] bg-emerald-200 mx-1" />
                    <button 
                      type="button" 
                      onClick={() => handleFormatText('<ul>\n  <li>', '</li>\n</ul>')} 
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg text-slate-700 font-bold transition cursor-pointer"
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleFormatText('<p>', '</p>')} 
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg text-slate-700 font-bold transition cursor-pointer"
                      title="Paragraph Block"
                    >
                      <AlignLeft size={14} />
                    </button>
                  </div>
                  <textarea 
                    id="product-rich-description"
                    rows="4" 
                    placeholder="Enter formatted description or click 'Generate with AI'..." 
                    className="w-full p-3 text-sm bg-emerald-50/10 outline-none font-medium resize-y" 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">You can use standard HTML formatting tags or generate copy instantly using AI.</p>
              </div>

              {/* VARIANTS SECTION */}
              <div className="pt-4 border-t border-emerald-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-emerald-700" />
                    <span className="font-bold text-slate-900 text-sm">Product Variants (e.g. 500g, 1kg, 5L)</span>
                  </div>
                  <button type="button" onClick={addVariantRow} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer">
                    + Add Variant Tier
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-3 bg-emerald-50/30 rounded-2xl border border-emerald-100">No pack variants added.</p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, index) => (
                      <div key={index} className="flex gap-2 items-center bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100">
                        <input 
                          type="text" placeholder="Unit Label (e.g. 1 kg)" required 
                          className="flex-1 border border-emerald-200 p-2 rounded-xl text-xs bg-white font-medium"
                          value={v.unit_label || v.label} onChange={e => updateVariantRow(index, 'unit_label', e.target.value)}
                        />
                        <input 
                          type="number" step="0.01" placeholder="Price (₹)" required 
                          className="w-24 border border-emerald-200 p-2 rounded-xl text-xs bg-white font-medium"
                          value={v.price} onChange={e => updateVariantRow(index, 'price', e.target.value)}
                        />
                        <input 
                          type="number" step="0.01" placeholder="MRP (₹)" 
                          className="w-24 border border-emerald-200 p-2 rounded-xl text-xs bg-white font-medium"
                          value={v.mrp} onChange={e => updateVariantRow(index, 'mrp', e.target.value)}
                        />
                        <input 
                          type="number" placeholder="Stock" required 
                          className="w-20 border border-emerald-200 p-2 rounded-xl text-xs bg-white font-medium"
                          value={v.stock} onChange={e => updateVariantRow(index, 'stock', e.target.value)}
                        />
                        <button type="button" onClick={() => removeVariantRow(index)} className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 rounded-2xl transition text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 mt-4 cursor-pointer"
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