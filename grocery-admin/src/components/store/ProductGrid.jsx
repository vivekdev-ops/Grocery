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
      className="bg-white rounded-2xl border border-emerald-100 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer relative group overflow-hidden w-full"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2 right-2 z-20 p-1.5 rounded-xl transition-all duration-150 backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-105 shadow-xs' : 'bg-white/90 text-stone-400 hover:text-rose-500'}`}
        title="Wishlist"
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-0 left-0 z-20">
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] px-2.5 py-1 rounded-br-xl uppercase tracking-tight shadow-sm flex flex-col items-center leading-none">
            <span>{discountPct}%</span>
            <span>OFF</span>
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-emerald-50/40 to-teal-50/40 overflow-hidden flex items-center justify-center p-2.5">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackDummyImages[0]; }}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out" 
        />
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-800 border border-emerald-100 shadow-2xs">
          <Clock size={9} className="text-emerald-600" />
          <span>13M</span>
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-white text-stone-950 text-[9px] font-black px-3 py-1 rounded-lg uppercase">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-2 bg-white">
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">{product.name}</p>
          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-0.5">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                {variants.map((v, idx) => {
                  const vKey = v.id || v.label || v.unit_label || idx;
                  const vLabel = v.unit_label || v.label || `Opt ${idx + 1}`;
                  return <option key={vKey} value={vKey}>{vLabel} • ₹{v.price}</option>;
                })}
              </select>
            </div>
          ) : (
            <p className="text-[10px] text-stone-400 font-bold">{product.unit || '1 unit'}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-xs sm:text-sm text-slate-900">₹{price.toFixed(0)}</span>
            {hasMrp && <span className="text-[9px] sm:text-[10px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>}
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden h-7 sm:h-8 shadow-xs">
                <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }} className="px-2 h-full hover:bg-emerald-700 font-bold text-[10px] sm:text-xs flex items-center justify-center cursor-pointer">-</button>
                <span className="px-1.5 sm:px-2 font-black text-[10px] sm:text-xs">{qtyInCart}</span>
                <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }} className="px-2 h-full hover:bg-emerald-700 font-bold text-[10px] sm:text-xs flex items-center justify-center cursor-pointer">+</button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.1, 1] } : {}}
                transition={{ duration: 0.2 }}
                className={`h-7 sm:h-8 px-3 sm:px-4 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide cursor-pointer transition border shadow-2xs
                  ${addedFlash ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border-emerald-200'}`}
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

  return (
    <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-2 font-sans pb-24 md:pb-12 text-slate-900 overflow-y-auto text-xs">
      
      {/* ── TOP CATEGORIES STRIP (EXPLORE BY CATEGORY - FULL CIRCLE IMAGES) ── */}
      {!isAnyCategorySelected && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-xs sm:text-sm text-stone-950 tracking-tight uppercase">Explore Categories</h3>
          </div>
          <div className="flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); setCurrentPage(1); }}
              className={`flex flex-col items-center p-2 rounded-2xl border cursor-pointer shrink-0 w-16 sm:w-auto transition-all
                ${activeCategory === 'All' ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20' : 'border-emerald-100 bg-white hover:border-emerald-400'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 shrink-0 ${activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>
                <Sparkles size={15} />
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
                  className={`flex flex-col items-center p-2 rounded-2xl border cursor-pointer shrink-0 w-16 sm:w-auto transition-all
                    ${isSelected ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20' : 'border-emerald-100 bg-white hover:border-emerald-400'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden mb-1 border border-stone-200 shrink-0 shadow-2xs">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover rounded-full" />
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
        <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 mb-6 w-full max-h-[420px] border border-emerald-500/20 flex items-center justify-center">
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
                  className="w-full h-auto max-h-[420px] object-contain filter brightness-105 contrast-110 mx-auto" 
                />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-stone-950/40 backdrop-blur-md flex flex-col items-start space-y-1 border-t border-white/10 shadow-2xl">
                  <span className="bg-emerald-400 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                    ⚡ 13 Mins Delivery
                  </span>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">{banners[currentSlide]?.title || 'Fresh groceries instantly'}</h2>
                  <p className="text-[10px] sm:text-[11px] text-emerald-100 font-medium">{banners[currentSlide]?.subtitle || 'Delivered straight to your doorstep.'}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 bg-stone-950/40 backdrop-blur-md flex flex-col items-start space-y-1 border-t border-white/10 shadow-2xl w-full">
              <span className="bg-emerald-400 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                ⚡ Lightning Delivery
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Fresh groceries at your doorstep</h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-100">Order dairy, vegetables, fruits, and daily essentials instantly.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STOREFRONT VIEW WITH 15% SUBCATEGORY SIDEBAR & 85% PRODUCT LISTING ── */}
      {isAnyCategorySelected ? (
        <div className="grid grid-cols-1 md:grid-cols-[15%_85%] gap-4 items-start">
          
          {/* DESKTOP 15% VERTICAL SUB-SIDEBAR (FULL CIRCLE IMAGES) */}
          {!query && currentSubcategories.length > 0 && (
            <div className="hidden md:flex flex-col w-full bg-white rounded-2xl border border-emerald-100 p-1.5 space-y-1 shadow-2xs sticky top-16 max-h-[calc(100vh-100px)] overflow-y-auto">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`w-full flex flex-col items-center p-2.5 rounded-xl text-center transition cursor-pointer border ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-black shadow-2xs ring-1 ring-emerald-500/20' 
                    : 'bg-white border-transparent text-stone-600 hover:bg-stone-50 font-bold'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1 shadow-2xs shrink-0">
                  <Sparkles size={14} />
                </div>
                <span className="text-[10px] leading-tight truncate w-full">All Items</span>
              </button>

              <div className="space-y-1">
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
                      <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden mb-1 border border-stone-200/80 flex items-center justify-center shadow-2xs shrink-0">
                        {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover rounded-full" /> : <Package size={14} className="text-stone-400" />}
                      </div>
                      <span className="text-[10px] leading-tight truncate w-full">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 85% PRODUCTS AREA */}
          <div className="flex-1 w-full space-y-3 min-w-0">
            
            {/* MOBILE 4x2 SUBCATEGORY GRID (EXACT 4 COLUMNS x 2 ROWS = 8 ITEMS, SQUARE SHAPE WITH FILLED IMAGE) */}
            {!query && currentSubcategories.length > 0 && (
              <div className="block md:hidden bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-[11px] text-stone-900 uppercase tracking-wider">Subcategories</h3>
                  <span className="text-[10px] text-emerald-700 font-bold">{currentSubcategories.length} available</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {/* 'All' option card */}
                  <div
                    onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                    className={`flex flex-col items-center bg-stone-50 rounded-xl p-1.5 border cursor-pointer transition ${
                      activeSubcategoryId === 'All' ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-500' : 'border-stone-200'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-emerald-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                      <Sparkles size={15} />
                    </div>
                    <span className="text-[9px] font-black text-stone-900 text-center truncate w-full">All</span>
                  </div>

                  {/* Subcategory cards (takes up to 7 items to fit precisely in the 4x2 grid alongside 'All') */}
                  {currentSubcategories.slice(0, 7).map((sub, index) => {
                    const isSubSelected = activeSubcategoryId === sub.id;
                    const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                    return (
                      <div
                        key={sub.id}
                        onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                        className={`flex flex-col items-center bg-stone-50 rounded-xl p-1.5 border cursor-pointer transition ${
                          isSubSelected ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-500' : 'border-stone-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-stone-100 mb-1 shadow-2xs">
                          <img src={subImg} alt={sub.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[9px] font-bold text-stone-800 text-center truncate w-full">{sub.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
              <div>
                <h2 className="font-black text-stone-900 text-xs sm:text-sm tracking-tight">
                  {query 
                    ? `Search: "${searchQuery}"` 
                    : activeSubcategoryId !== 'All' && activeSubcategoryObj 
                      ? activeSubcategoryObj.name 
                      : activeCategoryObj?.name || 'All Products'}
                </h2>
                <p className="text-[9px] text-stone-400 font-medium">Delivering in 13 minutes to your location</p>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none relative">
                
                {/* SORT DROPDOWN CONTAINER */}
                <div className="relative">
                  <button 
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-[11px] font-bold border border-emerald-200 shrink-0 cursor-pointer shadow-2xs transition"
                  >
                    <ArrowUpDown size={11} className="text-emerald-700" /> 
                    {sortBy === 'price_asc' ? 'Price: Low to High' : sortBy === 'price_desc' ? 'Price: High to Low' : sortBy === 'rating_desc' ? 'Ratings' : 'Sort by'}
                  </button>

                  {sortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-emerald-100 z-50 py-1 text-[11px]">
                      <button
                        onClick={() => { setSortBy('price_asc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 font-bold transition hover:bg-emerald-50 ${sortBy === 'price_asc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Price: Low to High
                      </button>
                      <button
                        onClick={() => { setSortBy('price_desc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 font-bold transition hover:bg-emerald-50 ${sortBy === 'price_desc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Price: High to Low
                      </button>
                      <button
                        onClick={() => { setSortBy('rating_desc'); setSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 font-bold transition hover:bg-emerald-50 ${sortBy === 'rating_desc' ? 'text-emerald-700 bg-emerald-50/60 font-black' : 'text-stone-700'}`}
                      >
                        Top Rated
                      </button>
                      {sortBy && (
                        <button
                          onClick={() => { setSortBy(''); setSortDropdownOpen(false); setCurrentPage(1); }}
                          className="w-full text-left px-3.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border-t border-stone-100 mt-1"
                        >
                          Clear Sort
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-emerald-100 text-center shadow-2xs">
                <Package size={36} className="text-stone-300 mx-auto mb-2" />
                <p className="text-[11px] font-black text-stone-700">No active products found in this selection.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
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
                  <div className="flex justify-center items-center gap-1.5 pt-3">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-1.5 bg-white rounded-xl border border-stone-200 disabled:opacity-40 shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={`w-7 h-7 rounded-xl font-black text-[11px] cursor-pointer shadow-2xs ${
                          currentPage === num ? 'bg-emerald-600 text-white' : 'bg-white text-stone-600 border border-stone-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-1.5 bg-white rounded-xl border border-stone-200 disabled:opacity-40 shadow-2xs cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      ) : (
        /* HOMEPAGE POPULATION: SHOWING CATEGORIES WITH SUBCATEGORIES IN 4x2 MOBILE GRID (NO PRODUCTS) */
        <div className="space-y-4">
          {parentCategories.map(parent => {
            const subcats = getSubcategories(parent.id);
            if (subcats.length === 0) return null;

            return (
              <div key={parent.id} className="bg-white rounded-2xl border border-emerald-100 shadow-2xs p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight uppercase">{parent.name}</h3>
                  <button onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId('All'); setCurrentPage(1); }} className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 cursor-pointer uppercase flex items-center gap-0.5 bg-emerald-50 px-2 py-1 rounded-xl">
                    <span>see all</span> <ChevronRight size={11} />
                  </button>
                </div>

                {/* MOBILE 4x2 SUBCATEGORY GRID FOR LANDING PAGE SECTIONS (EXACT 4 COLUMNS x 2 ROWS = 8 ITEMS, SQUARE SHAPE WITH FILLED IMAGE) */}
                <div className="block md:hidden bg-emerald-50/30 p-2 rounded-xl border border-emerald-100 mb-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {/* 'All / View All' option card */}
                    <div
                      onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                      className="flex flex-col items-center bg-white rounded-lg p-1 border border-stone-200 cursor-pointer transition hover:border-emerald-400"
                    >
                      <div className="w-full aspect-square rounded-md overflow-hidden bg-emerald-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                        <Sparkles size={14} />
                      </div>
                      <span className="text-[9px] font-black text-stone-900 text-center truncate w-full">View All</span>
                    </div>

                    {/* Subcategory cards (takes up to 7 items to fit precisely in the 4x2 grid alongside 'View All') */}
                    {subcats.slice(0, 7).map((sub, index) => {
                      const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                      return (
                        <div
                          key={sub.id}
                          onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                          className="flex flex-col items-center bg-white rounded-lg p-1 border border-stone-200 cursor-pointer transition hover:border-emerald-400"
                        >
                          <div className="w-full aspect-square rounded-md overflow-hidden bg-stone-100 mb-1 shadow-2xs">
                            <img src={subImg} alt={sub.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[9px] font-bold text-stone-800 text-center truncate w-full">{sub.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DESKTOP SUBCATEGORIES SCROLL STRIP (Full Circle Images) */}
                <div className="hidden md:flex overflow-x-auto pb-1 gap-2.5 scrollbar-none snap-x">
                  {subcats.map((sub, index) => {
                    const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                    return (
                      <motion.div
                        whileHover={{ y: -1 }}
                        key={sub.id}
                        onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                        className="flex flex-col items-center text-center cursor-pointer group space-y-1 shrink-0 w-16 snap-start"
                      >
                        <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200 overflow-hidden shadow-2xs group-hover:border-emerald-400 transition-all shrink-0 p-0.5 flex items-center justify-center">
                          {sub.image_url ? (
                            <img src={subImg} alt={sub.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <Package size={16} className="text-emerald-600" />
                          )}
                        </div>
                        <span className="font-bold text-[9px] text-stone-800 group-hover:text-emerald-700 leading-tight line-clamp-1 w-full px-0.5">
                          {sub.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </main>
  );
}