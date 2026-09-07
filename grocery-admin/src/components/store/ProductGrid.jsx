// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft, Flame, Zap, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full p-4 justify-between"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-3 right-3 z-25 p-2 rounded-2xl transition-all duration-200 shadow-2xs backdrop-blur-md
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110 shadow-rose-100' : 'bg-white/90 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
        title="Wishlist"
      >
        <Heart size={14} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {/* Top Image Container */}
      <div className="relative w-full aspect-[4/3] bg-stone-50/80 rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3 border border-stone-100">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackDummyImages[0];
          }}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
        />

        {/* Time Delivery Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[9px] font-black text-stone-700 shadow-2xs border border-stone-100">
          <Clock size={10} className="text-emerald-600" />
          <span>9 mins</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-stone-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Sold Out</span>
          </div>
        )}
      </div>

      {/* Product Details Section */}
      <div className="space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {hasVariants ? (
            <div onClick={e => e.stopPropagation()}>
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200 text-emerald-950 text-[10px] font-black rounded-xl px-2.5 py-1.5 outline-none transition cursor-pointer shadow-2xs"
              >
                {variants.map((v, idx) => {
                  const vKey = v.id || v.label || v.unit_label || idx;
                  const vLabel = v.unit_label || v.label || `Option ${idx + 1}`;
                  return (
                    <option key={vKey} value={vKey}>{vLabel}</option>
                  );
                })}
              </select>
            </div>
          ) : (
            <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md inline-block">
              {product.unit || '1 unit'}
            </span>
          )}

          <p className="font-bold text-xs text-stone-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {product.name}
          </p>
        </div>

        {/* Price & Add Button Bar */}
        <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 mt-auto" onClick={e => e.stopPropagation()}>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-sm text-stone-900">₹{price.toFixed(0)}</span>
              {hasMrp && (
                <span className="text-[10px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>
              )}
            </div>
            {hasMrp && discountPct > 0 && (
              <span className="text-[9px] font-black text-emerald-700 block leading-none mt-0.5">
                {discountPct}% OFF
              </span>
            )}
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-xl overflow-hidden shadow-sm h-8">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }}
                  className="px-2.5 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer transition"
                >
                  -
                </button>
                <span className="px-2 font-black text-xs">{qtyInCart}</span>
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
                transition={{ duration: 0.25 }}
                className={`h-8 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs btn-press border
                  ${addedFlash ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-600'}`}
              >
                {addedFlash ? '✓ Added' : 'ADD'}
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
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 font-sans pb-32 md:pb-16 text-slate-900">
      
      {/* ── STOREFRONT LAYOUT WHEN CATEGORY SELECTED (BLINKIT STYLE TWO-COLUMN SUB-SIDEBAR) ── */}
      {isAnyCategorySelected ? (
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
          
          {/* Left Vertical Subcategory Pill Bar (Blinkit Style) */}
          {!query && currentSubcategories.length > 0 && (
            <div className="w-full md:w-48 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none sticky top-20 z-10 bg-transparent">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`flex flex-col items-center p-3 rounded-2xl text-center transition cursor-pointer border shrink-0 w-24 md:w-full ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-2 ring-emerald-500/20' 
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 font-bold'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 mx-auto">
                  <Sparkles size={18} />
                </div>
                <span className="text-[11px] leading-tight truncate w-full">All Items</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                    className={`flex flex-col items-center p-3 rounded-2xl text-center transition cursor-pointer border shrink-0 w-24 md:w-full ${
                      isSubSelected 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-2 ring-emerald-500/20' 
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 font-bold'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden mb-1.5 border border-stone-200 flex items-center justify-center mx-auto shadow-2xs">
                      {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover" /> : <Package size={16} className="text-stone-400" />}
                    </div>
                    <span className="text-[11px] leading-tight truncate w-full">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Products Area with Blinkit Filter Toolbar */}
          <div className="flex-1 w-full space-y-4">
            
            {/* Category Title & Blinkit Sort/Filter Bar */}
            <div className="bg-white px-5 py-3.5 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <h2 className="font-black text-stone-900 text-base sm:text-lg tracking-tight">
                {query ? `Search Results for "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name || 'Products')}
              </h2>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 shrink-0 cursor-pointer">
                  <SlidersHorizontal size={13} /> Filters
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 shrink-0 cursor-pointer">
                  <ArrowUpDown size={13} /> Sort By
                </button>
                <span className="text-[11px] font-bold text-stone-400 pl-1 shrink-0">{sourceProducts.length} items</span>
              </div>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center shadow-2xs">
                <Package size={44} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm font-black text-stone-700">No active products found in this selection.</p>
                <p className="text-xs text-stone-400 mt-1 font-medium">Try exploring another category or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                      className="p-2.5 bg-white rounded-xl border border-stone-200 disabled:opacity-40 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-9 h-9 rounded-xl font-black text-xs transition cursor-pointer shadow-2xs ${
                            currentPage === num 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="p-2.5 bg-white rounded-xl border border-stone-200 disabled:opacity-40 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
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
        /* HOMEPAGE POPULATION: EXACT BLINKIT STYLE GRID CATEGORY SECTIONS WITH LIGHT TEAL BACKGROUND TILES */
        <div className="space-y-8">
          {parentCategories.map(parent => {
            const subcats = getSubcategories(parent.id);
            if (subcats.length === 0) return null;

            return (
              <div key={parent.id} className="space-y-3">
                {/* Section Title */}
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight px-1">
                  {parent.name}
                </h3>

                {/* Blinkit Style 4x2 Grid of Subcategories with Soft Light Teal/Cyan Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {subcats.map((sub, index) => {
                    const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                    return (
                      <motion.div
                        whileHover={{ y: -2 }}
                        key={sub.id}
                        onClick={() => { setActiveCategory(parent.id); setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                        className="bg-[#F0F8F6] hover:bg-[#E2F4EE] p-3.5 rounded-2xl border border-emerald-100/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-2xs min-h-[110px]"
                      >
                        <span className="font-bold text-xs text-stone-900 group-hover:text-emerald-900 transition-colors leading-tight">
                          {sub.name}
                        </span>

                        <div className="flex justify-end items-end mt-2">
                          <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-emerald-100 shadow-2xs group-hover:scale-105 transition-transform flex items-center justify-center p-1">
                            {sub.image_url ? (
                              <img src={subImg} alt={sub.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package size={20} className="text-emerald-600" />
                            )}
                          </div>
                        </div>
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