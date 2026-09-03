// src/components/store/ProductGrid.jsx
import { useState, useRef } from 'react';
import { Heart, Sparkles, Clock, Package, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   SHARED PRODUCT CARD
───────────────────────────────────────────── */
function ProductCard({ product, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, addToCart, onSelectProduct, compact = false }) {
  const [addedFlash, setAddedFlash] = useState(false);

  const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
  const variants = product.variants || [];
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

  const handleVariantChange = (e) => {
    e.stopPropagation();
    const val = e.target.value;
    setSelectedVariants(prev => ({
      ...prev,
      [product.id]: val
    }));
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 900);
  };

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className={`bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:border-brand-200/60 transition-all duration-250 flex flex-col cursor-pointer relative group overflow-hidden
        ${compact ? 'min-w-[152px] sm:min-w-[172px] max-w-[172px]' : 'w-full'}`}
    >
      {/* Wishlist */}
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200 shadow-sm backdrop-blur-sm
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110' : 'bg-white/80 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {/* Deal badge */}
      {product.dealBadge && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-[8px] px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
            {product.dealBadge}
          </span>
        </div>
      )}

      {/* MRP discount % badge */}
      {hasMrp && !product.dealBadge && discountPct > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-brand-600 text-white font-black text-[8px] px-2 py-0.5 rounded-full shadow-sm">
            {discountPct}% OFF
          </span>
        </div>
      )}

      {/* Image */}
      <div className="relative w-full aspect-square bg-stone-50 overflow-hidden rounded-t-2xl">
        {pImages[0] ? (
          <img
            src={pImages[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-350"
            style={{ '--tw-scale-x': '1.06', '--tw-scale-y': '1.06' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={28} className="text-stone-300" />
          </div>
        )}

        {/* Delivery chip */}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-xs">
          <Zap size={9} className="text-brand-500 fill-brand-500" />
          <span className="font-black text-[8px] text-stone-700 uppercase tracking-wide">Fast</span>
        </div>

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-800 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Sold Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col flex-1 gap-1.5">
        <p className="font-bold text-stone-900 text-[11px] line-clamp-2 leading-snug flex-1">{product.name}</p>
        
        {/* Variant Dropdown Selector */}
        {hasVariants ? (
          <div onClick={e => e.stopPropagation()} className="my-0.5">
            <select
              value={currentVariantKey || ''}
              onChange={handleVariantChange}
              className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-[10px] font-black rounded-lg px-1.5 py-1 outline-none transition cursor-pointer"
            >
              {variants.map((v, idx) => {
                const vKey = v.id || v.label || v.unit_label || idx;
                const vLabel = v.unit_label || v.label || `Option ${idx + 1}`;
                const vPrice = v.price ? ` - ₹${v.price}` : '';
                return (
                  <option key={vKey} value={vKey}>
                    {vLabel}{vPrice}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <p className="text-[9px] text-stone-400 font-medium">
            {product.unit || '1 pc'}
          </p>
        )}

        {/* Price row */}
        <div className="flex items-end justify-between mt-auto pt-1.5 border-t border-stone-50" onClick={e => e.stopPropagation()}>
          <div className="leading-none">
            <span className="font-black text-[13px] text-stone-900">₹{price.toFixed(0)}</span>
            {hasMrp && (
              <span className="block text-[9px] text-stone-400 line-through mt-0.5">₹{mrp.toFixed(0)}</span>
            )}
          </div>

          {!isOutOfStock && (
            <motion.button
              onClick={handleAdd}
              animate={addedFlash ? { scale: [1, 0.88, 1.1, 1] } : {}}
              transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
              className={`relative h-7 px-3 rounded-xl text-[10px] font-black uppercase transition-all duration-200 cursor-pointer overflow-hidden btn-press
                ${addedFlash
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                  : 'bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-200 hover:border-transparent shadow-xs'
                }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {addedFlash ? (
                  <motion.span key="added" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="block">
                    ✓
                  </motion.span>
                ) : (
                  <motion.span key="add" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="block">
                    Add
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HORIZONTAL SHELF WITH SCROLL ARROWS
───────────────────────────────────────────── */
function HorizontalShelf({ items, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, addToCart, onSelectProduct }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    ref.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="relative group/shelf">
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-white shadow-lg rounded-full border border-stone-100 flex items-center justify-center text-stone-600 hover:text-brand-700 hover:border-brand-300 transition opacity-0 group-hover/shelf:opacity-100 cursor-pointer"
      >
        <ChevronLeft size={15} />
      </button>

      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth"
      >
        {items.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '0px -60px' }}
            transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ProductCard
              product={product}
              wishlistIds={wishlistIds}
              toggleWishlist={toggleWishlist}
              selectedVariants={selectedVariants}
              setSelectedVariants={setSelectedVariants}
              addToCart={addToCart}
              onSelectProduct={onSelectProduct}
              compact
            />
          </motion.div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-white shadow-lg rounded-full border border-stone-100 flex items-center justify-center text-stone-600 hover:text-brand-700 hover:border-brand-300 transition opacity-0 group-hover/shelf:opacity-100 cursor-pointer"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETON CARD
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden min-w-[152px] max-w-[172px]">
      <div className="skeleton w-full aspect-square" />
      <div className="p-2.5 space-y-2">
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-2.5 w-1/2 rounded" />
        <div className="skeleton h-6 w-full rounded-xl mt-2" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ProductGrid({
  banners, currentSlide, activeFlashSale, timeLeft, formatTime,
  categories, activeCategory, setActiveCategory, loading,
  products, currentProducts, filteredProducts, totalPages, currentPage, setCurrentPage,
  wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants,
  addToCart, onSelectProduct
}) {
  const fallbackCategoryImages = [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80',
  ];

  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const displayCategoryTitle = activeCategory === 'All'
    ? 'All Products & Daily Essentials'
    : (activeCategoryObj?.name ?? 'Category Products');

  const sourceProducts = activeCategory === 'All' ? (products || []) : (filteredProducts || []);

  const productsByCategory = categories
    .map(cat => ({
      ...cat,
      items: sourceProducts.filter(p =>
        p.category_id === cat.id || p.category === cat.id ||
        p.category === cat.name || p.categories?.name === cat.name
      ),
    }))
    .filter(c => c.items.length > 0);

  return (
    <main className="max-w-7xl mx-auto px-4 mt-4 space-y-10 font-sans pb-24 md:pb-8">

      {/* ── BANNER CAROUSEL ── */}
      {banners.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-lg bg-brand-950 min-h-[160px] md:min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={banners[currentSlide]?.image_url}
                alt={banners[currentSlide]?.title || 'Banner'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-950/85 via-brand-950/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10 text-white">
                <motion.span
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 bg-brand-500 text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest w-max mb-3 shadow-md"
                >
                  <Zap size={9} className="fill-white" /> Instant Delivery
                </motion.span>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                  className="text-xl md:text-3xl font-black tracking-tight leading-tight max-w-lg"
                >
                  {banners[currentSlide]?.title || 'Stock up on daily essentials'}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-xs text-brand-200 mt-2 max-w-md"
                >
                  {banners[currentSlide]?.subtitle || 'Get farm-fresh groceries delivered in minutes.'}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <div
                  key={i}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentSlide ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIES ── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-base md:text-lg text-stone-900">Shop by Category</h3>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            {categories.length} categories
          </span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-11 gap-2.5">
          {/* All Items */}
          <button
            onClick={() => setActiveCategory('All')}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border cursor-pointer transition-all duration-200 group btn-press
              ${activeCategory === 'All'
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-400/20 shadow-md shadow-brand-500/10'
                : 'border-stone-100 bg-white hover:border-brand-300 hover:bg-brand-50/50 shadow-sm'}`}
          >
            <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center overflow-hidden">
              <Sparkles size={18} className={activeCategory === 'All' ? 'text-brand-700' : 'text-brand-500'} />
            </div>
            <span className={`text-[9px] md:text-[10px] font-black leading-tight line-clamp-2 text-center
              ${activeCategory === 'All' ? 'text-brand-700' : 'text-stone-700'}`}>
              All
            </span>
          </button>

          {categories.map((cat, index) => {
            const isSelected = activeCategory === cat.id;
            const catImage = cat.image_url || fallbackCategoryImages[index % fallbackCategoryImages.length];
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border cursor-pointer transition-all duration-200 group btn-press
                  ${isSelected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-400/20 shadow-md shadow-brand-500/10'
                    : 'border-stone-100 bg-white hover:border-brand-300 hover:bg-brand-50/50 shadow-sm'}`}
              >
                <div className="w-full aspect-square rounded-xl bg-stone-50 overflow-hidden">
                  <img
                    src={catImage}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className={`text-[9px] md:text-[10px] font-black leading-tight line-clamp-2 text-center
                  ${isSelected ? 'text-brand-700' : 'text-stone-700'}`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FLASH SALE BANNER ── */}
      {activeFlashSale && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-lg shadow-rose-500/25 flex flex-wrap items-center justify-between gap-4"
        >
          {/* Decorative dots */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={20} className="text-amber-200 animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-sm">{activeFlashSale.title || 'Mega Flash Sale'}</h4>
              <p className="text-xs text-rose-100">Hurry! Special discounts active across items.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/25 px-4 py-2.5 rounded-xl border border-white/20 font-mono font-black text-sm relative">
            <Clock size={15} className="text-amber-300" />
            <span>Ends in: {formatTime(timeLeft)}</span>
          </div>
        </motion.div>
      )}

      {/* ── CATALOG ── */}
      {loading ? (
        /* Skeleton shelves */
        <div className="space-y-10">
          {[1, 2].map(s => (
            <div key={s} className="space-y-4">
              <div className="skeleton h-5 w-40 rounded-xl" />
              <div className="flex gap-3 overflow-hidden">
                {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
          ))}
        </div>
      ) : activeCategory === 'All' ? (
        /* ALL — horizontal shelves */
        <div className="space-y-12">
          {productsByCategory.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-stone-100 text-center shadow-sm">
              <Package size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-stone-500">No products found in the catalog</p>
            </div>
          ) : (
            productsByCategory.map((catSection, sIdx) => (
              <motion.div
                key={catSection.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-brand-500 to-brand-700 rounded-full" />
                    <h3 className="text-base md:text-lg font-black text-stone-900 tracking-tight">
                      {catSection.name}
                    </h3>
                    <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      {catSection.items.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveCategory(catSection.id)}
                    className="flex items-center gap-0.5 text-[10px] font-black text-brand-600 hover:text-brand-800 uppercase tracking-wider transition-colors cursor-pointer group"
                  >
                    See all <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <HorizontalShelf
                  items={catSection.items}
                  wishlistIds={wishlistIds}
                  toggleWishlist={toggleWishlist}
                  selectedVariants={selectedVariants}
                  setSelectedVariants={setSelectedVariants}
                  addToCart={addToCart}
                  onSelectProduct={onSelectProduct}
                />
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* SINGLE CATEGORY — paginated grid */
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-brand-500 to-brand-700 rounded-full" />
              <h3 className="text-base font-black text-stone-900">{displayCategoryTitle}</h3>
            </div>
            <span className="text-[10px] font-bold text-stone-400">{currentProducts.length} items</span>
          </div>

          {currentProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-stone-100 text-center shadow-sm">
              <Package size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-stone-500">No products in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {currentProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard
                    product={product}
                    wishlistIds={wishlistIds}
                    toggleWishlist={toggleWishlist}
                    selectedVariants={selectedVariants}
                    setSelectedVariants={setSelectedVariants}
                    addToCart={addToCart}
                    onSelectProduct={onSelectProduct}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold disabled:opacity-40 cursor-pointer shadow-sm hover:border-brand-300 hover:text-brand-700 transition btn-press"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 py-2 text-xs text-stone-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition btn-press cursor-pointer
                          ${currentPage === p
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                            : 'bg-white border border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-700'
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold disabled:opacity-40 cursor-pointer shadow-sm hover:border-brand-300 hover:text-brand-700 transition btn-press"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}