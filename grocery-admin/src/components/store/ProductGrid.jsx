// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft, Flame, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductCard({ product, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, cart = [], addToCart, updateQuantity, onSelectProduct }) {
  const [addedFlash, setAddedFlash] = useState(false);

  const fallbackDummyImages = [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=90'
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
      className="bg-white rounded-[2rem] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2.5 right-2.5 z-25 p-2 rounded-xl transition-all duration-200 shadow-xs backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110 shadow-rose-100' : 'bg-white/85 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
        title="Wishlist"
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-2.5 left-2.5 z-25">
          <span className="bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-[8px] px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-wider flex items-center gap-0.5">
            <Flame size={8} className="fill-white" /> {discountPct}% OFF
          </span>
        </div>
      )}

      {/* Crystal Clear HD Product Image Container */}
      <div className="relative w-full aspect-[4/3] bg-stone-50 overflow-hidden flex items-center justify-center p-3">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackDummyImages[0];
          }}
          className="w-full h-full object-contain filter contrast-105 group-hover:scale-110 transition-transform duration-500 ease-out" 
        />

        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-slate-800 shadow-2xs">
          <Clock size={9} className="text-emerald-600 animate-pulse" />
          <span>10 mins</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-white text-stone-950 text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1">
          {avgRating && avgRating !== 'No ratings' && Number(avgRating) > 0 && (
            <div className="flex items-center gap-1 text-[8px] font-black text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-md w-max">
              <Star size={9} className="fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
            </div>
          )}

          <p className="font-extrabold text-slate-800 text-[11px] line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">{product.name}</p>

          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-0.5">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-stone-50 hover:bg-stone-100 text-slate-900 text-[10px] font-extrabold rounded-xl px-2 py-1 outline-none transition cursor-pointer"
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
            <p className="text-[9px] text-stone-500 font-bold bg-stone-100 px-1.5 py-0.5 rounded-md w-max">{product.unit || '1 unit'}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto" onClick={e => e.stopPropagation()}>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xs text-slate-900 leading-tight">₹{price.toFixed(0)}</span>
              {hasMrp && (
                <span className="text-[9px] text-stone-400 line-through font-semibold">₹{mrp.toFixed(0)}</span>
              )}
            </div>
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-xl overflow-hidden shadow-xs h-7">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }}
                  className="px-2.5 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer transition"
                >
                  -
                </button>
                <span className="px-2 font-black text-[10px]">{qtyInCart}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }}
                  className="px-2.5 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer transition"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.08, 1] } : {}}
                transition={{ duration: 0.2 }}
                className={`h-7 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs btn-press
                  ${addedFlash ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white'}`}
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
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=90',
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 font-sans pb-32 md:pb-16 text-slate-900">
      
      {/* ── STYLISH HERO BANNERS CAROUSEL ── */}
      {!isAnyCategorySelected && banners?.length > 0 && (
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 mb-10 min-h-[200px] sm:min-h-[260px]">
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
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/50 to-transparent flex flex-col justify-center p-6 sm:p-12 text-white space-y-2.5">
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[9px] px-3.5 py-1 rounded-full uppercase tracking-widest w-max shadow-md">
                  ⚡ 10 Minutes Lightning Delivery
                </span>
                <h2 className="text-xl sm:text-3xl font-black max-w-lg tracking-tight leading-tight">{banners[currentSlide]?.title || 'Fresh groceries at your doorstep'}</h2>
                <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium max-w-md">{banners[currentSlide]?.subtitle || 'Farm-fresh vegetables, dairy, and daily essentials delivered instantly.'}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── STYLISH HOMEPAGE CATEGORY CARDS ── */}
      {!isAnyCategorySelected && (
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg sm:text-xl text-stone-900 tracking-tight">Explore Categories</h3>
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full shadow-2xs">All Hubs Active</span>
          </div>
          
          <div className="flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-3.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <motion.button
              whileHover={{ y: -3 }}
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); setCurrentPage(1); }}
              className={`flex flex-col items-center p-3.5 rounded-3xl cursor-pointer transition-all shrink-0 w-24 sm:w-auto group btn-press
                ${activeCategory === 'All' ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg scale-105' : 'bg-white hover:bg-stone-50 shadow-2xs'}`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center overflow-hidden mb-2.5 shadow-sm ${activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                <Sparkles size={22} />
              </div>
              <span className={`text-[11px] font-black leading-tight text-center truncate w-full ${activeCategory === 'All' ? 'text-white' : 'text-stone-900'}`}>All Items</span>
            </motion.button>

            {parentCategories.map((cat, index) => {
              const isSelected = activeCategory === cat.id;
              const img = cat.image_url || fallbackImages[index % fallbackImages.length];
              return (
                <motion.button
                  whileHover={{ y: -3 }}
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                  className={`flex flex-col items-center p-3.5 rounded-3xl cursor-pointer transition-all shrink-0 w-24 sm:w-auto group btn-press
                    ${isSelected ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg scale-105' : 'bg-white hover:bg-stone-50 shadow-2xs'}`}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 overflow-hidden mb-2.5 shadow-2xs group-hover:scale-105 transition-transform">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover filter contrast-105" />
                  </div>
                  <span className={`text-[11px] font-black leading-tight text-center truncate w-full ${isSelected ? 'text-white' : 'text-stone-900'}`}>{cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STOREFRONT LAYOUT ── */}
      {isAnyCategorySelected ? (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Sidebar for Subcategories if any exist */}
          {!query && currentSubcategories.length > 0 && (
            <div className="w-full md:w-64 shrink-0 bg-white rounded-3xl p-3.5 space-y-2 shadow-lg shadow-stone-200/30">
              <div className="px-3 pt-1 pb-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Subcategories</p>
              </div>

              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-600 text-white font-black shadow-md' 
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${activeSubcategoryId === 'All' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {activeCategoryObj?.image_url ? <img src={activeCategoryObj.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={16} />}
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
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                      isSubSelected 
                        ? 'bg-emerald-600 text-white font-black shadow-md' 
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover filter contrast-105" /> : <Package size={16} className="text-stone-400" />}
                    </div>
                    <span className="text-xs font-black leading-tight truncate">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Products Area */}
          <div className="flex-1 w-full space-y-5">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl shadow-lg shadow-stone-200/25">
              <h3 className="font-black text-stone-900 text-base sm:text-lg tracking-tight">
                {query ? `Search Results for "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name || 'Products')}
              </h3>
              <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full shadow-2xs">{sourceProducts.length} items found</span>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center shadow-lg">
                <Package size={44} className="text-emerald-300 mx-auto mb-3 animate-bounce" />
                <p className="text-sm font-black text-stone-800">No active products found in this selection.</p>
                <p className="text-xs text-stone-400 mt-1 font-medium">Try exploring another category or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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
                  <div className="flex justify-center items-center gap-2 pt-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="p-3 bg-white rounded-2xl disabled:opacity-40 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-10 h-10 rounded-2xl font-black text-xs transition cursor-pointer shadow-2xs ${
                            currentPage === num 
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105' 
                              : 'bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-3 bg-white rounded-2xl disabled:opacity-40 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      ) : (
        /* HOMEPAGE POPULATION: CLEAN BLINKIT-STYLE CARDS WITH HD IMAGES & NO BORDERS */
        <div className="space-y-6">
          {parentCategories.map(parent => {
            const subcats = getSubcategories(parent.id);
            if (subcats.length === 0) return null;

            return (
              <div key={parent.id} className="bg-white rounded-3xl shadow-md p-4 sm:p-5 space-y-4">
                {/* Parent Category Header matching Blinkit style */}
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">{parent.name}</h3>
                  <button
                    onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId('Atta, Dal & Oil'); setCurrentPage(1); }}
                    className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 cursor-pointer uppercase tracking-wider flex items-center gap-0.5"
                  >
                    <span>see all</span> <ChevronRight size={13} />
                  </button>
                </div>

                {/* Subcategories Grid mirroring reference image layout */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {subcats.map((sub, index) => {
                    const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                    return (
                      <motion.button
                        whileHover={{ y: -2 }}
                        key={sub.id}
                        onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                        className="bg-emerald-50/30 hover:bg-emerald-50/70 p-3 rounded-2xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer group shadow-2xs"
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white overflow-hidden mb-2 shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center p-1.5">
                          {sub.image_url ? (
                            <img src={subImg} alt={sub.name} className="w-full h-full object-contain filter contrast-105" />
                          ) : (
                            <Package size={24} className="text-emerald-600" />
                          )}
                        </div>
                        <span className="font-extrabold text-[11px] sm:text-xs text-stone-800 line-clamp-2 group-hover:text-emerald-700 transition-colors leading-tight">
                          {sub.name}
                        </span>
                      </motion.button>
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