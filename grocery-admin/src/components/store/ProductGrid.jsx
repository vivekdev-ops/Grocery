// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductCard({ product, wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants, cart = [], addToCart, updateQuantity, onSelectProduct }) {
  const [addedFlash, setAddedFlash] = useState(false);

  const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
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

  // Unique cart item key based on specific variant
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
      className="bg-white rounded-2xl border border-stone-100 shadow-xs hover:shadow-md hover:border-brand-200/60 transition-all duration-200 flex flex-col cursor-pointer relative group overflow-hidden w-full"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all duration-200 shadow-sm backdrop-blur-sm
          ${isWishlisted ? 'bg-rose-50 text-rose-500 scale-110' : 'bg-white/80 text-stone-400 hover:text-rose-500 hover:bg-rose-50'}`}
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      {discountPct > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wide">
            {discountPct}% OFF
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-stone-50/80 overflow-hidden flex items-center justify-center p-3">
        {pImages[0] ? (
          <img src={pImages[0]} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package size={32} className="text-stone-300" />
        )}

        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-stone-100/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-black text-stone-700 shadow-2xs">
          <Clock size={10} className="text-stone-500" />
          <span>13 mins</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-800 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Sold Out</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1">
          {avgRating && avgRating !== 'No ratings' && Number(avgRating) > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded w-max border border-amber-200">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              <span>{avgRating}</span>
            </div>
          )}

          <p className="font-bold text-stone-900 text-xs line-clamp-2 leading-snug">{product.name}</p>

          {hasVariants ? (
            <div onClick={e => e.stopPropagation()} className="pt-0.5">
              <select
                value={currentVariantKey || ''}
                onChange={handleVariantChange}
                className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none transition cursor-pointer"
              >
                {variants.map((v, idx) => {
                  const vKey = v.id || v.label || v.unit_label || idx;
                  const vLabel = v.unit_label || v.label || `Option ${idx + 1}`;
                  return (
                    <option key={vKey} value={vKey}>{vLabel} - ₹{v.price}</option>
                  );
                })}
              </select>
            </div>
          ) : (
            <p className="text-[10px] text-stone-400 font-medium">{product.unit || '1 unit'}</p>
          )}
        </div>

        {/* Price & Cart/Quantity Counter Row */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-auto" onClick={e => e.stopPropagation()}>
          <div>
            <span className="font-black text-sm text-stone-900 block leading-tight">₹{price.toFixed(0)}</span>
            {hasMrp && (
              <span className="text-[10px] text-stone-400 line-through leading-none">₹{mrp.toFixed(0)}</span>
            )}
          </div>

          {!isOutOfStock && (
            qtyInCart > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-xl overflow-hidden shadow-xs h-8">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }}
                  className="px-2.5 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="px-2 font-black text-xs">{qtyInCart}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }}
                  className="px-2.5 h-full hover:bg-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAdd}
                animate={addedFlash ? { scale: [1, 0.9, 1.08, 1] } : {}}
                transition={{ duration: 0.25 }}
                className={`h-8 px-4 rounded-xl text-xs font-black uppercase transition-all duration-200 cursor-pointer shadow-xs btn-press
                  ${addedFlash ? 'bg-emerald-600 text-white' : 'bg-emerald-50 hover:bg-emerald-700 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent'}`}
              >
                {addedFlash ? '✓ Added' : 'Add'}
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

  const isAnyCategorySelected = activeCategory !== 'All' || query.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 mt-4 font-sans pb-24 md:pb-8">
      
      {/* ── TOP BANNERS ── */}
      {!isAnyCategorySelected && banners?.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-md bg-stone-900 mb-8 min-h-[160px]">
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
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-transparent flex flex-col justify-center p-8 text-white">
                <span className="bg-emerald-600 text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest w-max mb-2">
                  Instant Delivery
                </span>
                <h2 className="text-xl md:text-2xl font-black max-w-sm">{banners[currentSlide]?.title || 'Fresh groceries at your doorstep'}</h2>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── HOMEPAGE CATEGORY CARDS ── */}
      {!isAnyCategorySelected && (
        <div className="space-y-4 mb-8">
          <h3 className="font-black text-lg text-stone-900">Shop by Category</h3>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            <button
              onClick={() => { setActiveCategory('All'); setActiveSubcategoryId('All'); }}
              className={`flex flex-col items-center p-3 rounded-2xl border cursor-pointer transition-all shrink-0 group btn-press
                ${activeCategory === 'All' ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30 shadow-md' : 'border-stone-200 bg-white hover:border-emerald-400 hover:bg-stone-50 shadow-xs'}`}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center overflow-hidden mb-2 shadow-inner text-emerald-700 font-bold">
                <Sparkles size={20} />
              </div>
              <span className="text-[11px] font-black leading-tight text-stone-900 text-center truncate w-full">All</span>
            </button>

            {parentCategories.map((cat, index) => {
              const isSelected = activeCategory === cat.id;
              const img = cat.image_url || fallbackImages[index % fallbackImages.length];
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); }}
                  className={`flex flex-col items-center p-3 rounded-2xl border cursor-pointer transition-all shrink-0 group btn-press
                    ${isSelected ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30 shadow-md' : 'border-stone-200 bg-white hover:border-emerald-400 hover:bg-stone-50 shadow-xs'}`}
                >
                  <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden mb-2 border border-stone-200/60 shadow-2xs">
                    <img src={img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <span className="text-[11px] font-black leading-tight text-stone-900 text-center truncate w-full">{cat.name}</span>
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
            <div className="w-full md:w-56 shrink-0 bg-white rounded-3xl border border-stone-200/80 p-3 space-y-2 shadow-2xs">
              <button
                onClick={() => setActiveSubcategoryId('All')}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer border ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-sm' 
                    : 'bg-transparent border-transparent text-stone-700 hover:bg-stone-50 font-bold'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${activeSubcategoryId === 'All' ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                  {activeCategoryObj?.image_url ? <img src={activeCategoryObj.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={14} />}
                </div>
                <span className="text-xs leading-tight">All {activeCategoryObj?.name}</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubcategoryId(sub.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer border ${
                      isSubSelected 
                        ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-sm' 
                        : 'bg-transparent border-transparent text-stone-700 hover:bg-stone-50 font-bold'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center">
                      {sub.image_url ? <img src={subImg} alt="" className="w-full h-full object-cover" /> : <Package size={14} className="text-stone-400" />}
                    </div>
                    <span className="text-xs leading-tight">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-stone-200/80 shadow-2xs">
              <h3 className="font-black text-stone-900 text-base">
                {query ? `Search Results for "${searchQuery}"` : (activeSubcategoryObj?.name || activeCategoryObj?.name || 'Products')}
              </h3>
              <span className="text-xs font-bold text-stone-400">{sourceProducts.length} items</span>
            </div>

            {sourceProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center shadow-2xs">
                <Package size={36} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-stone-500">No active products found in this selection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sourceProducts.map((product) => (
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
            )}
          </div>

        </div>
      ) : (
        <div className="space-y-10">
          {parentCategories.map(parent => {
            const subIds = getSubcategories(parent.id).map(s => s.id);
            const items = activeProducts.filter(p =>
              p.category_id === parent.id || p.category === parent.id ||
              subIds.includes(p.category_id) || p.categories?.parent_id === parent.id
            );

            if (items.length === 0) return null;

            return (
              <div key={parent.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-stone-900">{parent.name}</h3>
                  <button
                    onClick={() => setActiveCategory(parent.id)}
                    className="text-xs font-black text-emerald-700 hover:underline cursor-pointer uppercase tracking-wider"
                  >
                    see all
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