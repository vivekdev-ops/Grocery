// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft, Flame, Zap, LayoutGrid, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductCard({ product, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, cart = [], addToCart, updateQuantity, onSelectProduct }) {
  const [addedFlash, setAddedFlash] = useState(false);

  const fallbackDummyImages = [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80'
  ];

  const getProductImage = () => {
    const images = product.images || product.gallery || [product.image_url].filter(Boolean);
    if (images.length > 0 && images[0]) return images[0];
    const charCodeSum = (product.id || product.name || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return fallbackDummyImages[charCodeSum % fallbackDummyImages.length];
  };

  const displayImage = getProductImage();
  const variants = product.variants || product.product_variants || [];
  const hasVariants = variants.length > 0;

  const currentVariantKey = selectedVariants?.[product.id] || (hasVariants ? (variants[0].id || variants[0].label || variants[0].unit_label) : null);
  const activeVariant = variants.find(
    v => v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey
  ) || variants[0];

  const price = Number(activeVariant ? activeVariant.price : product.price || 0);
  const mrp = Number(activeVariant?.mrp || product.mrp || 0);
  const hasMrp = mrp > price;
  const discountPct = hasMrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = Number(activeVariant ? activeVariant.stock : product.stock || 0);
  const isOutOfStock = stock <= 0;
  const isWishlisted = wishlistIds?.includes(product.id);

  const variantIdentifier = activeVariant ? (activeVariant.id || activeVariant.unit_label || activeVariant.label || 'default') : 'default';
  const cartItemId = `${product.id}-${variantIdentifier}`;
  const cartItem = (cart || []).find(item => item.cartItemId === cartItemId);
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  const handleVariantChange = (e) => {
    e.stopPropagation();
    setSelectedVariants(prev => ({ ...prev, [product.id]: e.target.value }));
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product, activeVariant);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 900);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer relative group overflow-hidden w-full"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2 right-2 z-20 p-1.5 rounded-xl transition-all duration-150 backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-105' : 'bg-white/80 text-stone-400 hover:text-rose-500'}`}
        title="Wishlist"
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-0 left-0 z-20">
          <span className="bg-[#2563EB] text-white font-black text-[9px] px-2 py-1.5 rounded-br-xl uppercase tracking-tight flex flex-col items-center leading-none">
            <span>{discountPct}%</span>
            <span>OFF</span>
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-50 to-stone-100 overflow-hidden flex items-center justify-center p-3">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackDummyImages[0]; }}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out" 
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-stone-100/90 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-700">
          <Clock size={9} />
          <span>15M</span>
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-white text-stone-950 text-[9px] font-black px-3 py-1 rounded-lg uppercase">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 justify-between gap-2.5 bg-white">
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight group-hover:text-emerald-700">{product.name}</p>
          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-0.5">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                {variants.map((v, idx) => {
                  const vKey = v.id || v.label || v.unit_label || idx;
                  const vLabel = v.unit_label || v.label || `Opt ${idx + 1}`;
                  return <option key={vKey} value={vKey}>{vLabel} • ₹{v.price}</option>;
                })}
              </select>
            </div>
          ) : (
            <p className="text-[10px] text-stone-500 font-bold">{product.unit || '1 unit'}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-sm text-slate-900">₹{price.toFixed(0)}</span>
            {hasMrp && <span className="text-[10px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>}
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden h-8 shadow-xs">
                <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }} className="px-2.5 h-full hover:bg-emerald-700 font-bold text-xs flex items-center justify-center cursor-pointer">-</button>
                <span className="px-2 font-black text-xs">{qtyInCart}</span>
                <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }} className="px-2.5 h-full hover:bg-emerald-700 font-bold text-xs flex items-center justify-center cursor-pointer">+</button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.1, 1] } : {}}
                transition={{ duration: 0.2 }}
                className={`h-8 px-4 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer transition border
                  ${addedFlash ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'}`}
              >
                {addedFlash ? '✓' : 'ADD'}
              </motion.button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProductGrid({
  banners, currentSlide, activeFlashSale, timeLeft, formatTime,
  categories, activeCategory, setActiveCategory, loading,
  products, searchQuery = '', wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants,
  cart = [], addToCart, updateQuantity, onSelectProduct
}) {
  const fallbackImages = [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&auto=format&fit=crop&q=80',
  ];

  const activeCategories = (categories || []).filter(c => c.is_active !== false);
  const activeProducts = (products || []).filter(p => p.is_active !== false);

  const [activeSubcategoryId, setActiveSubcategoryId] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const productsPerPage = 12;

  const parentCategories = activeCategories.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => activeCategories.filter(c => c.parent_id === parentId);

  const activeCategoryObj = activeCategories.find(c => c.id === activeCategory);
  const activeSubcategoryObj = activeCategories.find(c => c.id === activeSubcategoryId);
  const currentSubcategories = activeCategory !== 'All' ? getSubcategories(activeCategory) : [];

  const query = searchQuery.toLowerCase().trim();

  // Filter products based on category/subcategory and search query
  const sourceProducts = activeProducts.filter(p => {
    const matchesSearch = !query || p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (activeCategory === 'All') return true;

    const subIds = currentSubcategories.map(s => s.id);
    if (activeSubcategoryId !== 'All') {
      return p.category_id === activeSubcategoryId || p.category === activeSubcategoryId;
    }
    return p.category_id === activeCategory || p.category === activeCategory || subIds.includes(p.category_id);
  });

  // Apply restricted sorting: Price: Low to High, Price: High to Low, Ratings
  const sortedProducts = [...sourceProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const priceA = Number(a.variants?.[0]?.price ?? a.price ?? 0);
      const priceB = Number(b.variants?.[0]?.price ?? b.price ?? 0);
      return priceA - priceB;
    }
    if (sortBy === 'price_desc') {
      const priceA = Number(a.variants?.[0]?.price ?? a.price ?? 0);
      const priceB = Number(b.variants?.[0]?.price ?? b.price ?? 0);
      return priceB - priceA;
    }
    if (sortBy === 'rating_desc') {
      const ratingA = Number(a.avgRating || a.rating || 0);
      const ratingB = Number(b.avgRating || b.rating || 0);
      return ratingB - ratingA;
    }
    return 0;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const isAnyCategorySelected = activeCategory !== 'All' || query.length > 0;
  const [mobileSubDrawerOpen, setMobileSubDrawerOpen] = useState(false);

  return (
    <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-2 font-sans pb-20 md:pb-12 text-slate-900 overflow-visible">
      
      {/* ── TOP CATEGORIES STRIP (EXPLORE BY CATEGORY) ── -->[cite: 1] */}
      {!isAnyCategorySelected && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-sm sm:text-lg text-stone-900 tracking-tight">Explore Categories</h3>
          </div>
          <div className="flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-x-auto pb-1 scrollbar-none">
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); setCurrentPage(1); }}
              className={`flex flex-col items-center p-2 rounded-xl border cursor-pointer shrink-0 w-20 sm:w-auto transition-all
                ${activeCategory === 'All' ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md' : 'border-emerald-100 bg-white/90 hover:border-emerald-400'}`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-1 ${activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>
                <Sparkles size={18} />
              </div>
              <span className={`text-[10px] font-black truncate w-full ${activeCategory === 'All' ? 'text-white' : 'text-stone-900'}`}>All</span>
            </motion.button>

            {parentCategories.map((cat, index) => {
              const isSelected = activeCategory === cat.id;
              const img = cat.image_url || fallbackImages[index % fallbackImages.length];
              return (
                <motion.button
                  whileHover={{ y: -2 }}
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                  className={`flex flex-col items-center p-2 rounded-xl border cursor-pointer shrink-0 w-20 sm:w-auto transition-all
                    ${isSelected ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md' : 'border-emerald-100 bg-white/90 hover:border-emerald-400'}`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-stone-100 overflow-hidden mb-1 border border-emerald-100">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[10px] font-black truncate w-full ${isSelected ? 'text-white' : 'text-stone-900'}`}>{cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FULL HD CLEAR BANNER WITH FROSTED BLURRED TITLE AT BOTTOM ── */}
      {!isAnyCategorySelected && (
        <div className="relative rounded-[2rem] overflow-hidden shadow-xl bg-slate-950 mb-6 w-full max-h-[500px] border border-emerald-500/20 flex items-center justify-center">
          {banners && banners.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full relative flex items-center justify-center"
              >
                <img 
                  src={banners[currentSlide]?.image_url} 
                  alt="Banner" 
                  className="w-full h-auto max-h-[500px] object-contain filter brightness-105 contrast-110 mx-auto" 
                />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 bg-white/10 backdrop-blur-md flex flex-col items-start space-y-1 border-t border-white/20 shadow-2xl">
                  
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight filter blur-[0.4px] drop-shadow-sm">{banners[currentSlide]?.title || 'Fresh groceries instantly'}</h2>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 bg-white/10 backdrop-blur-md flex flex-col items-start space-y-1 border-t border-white/20 shadow-2xl w-full">
              <span className="bg-emerald-400 text-slate-950 font-black text-[9px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                ⚡ Lightning Delivery
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight filter blur-[0.4px] drop-shadow-sm">Fresh groceries at your doorstep</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 filter blur-[0.3px]">Order dairy, vegetables, fruits, and daily essentials instantly.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STOREFRONT VIEW WITH 15% SUBCATEGORY SIDEBAR & 85% PRODUCT LISTING ── */}
      {isAnyCategorySelected ? (
        <div className="grid grid-cols-1 md:grid-cols-[15%_85%] gap-4 items-start">
          
          {/* MOBILE TOGGLE BUTTON FOR SUBCATEGORIES */}
          {!query && currentSubcategories.length > 0 && (
            <div className="md:hidden col-span-full flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-xs font-black text-stone-900 truncate">
                {activeSubcategoryObj ? activeSubcategoryObj.name : activeCategoryObj?.name}
              </span>
              <button
                type="button"
                onClick={() => setMobileSubDrawerOpen(true)}
                className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <LayoutGrid size={12} /> Subcategories
              </button>
            </div>
          )}

          {/* DESKTOP 15% VERTICAL SUB-SIDEBAR */}
          {!query && currentSubcategories.length > 0 && (
            <div className="hidden md:flex flex-col w-full bg-white rounded-2xl border border-stone-200/90 p-1.5 space-y-1 shadow-2xs sticky top-16">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`w-full flex flex-col items-center p-2.5 rounded-xl text-center transition cursor-pointer border ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-black shadow-2xs ring-1 ring-emerald-500/20' 
                    : 'bg-white border-transparent text-stone-600 hover:bg-stone-50 font-bold'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1 shadow-2xs">
                  <Sparkles size={16} />
                </div>
                <span className="text-[10px] leading-tight truncate w-full">All Items</span>
              </button>

              <div className="max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-none space-y-1">
                {currentSubcategories.map((sub, index) => {
                  const isSubSelected = activeSubcategoryId === sub.id;
                  const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                  return (
                    <button
                      key={sub.id}
                      onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                      className={`w-full flex flex-col items-center p-2.5 rounded-xl text-center transition cursor-pointer border ${
                        isSubSelected 
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-black shadow-2xs ring-1 ring-emerald-500/20' 
                          : 'bg-white border-transparent text-stone-600 hover:bg-stone-50 font-bold'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-stone-100 overflow-hidden mb-1 border border-stone-200/80 flex items-center justify-center shadow-2xs">
                        {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-stone-400" />}
                      </div>
                      <span className="text-[10px] leading-tight truncate w-full">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MOBILE DRAWER FOR SUBCATEGORIES */}
          <AnimatePresence>
            {mobileSubDrawerOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSubDrawerOpen(false)} className="fixed inset-0 bg-slate-950/60 z-[150] md:hidden" />
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[160] p-4 space-y-3 max-h-[75vh] overflow-y-auto md:hidden shadow-2xl border-t border-emerald-100">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-stone-900">Subcategories</h4>
                    <button type="button" onClick={() => setMobileSubDrawerOpen(false)} className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); setMobileSubDrawerOpen(false); }} className={`flex items-center gap-2 p-2.5 rounded-xl border text-left ${activeSubcategoryId === 'All' ? 'bg-emerald-600 text-white font-black' : 'bg-stone-50 text-stone-800'}`}>
                      <span className="text-xs font-black truncate">All</span>
                    </button>
                    {currentSubcategories.map((sub) => (
                      <button key={sub.id} onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); setMobileSubDrawerOpen(false); }} className={`flex items-center gap-2 p-2.5 rounded-xl border text-left ${activeSubcategoryId === sub.id ? 'bg-emerald-600 text-white font-black' : 'bg-stone-50 text-stone-800'}`}>
                        <span className="text-xs font-black truncate">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* 85% PRODUCTS AREA */}
          <div className="flex-1 w-full space-y-3 min-w-0">
            
            <div className="bg-white px-4 py-3 rounded-2xl border border-stone-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <h2 className="font-black text-stone-900 text-sm sm:text-base tracking-tight">
                  {query ? `Search: "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name)}
                </h2>
                <p className="text-[10px] text-stone-400 font-medium">Delivering to: Bhikaji Cama Place, New Delhi</p>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none relative">
                <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 shrink-0 cursor-pointer shadow-2xs">
                  <SlidersHorizontal size={12} /> Filters
                </button>
                
                {/* SORT DROPDOWN CONTAINER */}
                <div className="relative">
                  <button 
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <ArrowUpDown size={12} /> 
                    {sortBy === 'price_asc' ? 'Price: Low to High' : sortBy === 'price_desc' ? 'Price: High to Low' : sortBy === 'rating_desc' ? 'Ratings' : 'Sort'}
                  </button>

                  {sortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 py-1.5">
                      <button
                        onClick={() => { setSortBy('price_asc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition hover:bg-emerald-50 ${sortBy === 'price_asc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Price: Low to High
                      </button>
                      <button
                        onClick={() => { setSortBy('price_desc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition hover:bg-emerald-50 ${sortBy === 'price_desc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Price: High to Low
                      </button>
                      <button
                        onClick={() => { setSortBy('rating_desc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition hover:bg-emerald-50 ${sortBy === 'rating_desc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Ratings
                      </button>
                      {sortBy && (
                        <button
                          onClick={() => { setSortBy(''); setSortDropdownOpen(false); setCurrentPage(1); }}
                          className="w-full text-left px-4 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border-t border-stone-100 mt-1"
                        >
                          Clear Sort
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 shrink-0 cursor-pointer shadow-2xs">
                  Quantity
                </button>
              </div>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center shadow-2xs">
                <Package size={44} className="text-stone-300 mx-auto mb-3" />
                <p className="text-xs font-black text-stone-700">No active products found in this selection.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      wishlistIds={wishlistIds}
                      toggleWishlist={toggleWishlist}
                      selectedVariants={selectedVariants}
                      setSelectedVariants={setSelectedVariants}
                      cart={cart}
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      onSelectProduct={onSelectProduct}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 pt-4">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={`w-8 h-8 rounded-xl font-black text-xs cursor-pointer shadow-2xs ${
                          currentPage === num ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 border border-stone-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-2 bg-white rounded-xl border border-stone-200 disabled:opacity-40 text-xs shadow-2xs cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      ) : (
        /* HOMEPAGE POPULATION: SHOWING CATEGORIES WITH PRODUCTS UNDERNEATH EACH SECTION */
        <div className="space-y-6">
          {parentCategories.map(parent => {
            const subcats = getSubcategories(parent.id);
            if (subcats.length === 0) return null;

            // Get products belonging to this parent category or its subcategories to show in the section
            const subIds = subcats.map(s => s.id);
            const categoryProducts = activeProducts.filter(p => 
              p.category_id === parent.id || p.category === parent.id || subIds.includes(p.category_id)
            );

            return (
              <div key={parent.id} className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight">{parent.name}</h3>
                  <button onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId('All'); setCurrentPage(1); }} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer uppercase flex items-center gap-0.5 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    <span>see all</span> <ChevronRight size={12} />
                  </button>
                </div>

                {/* Subcategories Scroll Strip */}
                <div className="flex overflow-x-auto pb-1 gap-3 scrollbar-none snap-x">
                  {subcats.map((sub, index) => {
                    const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                    return (
                      <motion.div
                        whileHover={{ y: -1 }}
                        key={sub.id}
                        onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                        className="flex flex-col items-center text-center cursor-pointer group space-y-1 shrink-0 w-20 snap-start"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-50 border border-stone-200 overflow-hidden shadow-2xs group-hover:border-emerald-400 transition-all shrink-0 p-1 flex items-center justify-center">
                          {sub.image_url ? (
                            <img src={subImg} alt={sub.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package size={20} className="text-emerald-600" />
                          )}
                        </div>
                        <span className="font-bold text-[10px] text-stone-800 group-hover:text-emerald-700 leading-tight line-clamp-1 w-full px-0.5">
                          {sub.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Sample Product Cards Grid for this category section */}
                {categoryProducts.length > 0 && (
                  <div className="pt-2 border-t border-stone-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {categoryProducts.slice(0, 6).map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          wishlistIds={wishlistIds}
                          toggleWishlist={toggleWishlist}
                          selectedVariants={selectedVariants}
                          setSelectedVariants={setSelectedVariants}
                          cart={cart}
                          addToCart={addToCart}
                          updateQuantity={updateQuantity}
                          onSelectProduct={onSelectProduct}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </main>
  );
}