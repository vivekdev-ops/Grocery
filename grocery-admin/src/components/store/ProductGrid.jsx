// src/components/store/ProductGrid.jsx
import { Sparkles, Clock, Star, Heart, Plus, Minus, Package, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGrid({
  banners,
  currentSlide,
  activeFlashSale,
  timeLeft,
  formatTime,
  categories,
  activeCategory,
  setActiveCategory,
  loading,
  currentProducts,
  totalPages,
  currentPage,
  setCurrentPage,
  wishlistIds,
  toggleWishlist,
  selectedVariants,
  setSelectedVariants,
  cart,
  addToCart,
  updateQuantity,
  onSelectProduct
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 font-sans">
      
      {/* 1. Banners Carousel */}
      {banners.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden bg-white border border-emerald-100 shadow-xl h-44 sm:h-64">
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                <h2 className="text-white text-lg sm:text-2xl font-black">{banner.title || 'Super Fast Delivery'}</h2>
                <p className="text-emerald-200 text-xs sm:text-sm mt-1">{banner.subtitle || 'Delivered to your doorstep in minutes.'}</p>
              </div>
            </div>
          ))}

          {banners.length > 1 && (
            <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Active Flash Sale Bar */}
      {activeFlashSale && (
        <div className="bg-gradient-to-r from-emerald-100 via-white to-emerald-50 border border-emerald-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/20 text-emerald-800 rounded-2xl flex items-center justify-center border border-emerald-300">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">{activeFlashSale.title || 'Flash Sale Active'}</h3>
              <p className="text-xs text-slate-600">Grab massive discounts before time runs out!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-emerald-200 shadow-2xs">
            <Clock size={16} className="text-emerald-700 animate-pulse" />
            <span className="font-mono font-black text-emerald-800 text-sm tracking-wider">{formatTime(timeLeft)}</span>
          </div>
        </div>
      )}

      {/* 3. Category Horizontal Scroll Tabs (Enhanced padding & flex wrap/scroll) */}
      <div className="space-y-3">
        <h3 className="font-black text-xs uppercase tracking-wider text-slate-500 px-1">Shop by Category</h3>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none">
          
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition flex items-center gap-2 shadow-sm shrink-0 ${
              activeCategory === 'All' 
                ? 'bg-emerald-700 text-white shadow-md' 
                : 'bg-white text-slate-700 border border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <LayoutGrid size={16} className={activeCategory === 'All' ? 'text-white' : 'text-emerald-700'} />
            All Products
          </button>

          {categories.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition flex items-center gap-2 shadow-sm shrink-0 ${
                  isSelected 
                    ? 'bg-emerald-700 text-white shadow-md' 
                    : 'bg-white text-slate-700 border border-emerald-200 hover:border-emerald-300'
                }`}
              >
                {cat.image_url && cat.image_url.trim() !== '' ? (
                  <img 
                    src={cat.image_url} 
                    alt={cat.name} 
                    className="w-5 h-5 object-cover rounded-full shrink-0 border border-emerald-100" 
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.style.display = 'none'; 
                    }} 
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Product Grid Display */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Explore Catalog</h3>
          <span className="text-xs text-slate-500 font-medium">{currentProducts.length} items available</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white border border-emerald-100 h-64 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="bg-white border border-emerald-100 rounded-3xl p-12 text-center space-y-3">
            <Package size={40} className="text-slate-400 mx-auto" />
            <p className="text-slate-700 font-bold text-sm">No products found in this category.</p>
            <p className="text-xs text-slate-400">Try searching for something else or switch categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {currentProducts.map(product => {
              const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
              const pImage = pImages[0] || '';
              const isWishlisted = wishlistIds.includes(product.id);
              
              const currentVariantKey = selectedVariants[product.id];
              const activeVariant = product.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
              
              const currentPrice = Number(activeVariant ? activeVariant.price : product.price || 0);
              const currentStock = Number(activeVariant ? activeVariant.stock : product.stock || 0);
              const isOutOfStock = currentStock <= 0;

              const cartItemMatch = cart.find(ci => ci.product.id === product.id && (!activeVariant || ci.variant?.id === activeVariant.id || ci.variant?.label === activeVariant.label));
              const qtyInCart = cartItemMatch ? cartItemMatch.quantity : 0;

              return (
                <div 
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white border border-emerald-100 rounded-3xl p-3.5 flex flex-col justify-between hover:border-emerald-300 transition duration-300 shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`p-2 rounded-full backdrop-blur-md transition pointer-events-auto ${
                        isWishlisted ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-white/80 text-slate-500 border border-emerald-100 hover:text-slate-900'
                      }`}
                    >
                      <Heart size={14} className={isWishlisted ? 'fill-rose-500' : ''} />
                    </button>

                    {product.avgRating && (
                      <div className="bg-white/90 backdrop-blur-md text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-200 flex items-center gap-1">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        <span>{product.avgRating}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative w-full h-36 bg-emerald-50/40 rounded-2xl overflow-hidden border border-emerald-100/60 mb-3 flex items-center justify-center shrink-0">
                    {pImage ? (
                      <img src={pImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <Package size={28} className="text-slate-400" />
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Sold Out</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">{product.categories?.name || 'Quick Delivery'}</span>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition mt-0.5">{product.name}</h4>
                    </div>

                    {product.variants && product.variants.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentVariantKey || ''}
                          onChange={(e) => setSelectedVariants(prev => ({ ...prev, [product.id]: e.target.value }))}
                          className="w-full bg-emerald-50/50 border border-emerald-200 text-slate-800 text-[11px] font-bold rounded-xl py-1.5 px-2 outline-none cursor-pointer truncate"
                        >
                          {product.variants.map((v, i) => (
                            <option key={i} value={v.id || v.label || v.unit_label}>
                              {v.label || v.unit_label} - ₹{v.price}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-emerald-50">
                      <span className="font-black text-sm text-slate-900">₹{currentPrice.toFixed(2)}</span>

                      <div onClick={(e) => e.stopPropagation()}>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Sold Out</span>
                        ) : qtyInCart > 0 ? (
                          <div className="flex items-center gap-1.5 bg-emerald-700 text-white px-2 py-1 rounded-xl font-black text-xs shadow-md">
                            <button onClick={() => updateQuantity(cartItemMatch.cartItemId, -1)} className="p-0.5 hover:bg-emerald-800 rounded"><Minus size={12}/></button>
                            <span className="w-4 text-center">{qtyInCart}</span>
                            <button onClick={() => updateQuantity(cartItemMatch.cartItemId, 1)} className="p-0.5 hover:bg-emerald-800 rounded"><Plus size={12}/></button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl transition duration-200 shadow-md shadow-emerald-700/20 active:scale-95"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1.5 pt-6 flex-wrap">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 h-9 rounded-xl font-bold text-xs bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-xl font-black text-xs transition ${
                  currentPage === pageNum 
                    ? 'bg-emerald-700 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-emerald-200 hover:text-slate-900'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 h-9 rounded-xl font-bold text-xs bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}