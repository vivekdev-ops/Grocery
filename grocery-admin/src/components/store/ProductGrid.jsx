// src/components/store/ProductGrid.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Heart, Package, Star, ChevronRight, Flame, Zap, Plus, Minus, Home, ShoppingBag, User, SlidersHorizontal, ArrowUpDown, Tag, Percent } from 'lucide-react';
import { motion } from 'framer-motion';

function ProductCard({ product, wishlistIds = [], toggleWishlist, selectedVariants, setSelectedVariants, cart = [], addToCart, updateQuantity, onSelectProduct, boughtProductIds }) {
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
  
  const safeWishlistIds = Array.isArray(wishlistIds) ? wishlistIds : [];
  const isWishlisted = safeWishlistIds.includes(product.id);

  const isBoughtBefore = boughtProductIds?.has(product.id) || boughtProductIds?.has(product.name?.toLowerCase());

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
      className="bg-white rounded-[1.75rem] border border-orange-100 shadow-lg shadow-orange-950/5 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full p-2.5 sm:p-3.5 justify-between"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 p-1.5 sm:p-2 rounded-full transition-all duration-150 backdrop-blur-md bg-white/90 shadow-xs
          ${isWishlisted ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-rose-500'}`}
        title="Wishlist"
      >
        <Heart size={13} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      <div className="relative w-full aspect-square bg-transparent rounded-xl overflow-hidden flex items-center justify-center mb-2">
        {isBoughtBefore && (
          <div className="absolute top-1.5 left-1.5 z-20 bg-orange-50 text-orange-800 border border-orange-200/80 shadow-xs px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-md">
            Bought Earlier
          </div>
        )}
        <img 
          src={displayImage} 
          alt={product.name} 
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackDummyImages[0]; }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out border-0 bg-transparent" 
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-white text-stone-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">Sold Out</span>
          </div>
        )}
      </div>

      <div className="space-y-0.5 mb-2">
        <h4 className="font-black text-slate-900 text-[11px] sm:text-xs tracking-tight line-clamp-1">{product.name}</h4>
        
        {hasVariants ? (
          <div onClick={e => e.stopPropagation()} className="pt-0.5">
            <select
              value={currentVariantKey || ''}
              onChange={handleVariantChange}
              className="w-full bg-stone-50 border border-orange-200 text-stone-700 text-[9px] font-bold rounded-lg px-1.5 py-1 outline-none cursor-pointer focus:border-orange-600 truncate"
            >
              {variants.map((v, idx) => {
                const vKey = v.id || v.label || v.unit_label || idx;
                const vLabel = v.unit_label || v.label || `Opt ${idx + 1}`;
                return <option key={vKey} value={vKey}>{vLabel} • ₹{v.price}</option>;
              })}
            </select>
          </div>
        ) : (
          <p className="text-[9px] sm:text-[10px] text-stone-400 font-bold truncate">{product.unit || '500 g'}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-orange-50 gap-1" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1 min-w-0">
          <span className="font-black text-xs sm:text-sm text-slate-900 truncate">₹{price.toFixed(0)}</span>
          {hasMrp && <span className="text-[8px] sm:text-[9px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>}
        </div>

        {!isOutOfStock && (
          qtyInCart > 0 ? (
            <div className="flex items-center bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg overflow-hidden h-7 sm:h-8 shadow-sm shrink-0">
              <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, -1); }} className="px-1.5 sm:px-2 h-full hover:bg-orange-700 font-bold text-xs flex items-center justify-center cursor-pointer"><Minus size={11} /></button>
              <span className="px-1 font-black text-[11px]">{qtyInCart}</span>
              <button onClick={(e) => { e.stopPropagation(); updateQuantity(cartItem.cartItemId, 1); }} className="px-1.5 sm:px-2 h-full hover:bg-orange-700 font-bold text-xs flex items-center justify-center cursor-pointer"><Plus size={11} /></button>
            </div>
          ) : (
            <motion.button
              onClick={handleAdd}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-2.5 sm:px-4 py-1.5 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-[11px] shadow-sm transition cursor-pointer flex items-center justify-center uppercase tracking-wider shrink-0"
            >
              ADD
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
  products, searchQuery = '', wishlistIds = [], toggleWishlist, selectedVariants, setSelectedVariants,
  cart = [], addToCart, updateQuantity, onSelectProduct, onNavigate, onOpenCart, session
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
  const [boughtProductIds, setBoughtProductIds] = useState(new Set());
  
  // Filter and sort states
  const [sortBy, setSortBy] = useState('default'); // 'default', 'price-low', 'price-high', 'discount'
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1000);

  const productsPerPage = 12;

  useEffect(() => {
    const fetchUserPurchaseHistory = async () => {
      if (!session?.user?.id) return;
      
      try {
        const { data: purchasedItems, error } = await supabase
          .from('order_items')
          .select(`
            product_id,
            variant_id,
            orders!inner (
              customer_id
            )
          `)
          .eq('orders.customer_id', session.user.id);

        if (!error && purchasedItems) {
          const purchasedSet = new Set();
          purchasedItems.forEach(item => {
            if (item.product_id) {
              purchasedSet.add(item.product_id);
            }
          });
          setBoughtProductIds(purchasedSet);
        }
      } catch (err) {
        console.error('Error fetching purchase history:', err);
      }
    };

    fetchUserPurchaseHistory();
  }, [session]);

  const parentCategories = activeCategories.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => activeCategories.filter(c => c.parent_id === parentId);

  const currentSubcategories = activeCategory !== 'All' ? getSubcategories(activeCategory) : [];

  const query = searchQuery.toLowerCase().trim();

  // Filter products based on category, search query, discount, and price limit
  const sourceProducts = activeProducts.filter(p => {
    const matchesSearch = !query || p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    
    if (activeCategory !== 'All') {
      const subIds = currentSubcategories.map(s => s.id);
      const matchesCat = activeSubcategoryId !== 'All' 
        ? (p.category_id === activeSubcategoryId || p.category === activeSubcategoryId)
        : (p.category_id === activeCategory || p.category === activeCategory || subIds.includes(p.category_id));
      if (!matchesCat) return false;
    }

    const variants = p.variants || p.product_variants || [];
    const activeVar = variants[0];
    const price = Number(activeVar ? activeVar.price : p.price || 0);
    const mrp = Number(activeVar?.mrp || p.mrp || 0);
    const hasMrp = mrp > price;

    if (onlyDiscounted && !hasMrp) return false;
    if (price > maxPrice) return false;

    return true;
  });

  // Sort products
  const sortedProducts = [...sourceProducts].sort((a, b) => {
    const getPrice = (prod) => {
      const vars = prod.variants || prod.product_variants || [];
      return Number(vars[0]?.price || prod.price || 0);
    };

    const getDiscountPct = (prod) => {
      const vars = prod.variants || prod.product_variants || [];
      const price = Number(vars[0]?.price || prod.price || 0);
      const mrp = Number(vars[0]?.mrp || prod.mrp || 0);
      return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    };

    if (sortBy === 'price-low') return getPrice(a) - getPrice(b);
    if (sortBy === 'price-high') return getPrice(b) - getPrice(a);
    if (sortBy === 'discount') return getDiscountPct(b) - getDiscountPct(a);
    return 0;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const isAnyCategorySelected = activeCategory !== 'All' || query.length > 0;

  return (
    <main className="w-full min-h-screen max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-10 mt-2 font-sans pb-36 text-slate-900 text-xs">
      
      {/* ── STOREFRONT VIEW: WHEN A CATEGORY IS SELECTED OR SEARCHING ── */}
      {isAnyCategorySelected ? (
        <div className="space-y-4">

          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-2 sm:gap-6 items-start pt-1">
            
            {/* Left Vertical Subcategory Sidebar (Image Top, Name Bottom layout) */}
            <div className="flex flex-col space-y-1.5 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`flex flex-col items-center p-2 rounded-xl transition cursor-pointer relative border w-full text-center ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-orange-50/90 border-orange-500 text-orange-950 font-black shadow-xs' 
                    : 'bg-white/95 backdrop-blur-xl border-orange-100 text-stone-600 hover:bg-orange-50/40 font-bold'
                }`}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 font-black text-[10px] mb-1 shadow-2xs">
                  All
                </div>
                <span className="text-[9px] sm:text-[10px] leading-tight line-clamp-1 w-full">All Items</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];

                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                    title={sub.name}
                    className={`flex flex-col items-center p-2 rounded-xl transition cursor-pointer relative border w-full text-center ${
                      isSubSelected 
                        ? 'bg-orange-50/90 border-orange-500 text-orange-950 font-black shadow-xs' 
                        : 'bg-white/95 backdrop-blur-xl border-orange-100 text-stone-600 hover:bg-orange-50/40 font-bold'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-stone-50 overflow-hidden flex items-center justify-center shrink-0 p-0.5 mb-1 shadow-2xs border border-stone-100">
                      <img src={subImg} alt={sub.name} className="w-full h-full object-cover rounded-md" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] leading-tight line-clamp-1 w-full">{sub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Products Container with Top Icon Filters Bar */}
            <div className="flex-1 w-full space-y-3 min-w-0">
              
              {/* TOP MOBILE-FRIENDLY ICON FILTERS BAR */}
              <div className="bg-white/95 backdrop-blur-xl p-2 sm:p-3 rounded-2xl border border-orange-100 shadow-sm flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
                
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                    <SlidersHorizontal size={13} />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 hidden sm:inline">Filters</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Sort Dropdown with Icon */}
                  <div className="relative flex items-center bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                    <ArrowUpDown size={12} className="text-orange-600 mr-1 shrink-0" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-stone-800 text-[10px] font-bold outline-none cursor-pointer"
                    >
                      <option value="default">Relevance</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="discount">Highest Discount</option>
                    </select>
                  </div>

                  {/* Discount Toggle Pill with Icon */}
                  <button
                    type="button"
                    onClick={() => setOnlyDiscounted(!onlyDiscounted)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                      onlyDiscounted 
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                    title="Discounts Only"
                  >
                    <Percent size={12} />
                    <span className="hidden sm:inline">Discount</span>
                  </button>

                  {/* Price Range Compact Box with Icon */}
                  <div className="hidden md:flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                    <Tag size={12} className="text-orange-600 shrink-0" />
                    <span className="text-[9px] font-black uppercase text-stone-500">Max: ₹{maxPrice}</span>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-16 accent-orange-600 cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Products Grid */}
              {sourceProducts.length === 0 ? (
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-12 border border-orange-100 text-center shadow-sm">
                  <Package size={36} className="text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-stone-700">No active products found matching your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
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
                      boughtProductIds={boughtProductIds}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* HOMEPAGE SECTIONS */
        <div className="space-y-10 w-full">

          {/* Categories with Subcategories Section */}
          <div className="space-y-6">
            {parentCategories.map((parentCat, pIdx) => {
              const subcats = getSubcategories(parentCat.id);
              if (subcats.length === 0) return null;

              return (
                <div key={parentCat.id} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                      <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                        {parentCat.name}
                      </h3>
                    </div>
                    <button 
                      onClick={() => { setActiveCategory(parentCat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }} 
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer transition flex items-center gap-0.5"
                    >
                      See All <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="grid grid-rows-2 sm:grid-rows-1 grid-flow-col auto-cols-[65px] sm:auto-cols-[90px] gap-2 overflow-x-auto scrollbar-none pb-1">
                    {subcats.map((sub, sIdx) => {
                      const subImg = sub.image_url || fallbackImages[(pIdx + sIdx) % fallbackImages.length];
                      return (
                        <motion.button
                          whileHover={{ y: -2 }}
                          key={sub.id}
                          onClick={() => { 
                            setActiveCategory(parentCat.id); 
                            setActiveSubcategoryId(sub.id); 
                            setCurrentPage(1); 
                          }}
                          className="flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all bg-transparent text-slate-800 group"
                        >
                          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-transparent overflow-hidden mb-1 shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition">
                            <img src={subImg} alt={sub.name} className="w-full h-full object-cover rounded-lg border-0 bg-transparent" />
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold truncate w-full text-center leading-tight line-clamp-1">{sub.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best Deal Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-1">
                  <Zap size={15} className="text-amber-500 fill-amber-500" /> Best Deal
                </h3>
              </div>
              <button 
                onClick={() => { setActiveCategory(parentCategories[0]?.id || 'All'); }} 
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer transition flex items-center gap-0.5"
              >
                See All <ChevronRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
              {activeProducts.slice(0, 5).map((product) => (
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
                  boughtProductIds={boughtProductIds}
                />
              ))}
            </div>
          </div>

          {/* Best Selling Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-5 bg-orange-600 rounded-full" />
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-1">
                  <Flame size={15} className="text-rose-500 fill-rose-500" /> Best Selling
                </h3>
              </div>
              <button 
                onClick={() => { setActiveCategory(parentCategories[1]?.id || parentCategories[0]?.id || 'All'); }} 
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer transition flex items-center gap-0.5"
              >
                See All <ChevronRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
              {activeProducts.slice(5, 10).map((product) => (
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
                  boughtProductIds={boughtProductIds}
                />
              ))}
            </div>
          </div>

        </div>
      )}

    </main>
  );
}