// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Clock, Package, Star, Sparkles, Filter, ChevronRight, ChevronLeft, Flame, Zap, LayoutGrid, SlidersHorizontal, ArrowUpDown, Plus, Minus, Home, ShoppingBag, User } from 'lucide-react';
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
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-[2rem] border border-stone-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full p-4 justify-between"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-3 right-3 z-20 p-2 rounded-full transition-all duration-150 backdrop-blur-md
          ${isWishlisted ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-rose-500'}`}
        title="Wishlist"
      >
        <Heart size={18} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      <div className="relative w-full aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center p-3 mb-3">
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackDummyImages[0]; }}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out" 
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-white text-stone-950 text-[10px] font-black px-3 py-1 rounded-full uppercase">Sold Out</span>
          </div>
        )}
      </div>

      <div className="space-y-1 mb-3">
        <h4 className="font-black text-slate-900 text-xs sm:text-sm tracking-tight line-clamp-1">{product.name}</h4>
        
        {hasVariants ? (
          <div onClick={e => e.stopPropagation()} className="pt-1">
            <select
              value={currentVariantKey || ''}
              onChange={handleVariantChange}
              className="w-full bg-[#F4F5F7] border border-stone-200 text-stone-700 text-[10px] font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
            >
              {variants.map((v, idx) => {
                const vKey = v.id || v.label || v.unit_label || idx;
                const vLabel = v.unit_label || v.label || `Opt ${idx + 1}`;
                return <option key={vKey} value={vKey}>{vLabel} • ₹{v.price}</option>;
              })}
            </select>
          </div>
        ) : (
          <p className="text-[11px] text-stone-400 font-bold">{product.unit || '500 g'}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-sm sm:text-base text-slate-900">${price.toFixed(0)}</span>
          {hasMrp && <span className="text-[10px] text-stone-400 line-through font-bold">${mrp.toFixed(0)}</span>}
        </div>

        {!isOutOfStock && (
          qtyInCart > 0 ? (
            <div className="flex items-center bg-emerald-500 text-white rounded-2xl overflow-hidden h-9 shadow-md">
              <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }} className="px-3 h-full hover:bg-emerald-600 font-bold text-sm flex items-center justify-center cursor-pointer"><Minus size={14} /></button>
              <span className="px-2 font-black text-xs">{qtyInCart}</span>
              <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }} className="px-3 h-full hover:bg-emerald-600 font-bold text-sm flex items-center justify-center cursor-pointer"><Plus size={14} /></button>
            </div>
          ) : (
            <motion.button
              onClick={handleAdd}
              whileTap={{ scale: 0.95 }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-md transition cursor-pointer"
            >
              Add
            </motion.button>
          )
        )}
      </div>
    </motion.div>
  );
}

export default function ProductGrid({
  banners, currentSlide, activeFlashSale, timeLeft, formatTime,
  categories, activeCategory, setActiveCategory, loading,
  products, searchQuery = '', wishlistIds, toggleWishlist, selectedVariants, setSelectedVariants,
  cart = [], addToCart, updateQuantity, onSelectProduct, onNavigate, onOpenCart
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 font-sans pb-36 text-slate-900">
      
      {/* ── STOREFRONT VIEW: WHEN A CATEGORY IS SELECTED ── */}
      {isAnyCategorySelected ? (
        <div className="space-y-4">

          <div className="grid grid-cols-[85px_1fr] sm:grid-cols-[110px_1fr] gap-4 items-start pt-2">
            
            <div className="flex flex-col space-y-3 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
              {parentCategories.map((sub, index) => {
                const isSubSelected = activeCategory === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <button
                    key={sub.id || index}
                    onClick={() => { setActiveCategory(sub.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                    className={`flex flex-col items-center p-2.5 rounded-2xl text-center transition cursor-pointer relative border ${
                      isSubSelected 
                        ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-black shadow-xs' 
                        : 'bg-white border-transparent text-stone-600 hover:bg-stone-50 font-bold'
                    }`}
                  >
                    {isSubSelected && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-emerald-500 rounded-l-full" />
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden mb-1.5 border border-stone-200/60 flex items-center justify-center shadow-2xs shrink-0 p-1">
                      <img src={subImg} alt={sub.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] leading-tight line-clamp-2 w-full">{sub.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 w-full space-y-4 min-w-0">
              {sourceProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center shadow-sm">
                  <Package size={48} className="text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-stone-700">No active products found in this selection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
              )}
            </div>

          </div>
        </div>
      ) : (
        /* HOMEPAGE SECTIONS */
        <div className="space-y-10">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">Shop By Category</h3>
              <button 
                onClick={() => { setActiveCategory(parentCategories[0]?.id || 'All'); }} 
                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 cursor-pointer transition"
              >
                See All
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 sm:gap-4">
              {parentCategories.slice(0, 8).map((cat, index) => {
                const img = cat.image_url || fallbackImages[index % fallbackImages.length];
                return (
                  <motion.button
                    whileHover={{ y: -2 }}
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }}
                    className="flex flex-col items-center p-3 rounded-2xl border cursor-pointer transition-all shadow-xs border-stone-100 bg-[#F4F5F7] hover:border-emerald-300 text-slate-800"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden mb-2 border border-stone-200/50 shrink-0 shadow-xs flex items-center justify-center p-1">
                      <img src={img} alt={cat.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold truncate w-full text-center">{cat.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-[2.5rem] overflow-hidden shadow-sm w-full bg-[#EAF8EE] border border-emerald-100 flex items-center justify-between p-6 sm:p-10">
            <div className="space-y-3 max-w-xs sm:max-w-md relative z-10">
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">World Food Festival, Bring the world to your Kitchen!</h2>
              <button 
                onClick={() => { setActiveCategory(parentCategories[0]?.id || 'All'); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md transition cursor-pointer"
              >
                Shop Now
              </button>
            </div>
            <div className="absolute right-4 bottom-0 top-0 flex items-center opacity-90 sm:opacity-100 pointer-events-none">
              <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80" alt="Festival" className="h-full object-contain max-h-48 rounded-3xl" />
            </div>
          </div>

          {/* Best Deal Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">Best Deal</h3>
              <button 
                onClick={() => { setActiveCategory(parentCategories[0]?.id || 'All'); }} 
                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 cursor-pointer transition"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {activeProducts.slice(0, 4).map((product) => (
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

          {/* Best Selling Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">Best Selling</h3>
              <button 
                onClick={() => { setActiveCategory(parentCategories[1]?.id || parentCategories[0]?.id || 'All'); }} 
                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 cursor-pointer transition"
              >
                See All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {activeProducts.slice(4, 8).map((product) => (
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

        </div>
      )}

      {/* Fixed Bottom Navigation Bar matching reference screenshot */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200/80 py-2.5 px-6 z-50 shadow-lg max-w-lg mx-auto sm:max-w-none sm:rounded-t-3xl">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={() => { setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-1 text-emerald-500 cursor-pointer"
          >
            <div className="relative p-1">
              <Home size={22} className="stroke-[2.5]" />
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-emerald-500 rounded-full" />
            </div>
            <span className="text-[10px] font-black">Shop</span>
          </button>

          <button 
            onClick={() => { if(onNavigate) onNavigate('wishlist'); else setActiveCategory(parentCategories[0]?.id || 'All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-700 cursor-pointer transition"
          >
            <Heart size={22} className="stroke-[2]" />
            <span className="text-[10px] font-bold">Favourite</span>
          </button>

          <button 
            onClick={() => { if(onOpenCart) onOpenCart(); }}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-700 cursor-pointer transition"
          >
            <ShoppingBag size={22} className="stroke-[2]" />
            <span className="text-[10px] font-bold">Cart</span>
          </button>

          <button 
            onClick={() => { if(onNavigate) onNavigate('profile'); }}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-700 cursor-pointer transition"
          >
            <User size={22} className="stroke-[2]" />
            <span className="text-[10px] font-bold">Account</span>
          </button>
        </div>
      </div>

    </main>
  );
}