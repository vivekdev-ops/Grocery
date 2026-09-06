// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft, Flame, Zap } from 'lucide-react';
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
    if (images.length > 0 && images[0]) {
      return images[0];
    }
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

  const price      = Number(activeVariant ? activeVariant.price : product.price || 0);
  const mrp        = Number(activeVariant?.mrp || product.mrp || 0);
  const hasMrp     = mrp > price;
  const discountPct = hasMrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock      = Number(activeVariant ? activeVariant.stock : product.stock || 0);
  const isOutOfStock = stock <= 0;
  const isWishlisted = wishlistIds?.includes(product.id);

  const avgRating = product.avgRating || product.rating || null;

  const variantIdentifier = activeVariant ? (activeVariant.id || activeVariant.unit_label || activeVariant.label || 'default') : 'default';
  const cartItemId = `${product.id}-${variantIdentifier}`;
  const cartItem = (cart || []).find(item => item.cartItemId === cartItemId);
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  const handleVariantChange = (e) => {
    e.stopPropagation();
    const val = e.target.value;
    setSelectedVariants(prev => ({ ...prev, [product.id]: val }));
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product, activeVariant);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 900);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelectProduct(product)}
      className="bg-white/90 backdrop-blur-md rounded-[2.5rem] border border-emerald-100/80 shadow-md hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-4 right-4 z-20 p-2.5 rounded-2xl transition-all duration-200 shadow-sm backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110 shadow-rose-100' : 'bg-white/80 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
        title="Wishlist"
      >
        <Heart size={15} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-4 left-4 z-20">
          <span className="bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-[10px] px-3 py-1.5 rounded-2xl shadow-lg uppercase tracking-wider flex items-center gap-1">
            <Flame size={10} className="fill-white" /> {discountPct}% OFF
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-50 via-emerald-50/10 to-teal-50/30 overflow-hidden flex items-center justify-center p-6">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackDummyImages[0];
          }}
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 ease-out drop-shadow-md" 
        />

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black text-slate-800 shadow-sm border border-emerald-100/60">
          <Clock size={12} className="text-emerald-600 animate-pulse" />
          <span>10 mins</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="bg-white text-stone-950 text-xs font-black px-5 py-2 rounded-2xl uppercase tracking-widest shadow-2xl">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-2">
          {avgRating && avgRating !== 'No ratings' && Number(avgRating) > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-xl w-max border border-amber-200 shadow-2xs">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
            </div>
          )}

          <p className="font-black text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">{product.name}</p>

          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-1">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200 text-emerald-950 text-xs font-black rounded-2xl px-3 py-2 outline-none transition cursor-pointer shadow-2xs"
              >
                {variants.map((v, idx) => {
                  const vKey = v.id || v.label || v.unit_label || idx;
                  const vLabel = v.unit_label || v.label || `Option ${idx + 1}`;
                  return (
                    <option key={vKey} value={vKey}>{vLabel} • ₹{v.price}</option>
                  );
                })}
              </select>
            </div>
          ) : (
            <p className="text-[11px] text-stone-500 font-bold bg-stone-100 px-2.5 py-1 rounded-xl w-max">{product.unit || '1 unit'}</p>
          )}
        </div>

        {/* Price & Cart/Quantity Counter Row */}
        <div className="flex items-center justify-between pt-3.5 border-t border-emerald-50 mt-auto" onClick={e => e.stopPropagation()}>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-lg text-slate-900 leading-tight">₹{price.toFixed(0)}</span>
              {hasMrp && (
                <span className="text-xs text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>
              )}
            </div>
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-2xl overflow-hidden shadow-lg shadow-emerald-600/25 h-10">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }}
                  className="px-3.5 h-full hover:bg-emerald-700 font-black text-sm flex items-center justify-center cursor-pointer transition"
                  title="Decrease"
                >
                  -
                </button>
                <span className="px-3 font-black text-xs">{qtyInCart}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }}
                  className="px-3.5 h-full hover:bg-emerald-700 font-black text-sm flex items-center justify-center cursor-pointer transition"
                  title="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.1, 1] } : {}}
                transition={{ duration: 0.25 }}
                className={`h-10 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md btn-press
                  ${addedFlash ? 'bg-emerald-600 text-white shadow-emerald-600/40' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent'}`}
              >
                {addedFlash ? '✓ Added' : '+ Add'}
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
  const productsPerPage = 12;

  const parentCategories = activeCategories.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => activeCategories.filter(c => c.parent_id === parentId);

  const activeCategoryObj = activeCategories.find(c => c.id === activeCategory);
  const activeSubcategoryObj = activeCategories.find(c => c.id === activeSubcategoryId);
  const currentSubcategories = activeCategory !== 'All' ? getSubcategories(activeCategory) : [];

  const query = searchQuery.toLowerCase().trim();

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

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sourceProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(sourceProducts.length / productsPerPage);

  const isAnyCategorySelected = activeCategory !== 'All' || query.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 font-sans pb-32 md:pb-16 text-slate-900">
      
      {/* ── STYLISH HERO BANNERS CAROUSEL ── */}
      {!isAnyCategorySelected && banners?.length > 0 && (
        <div className="relative rounded-[3rem] overflow-hidden shadow-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 mb-12 min-h-[220px] sm:min-h-[280px] border border-emerald-500/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img src={banners[currentSlide]?.image_url} alt="Banner" className="w-full h-full object-cover opacity-50 filter saturate-125" />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/50 to-transparent flex flex-col justify-center p-8 sm:p-14 text-white space-y-3">
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest w-max shadow-lg">
                  ⚡ 10 Minutes Lightning Delivery
                </span>
                <h2 className="text-2xl sm:text-4xl font-black max-w-lg tracking-tight leading-tight">{banners[currentSlide]?.title || 'Fresh groceries at your doorstep'}</h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-md">{banners[currentSlide]?.subtitle || 'Farm-fresh vegetables, dairy, and daily essentials delivered instantly.'}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── STYLISH HOMEPAGE CATEGORY CARDS ── */}
      {!isAnyCategorySelected && (
        <div className="space-y-5 mb-12">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xl sm:text-2xl text-stone-900 tracking-tight">Explore Categories</h3>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200/80 shadow-2xs">All Hubs Active</span>
          </div>
          
          <div className="flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-4 overflow-x-auto pb-3 sm:pb-0 scrollbar-none">
            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); setCurrentPage(1); }}
              className={`flex flex-col items-center p-4 rounded-3xl border cursor-pointer transition-all shrink-0 w-28 sm:w-auto group btn-press
                ${activeCategory === 'All' ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-600/20 shadow-xl scale-105' : 'border-emerald-100 bg-white/80 backdrop-blur-md hover:border-emerald-400 hover:bg-emerald-50/50 shadow-sm'}`}
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center overflow-hidden mb-3 shadow-md ${activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                <Sparkles size={26} />
              </div>
              <span className={`text-xs font-black leading-tight text-center truncate w-full ${activeCategory === 'All' ? 'text-white' : 'text-stone-900'}`}>All Items</span>
            </motion.button>

            {parentCategories.map((cat, index) => {
              const isSelected = activeCategory === cat.id;
              const img = cat.image_url || fallbackImages[index % fallbackImages.length];
              return (
                <motion.button
                  whileHover={{ y: -4 }}
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                  className={`flex flex-col items-center p-4 rounded-3xl border cursor-pointer transition-all shrink-0 w-28 sm:w-auto group btn-press
                    ${isSelected ? 'border-emerald-600 bg-gradient-to-b from-emerald-500 to-teal-600 text-white ring-4 ring-emerald-600/20 shadow-xl scale-105' : 'border-emerald-100 bg-white/80 backdrop-blur-md hover:border-emerald-400 hover:bg-emerald-50/50 shadow-sm'}`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 overflow-hidden mb-3 border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-xs font-black leading-tight text-center truncate w-full ${isSelected ? 'text-white' : 'text-stone-900'}`}>{cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STOREFRONT LAYOUT WITH SIDEBAR & PRODUCTS ── */}
      {isAnyCategorySelected ? (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {!query && currentSubcategories.length > 0 && (
            <div className="w-full md:w-72 shrink-0 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-emerald-100 p-4 space-y-2.5 shadow-xl shadow-stone-200/50">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition cursor-pointer border ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-md' 
                    : 'bg-stone-50/80 border-stone-100 text-stone-700 hover:bg-emerald-50/60 font-bold'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${activeSubcategoryId === 'All' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                  {activeCategoryObj?.image_url ? <img src={activeCategoryObj.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={18} />}
                </div>
                <span className="text-xs font-black leading-tight truncate">All {activeCategoryObj?.name}</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition cursor-pointer border ${
                      isSubSelected 
                        ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-md' 
                        : 'bg-stone-50/80 border-stone-100 text-stone-700 hover:bg-emerald-50/60 font-bold'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center shadow-2xs">
                      {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover" /> : <Package size={18} className="text-stone-400" />}
                    </div>
                    <span className="text-xs font-black leading-tight truncate">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-xl px-8 py-5 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-stone-200/40">
              <h3 className="font-black text-stone-900 text-lg sm:text-xl tracking-tight">
                {query ? `Search Results for "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name || 'Products')}
              </h3>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 shadow-2xs">{sourceProducts.length} items found</span>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-20 border border-emerald-100 text-center shadow-xl">
                <Package size={52} className="text-emerald-300 mx-auto mb-4 animate-bounce" />
                <p className="text-base font-black text-stone-800">No active products found in this selection.</p>
                <p className="text-xs text-stone-400 mt-1 font-medium">Try exploring another category or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2.5 pt-8">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100 disabled:opacity-40 hover:bg-emerald-50 transition cursor-pointer shadow-sm"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-11 h-11 rounded-2xl font-black text-xs transition cursor-pointer shadow-sm ${
                            currentPage === num 
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105' 
                              : 'bg-white/90 backdrop-blur-md text-stone-600 hover:bg-emerald-50 border border-emerald-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100 disabled:opacity-40 hover:bg-emerald-50 transition cursor-pointer shadow-sm"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      ) : (
        <div className="space-y-14">
          {parentCategories.map(parent => {
            const subIds = getSubcategories(parent.id).map(s => s.id);
            const items = activeProducts.filter(p =>
              p.category_id === parent.id || p.category === parent.id ||
              subIds.includes(p.category_id) || p.categories?.parent_id === parent.id
            );

            if (items.length === 0) return null;

            return (
              <div key={parent.id} className="space-y-5">
                <div className="flex items-center justify-between bg-white/90 backdrop-blur-xl px-8 py-4 rounded-3xl border border-emerald-100/80 shadow-md">
                  <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">{parent.name}</h3>
                  <button
                    onClick={() => { setActiveCategory(parent.id); setCurrentPage(1); }}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-2xl transition shadow-2xs"
                  >
                    <span>View All</span> <ChevronRight size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
                  {items.slice(0, 6).map(product => (
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
            );
          })}
        </div>
      )}

    </main>
  );
}