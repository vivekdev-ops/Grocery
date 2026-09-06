// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductCard({ product, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, cart = [], addToCart, updateQuantity, onSelectProduct }) {
  const [addedFlash, setAddedFlash] = useState(false);

  // Fallback dummy images (cats, dogs, and cute store items) for blank images
  const fallbackDummyImages = [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80', // Dog
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80', // Cat
    'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300&auto=format&fit=crop&q=80', // Puppy
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300&auto=format&fit=crop&q=80', // Cute cat
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80'  // Grocery fallback
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
    <div
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-3xl border border-emerald-100/80 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full backdrop-blur-sm"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-3 right-3 z-10 p-2 rounded-2xl transition-all duration-200 shadow-sm backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110 shadow-rose-100' : 'bg-white/90 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
        title="Wishlist"
      >
        <Heart size={14} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] px-2.5 py-1 rounded-xl shadow-md uppercase tracking-wider">
            {discountPct}% OFF
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-stone-50 to-emerald-50/20 overflow-hidden flex items-center justify-center p-4">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackDummyImages[0];
          }}
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-sm" 
        />

        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[9px] font-black text-stone-700 shadow-2xs border border-stone-100">
          <Clock size={11} className="text-emerald-600" />
          <span>13 mins</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-stone-900 text-white text-[10px] font-black px-4 py-1.5 rounded-2xl uppercase tracking-widest shadow-lg">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          {avgRating && avgRating !== 'No ratings' && Number(avgRating) > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-xl w-max border border-amber-200 shadow-2xs">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
            </div>
          )}

          <p className="font-black text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug">{product.name}</p>

          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-1">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 text-emerald-950 text-[10px] font-black rounded-xl px-2.5 py-1.5 outline-none transition cursor-pointer shadow-2xs"
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
            <p className="text-[10px] text-stone-500 font-bold bg-stone-100 px-2 py-0.5 rounded-lg w-max">{product.unit || '1 unit'}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-emerald-50 mt-auto" onClick={e => e.stopPropagation()}>
          <div>
            <span className="font-black text-base text-stone-900 block leading-tight">₹{price.toFixed(0)}</span>
            {hasMrp && (
              <span className="text-[10px] text-stone-400 line-through font-bold leading-none">₹{mrp.toFixed(0)}</span>
            )}
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-2xl overflow-hidden shadow-md h-9">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }}
                  className="px-3 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer transition"
                  title="Decrease"
                >
                  -
                </button>
                <span className="px-2.5 font-black text-xs">{qtyInCart}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }}
                  className="px-3 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer transition"
                  title="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.08, 1] } : {}}
                transition={{ duration: 0.25 }}
                className={`h-9 px-4 rounded-2xl text-xs font-black uppercase transition-all duration-200 cursor-pointer shadow-sm btn-press
                  ${addedFlash ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-emerald-50 hover:bg-emerald-700 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent'}`}
              >
                {addedFlash ? '✓ Added' : '+ Add'}
              </motion.button>
            )
          )}
        </div>
      </div>
    </div>
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
    <main className="max-w-7xl mx-auto px-4 mt-6 font-sans pb-28 md:pb-12">
      
      {/* ── TOP BANNERS ── */}
      {!isAnyCategorySelected && banners?.length > 0 && (
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl bg-stone-900 mb-10 min-h-[180px] sm:min-h-[220px] border border-emerald-500/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <img src={banners[currentSlide]?.image_url} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/40 to-transparent flex flex-col justify-center p-6 sm:p-10 text-white">
                <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-widest w-max mb-3 shadow-md">
                  ⚡ Instant Delivery
                </span>
                <h2 className="text-xl sm:text-3xl font-black max-w-md tracking-tight leading-snug">{banners[currentSlide]?.title || 'Fresh groceries at your doorstep'}</h2>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── HOMEPAGE CATEGORY CARDS ── */}
      {!isAnyCategorySelected && (
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg sm:text-xl text-stone-900 tracking-tight">Shop by Category</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Explore All</span>
          </div>
          
          <div className="flex sm:grid sm:grid-cols-6 md:grid-cols-8 gap-3.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); setCurrentPage(1); }}
              className={`flex flex-col items-center p-3.5 rounded-3xl border cursor-pointer transition-all shrink-0 w-24 sm:w-auto group btn-press
                ${activeCategory === 'All' ? 'border-emerald-600 bg-gradient-to-b from-emerald-50 to-teal-50 ring-4 ring-emerald-600/20 shadow-md scale-105' : 'border-emerald-100 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 shadow-xs'}`}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden mb-2.5 shadow-md text-white">
                <Sparkles size={24} />
              </div>
              <span className="text-xs font-black leading-tight text-stone-900 text-center truncate w-full">All</span>
            </button>

            {parentCategories.map((cat, index) => {
              const isSelected = activeCategory === cat.id;
              const img = cat.image_url || fallbackImages[index % fallbackImages.length];
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                  className={`flex flex-col items-center p-3.5 rounded-3xl border cursor-pointer transition-all shrink-0 w-24 sm:w-auto group btn-press
                    ${isSelected ? 'border-emerald-600 bg-gradient-to-b from-emerald-50 to-teal-50 ring-4 ring-emerald-600/20 shadow-md scale-105' : 'border-emerald-100 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 shadow-xs'}`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 overflow-hidden mb-2.5 border border-emerald-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-black leading-tight text-stone-900 text-center truncate w-full">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STOREFRONT LAYOUT ── */}
      {isAnyCategorySelected ? (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {!query && currentSubcategories.length > 0 && (
            <div className="w-full md:w-64 shrink-0 bg-white rounded-[2rem] border border-emerald-100 p-3.5 space-y-2 shadow-sm">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer border ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-md' 
                    : 'bg-stone-50/60 border-stone-100 text-stone-700 hover:bg-emerald-50/40 font-bold'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${activeSubcategoryId === 'All' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                  {activeCategoryObj?.image_url ? <img src={activeCategoryObj.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={16} />}
                </div>
                <span className="text-xs leading-tight truncate">All {activeCategoryObj?.name}</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer border ${
                      isSubSelected 
                        ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-md' 
                        : 'bg-stone-50/60 border-stone-100 text-stone-700 hover:bg-emerald-50/40 font-bold'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center">
                      {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-stone-400" />}
                    </div>
                    <span className="text-xs leading-tight truncate">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[2rem] border border-emerald-100 shadow-sm">
              <h3 className="font-black text-stone-900 text-base sm:text-lg">
                {query ? `Search Results for "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name || 'Products')}
              </h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">{sourceProducts.length} items</span>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-16 border border-emerald-100 text-center shadow-sm">
                <Package size={44} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-sm font-black text-stone-700">No active products found in this selection.</p>
                <p className="text-xs text-stone-400 mt-1">Try exploring another category or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
                      className="p-3 bg-white rounded-2xl border border-emerald-100 disabled:opacity-40 hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-10 h-10 rounded-2xl font-black text-xs transition cursor-pointer ${
                            currentPage === num 
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' 
                              : 'bg-white text-stone-600 hover:bg-emerald-50 border border-emerald-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-3 bg-white rounded-2xl border border-emerald-100 disabled:opacity-40 hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
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
        <div className="space-y-12">
          {parentCategories.map(parent => {
            const subIds = getSubcategories(parent.id).map(s => s.id);
            const items = activeProducts.filter(p =>
              p.category_id === parent.id || p.category === parent.id ||
              subIds.includes(p.category_id) || p.categories?.parent_id === parent.id
            );

            if (items.length === 0) return null;

            return (
              <div key={parent.id} className="space-y-4">
                <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-emerald-100/60 shadow-2xs">
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">{parent.name}</h3>
                  <button
                    onClick={() => { setActiveCategory(parent.id); setCurrentPage(1); }}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 cursor-pointer uppercase tracking-wider flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <span>See All</span> <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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