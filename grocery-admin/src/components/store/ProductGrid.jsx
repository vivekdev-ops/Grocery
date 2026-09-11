// src/components/store/ProductGrid.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Heart, Package, Star, ChevronRight, Flame, Zap, Plus, Minus, Home, ShoppingBag, User } from 'lucide-react';
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
      className="bg-white rounded-[2rem] border border-stone-200/85 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative group overflow-hidden w-full p-4 justify-between"
    >
      <button
        onClick={e => { e.stopPropagation(); toggleWishlist(product.id, e); }}
        className={`absolute top-3 right-3 z-20 p-2.5 rounded-full transition-all duration-150 backdrop-blur-md bg-white/80 shadow-xs
          ${isWishlisted ? 'text-rose-500 scale-105' : 'text-stone-400 hover:text-rose-500'}`}
        title="Wishlist"
      >
        <Heart size={16} className={isWishlisted ? 'fill-rose-500' : ''} />
      </button>

      <div className="relative w-full aspect-square bg-transparent rounded-2xl overflow-hidden flex items-center justify-center mb-3">
        {isBoughtBefore && (
          <div className="absolute top-2.5 left-2.5 z-20 bg-sky-50 text-sky-800 border border-sky-200/80 shadow-xs px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
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
              className="w-full bg-transparent border border-stone-200 text-stone-700 text-[10px] font-bold rounded-xl px-2.5 py-2 outline-none cursor-pointer"
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
          <span className="font-black text-sm sm:text-base text-slate-900">₹{price.toFixed(0)}</span>
          {hasMrp && <span className="text-[10px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>}
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
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-2xl font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1 uppercase tracking-wider"
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

  const isAnyCategorySelected = activeCategory !== 'All' || query.length > 0;
  const activeCategoryObj = parentCategories.find(c => c.id === activeCategory);

  return (
    <main className="w-full min-h-screen max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-10 mt-2 font-sans pb-36 text-slate-900">
      
      {/* ── STOREFRONT VIEW: WHEN A CATEGORY IS SELECTED OR SEARCHING ── */}
      {isAnyCategorySelected ? (
        <div className="space-y-4">

          <div className="grid grid-cols-[105px_1fr] sm:grid-cols-[150px_1fr] md:grid-cols-[230px_1fr] gap-3 sm:gap-6 items-start pt-1">
            
            {/* Left Vertical Subcategory Sidebar */}
            <div className="flex flex-col space-y-2 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
              
              {activeCategoryObj && (
                <div className="bg-white p-3 rounded-2xl border border-emerald-500 shadow-sm flex flex-col items-center text-center mb-1">
                  <div className="w-12 h-12 rounded-xl bg-transparent overflow-hidden mb-1.5 flex items-center justify-center p-0.5">
                    <img src={activeCategoryObj.image_url || fallbackImages[0]} alt={activeCategoryObj.name} className="w-full h-full object-cover rounded-lg border-0 bg-transparent" />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 line-clamp-1">{activeCategoryObj.name}</span>
                </div>
              )}

              <button
                onClick={() => { setActiveSubcategoryId('All'); setCurrentPage(1); }}
                className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition cursor-pointer relative border w-full text-left ${
                  activeSubcategoryId === 'All' 
                    ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-black shadow-xs' 
                    : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50 font-bold'
                }`}
              >
                {activeSubcategoryId === 'All' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 rounded-r-full" />
                )}
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-[10px]">
                  All
                </div>
                <span className="text-[11px] leading-tight line-clamp-2 w-full">All {activeCategoryObj?.name || 'Items'}</span>
              </button>

              {currentSubcategories.map((sub, index) => {
                const isSubSelected = activeSubcategoryId === sub.id;
                const subImg = sub.image_url || fallbackImages[index % fallbackImages.length];

                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubcategoryId(sub.id); setCurrentPage(1); }}
                    className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition cursor-pointer relative border w-full text-left ${
                      isSubSelected 
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-black shadow-xs' 
                        : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50 font-bold'
                    }`}
                  >
                    {isSubSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 rounded-r-full" />
                    )}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-transparent overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                      <img src={subImg} alt={sub.name} className="w-full h-full object-cover rounded-lg border-0 bg-transparent" />
                    </div>
                    <span className="text-[11px] sm:text-xs leading-tight line-clamp-2 w-full">{sub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            <div className="flex-1 w-full space-y-4 min-w-0">
              {sourceProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center shadow-sm">
                  <Package size={48} className="text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-stone-700">No active products found in this subcategory.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
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
        <div className="space-y-12 w-full">

          {/* Categories with Subcategories Section (2 rows on mobile, 1 row on web, horizontal scroll) */}
          <div className="space-y-8">
            {parentCategories.map((parentCat, pIdx) => {
              const subcats = getSubcategories(parentCat.id);
              if (subcats.length === 0) return null;

              return (
                <div key={parentCat.id} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                      <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                        {parentCat.name}
                      </h3>
                    </div>
                    <button 
                      onClick={() => { setActiveCategory(parentCat.id); setActiveSubcategoryId('All'); setCurrentPage(1); }} 
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition flex items-center gap-1"
                    >
                      See All <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="grid grid-rows-2 sm:grid-rows-1 grid-flow-col auto-cols-[85px] sm:auto-cols-[100px] gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-2">
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
                          className="flex flex-col items-center p-2.5 rounded-2xl cursor-pointer transition-all bg-transparent text-slate-800 group"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-transparent overflow-hidden mb-1.5 shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition">
                            <img src={subImg} alt={sub.name} className="w-full h-full object-cover rounded-xl border-0 bg-transparent" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold truncate w-full text-center leading-tight line-clamp-1">{sub.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best Deal Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Zap size={18} className="text-amber-500 fill-amber-500" /> Best Deal
                </h3>
              </div>
              <button 
                onClick={() => { setActiveCategory(parentCategories[0]?.id || 'All'); }} 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition flex items-center gap-1"
              >
                See All <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Flame size={18} className="text-rose-500 fill-rose-500" /> Best Selling
                </h3>
              </div>
              <button 
                onClick={() => { setActiveCategory(parentCategories[1]?.id || parentCategories[0]?.id || 'All'); }} 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition flex items-center gap-1"
              >
                See All <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200/80 py-2.5 px-6 z-50 shadow-2xl max-w-lg mx-auto sm:max-w-none sm:rounded-t-3xl">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button 
            onClick={() => { setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-1 text-emerald-600 cursor-pointer group"
          >
            <div className="relative p-1.5 bg-emerald-50 rounded-xl transition group-hover:scale-105">
              <Home size={20} className="stroke-[2.5]" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500 rounded-full" />
            </div>
            <span className="text-[10px] font-black">Shop</span>
          </button>

          <button 
            onClick={() => { if(onNavigate) onNavigate('wishlist'); else setActiveCategory(parentCategories[0]?.id || 'All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-700 cursor-pointer transition group"
          >
            <div className="p-1.5 rounded-xl transition group-hover:bg-stone-100">
              <Heart size={20} className="stroke-[2]" />
            </div>
            <span className="text-[10px] font-bold">Favourite</span>
          </button>

          <button 
            onClick={() => { if(onOpenCart) onOpenCart(); }}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-stone-700 cursor-pointer transition group"
          >
            <div className="p-1.5 rounded-xl transition group-hover:bg-stone-100">
              <ShoppingBag size={20} className="stroke-[2]" />
            </div>
            <span className="text-[10px] font-bold">Cart</span>
          </button>

          <button 
            onClick={() => { if(onNavigate) onNavigate('profile'); }}
            className="flex flex-col items-center group cursor-pointer transition text-stone-400 hover:text-stone-700"
          >
            <div className="p-1.5 rounded-xl transition group-hover:bg-stone-100">
              <User size={20} className="stroke-[2]" />
            </div>
            <span className="text-[10px] font-bold">Account</span>
          </button>
        </div>
      </div>

    </main>
  );
}