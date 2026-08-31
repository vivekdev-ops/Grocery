// src/components/store/ProductGrid.jsx
import { Sparkles, Clock, Star, Heart, Plus, Minus, Package, LayoutGrid, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-sans">
      
      {/* 1. Modern High-Impact Banners Carousel */}
      {banners.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-emerald-100/50 shadow-2xl h-48 sm:h-72 group">
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'}`}
            >
              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-6 sm:p-8">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/30 backdrop-blur-md text-emerald-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-400/30 w-fit mb-2">
                  <Zap size={12} className="fill-emerald-300" /> Superfast Delivery
                </div>
                <h2 className="text-white text-xl sm:text-3xl font-black tracking-tight">{banner.title || 'Super Fast Delivery'}</h2>
                <p className="text-emerald-200/90 text-xs sm:text-sm mt-1 font-medium">{banner.subtitle || 'Delivered to your doorstep in minutes.'}</p>
              </div>
            </div>
          ))}

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 right-6 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${i === currentSlide ? 'w-8 bg-emerald-400' : 'w-2 bg-white/50 hover:bg-white'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Active Flash Sale Bar */}
      {activeFlashSale && (
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 border border-emerald-700/50 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md text-amber-400 rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
              <Sparkles size={24} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Limited Time</span>
                <h3 className="font-black text-sm sm:text-base uppercase tracking-wide">{activeFlashSale.title || 'Flash Sale Active'}</h3>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">Grab massive discounts across daily essentials before time runs out!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-slate-950/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-emerald-500/30 shadow-inner shrink-0">
            <Clock size={16} className="text-emerald-400 animate-pulse" />
            <span className="font-mono font-black text-emerald-300 text-sm tracking-wider">{formatTime(timeLeft)}</span>
          </div>
        </div>
      )}

      {/* 3. Category Horizontal Scroll Pills */}
      <div className="space-y-3">
        <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 px-1">Shop by Category</h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none">
          
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-2.5 shadow-xs shrink-0 cursor-pointer ${
              activeCategory === 'All' 
                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 scale-105' 
                : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
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
                className={`px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-2.5 shadow-xs shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 scale-105' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                {cat.image_url && cat.image_url.trim() !== '' ? (
                  <img 
                    src={cat.image_url} 
                    alt={cat.name} 
                    className="w-5 h-5 object-cover rounded-full shrink-0 border border-emerald-200 bg-white" 
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
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span>Explore Catalog</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">{currentProducts.length} items</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Fast 10-minute dispatch</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 h-72 rounded-3xl animate-pulse shadow-xs" />
            ))}
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3 shadow-xs">
            <Package size={48} className="text-slate-300 mx-auto" />
            <p className="text-slate-800 font-black text-base">No products found in this category.</p>
            <p className="text-xs text-slate-400">Try searching for something else or switch categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
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
                  className="bg-white border border-slate-200/80 rounded-3xl p-4 flex flex-col justify-between hover:border-emerald-500/60 transition-all duration-300 shadow-xs hover:shadow-xl cursor-pointer group relative overflow-hidden"
                >
                  {/* Top Wishlist & Rating Badges */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`p-2.5 rounded-full backdrop-blur-md transition pointer-events-auto cursor-pointer shadow-sm ${
                        isWishlisted ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-white/90 text-slate-500 border border-slate-200 hover:text-slate-900 hover:scale-110'
                      }`}
                    >
                      <Heart size={14} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
                    </button>

                    {product.avgRating && (
                      <div className="bg-white/90 backdrop-blur-md text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200/80 flex items-center gap-1 shadow-2xs">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        <span>{product.avgRating}</span>
                      </div>
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="relative w-full h-40 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mb-3 flex items-center justify-center shrink-0">
                    {pImage ? (
                      <img src={pImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-500 ease-out" />
                    ) : (
                      <Package size={32} className="text-slate-300" />
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
                        <span className="bg-rose-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">Sold Out</span>
                      </div>
                    )}
                  </div>

                  {/* Product Metadata & Controls */}
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    
                    {/* Category & Title */}
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">{product.categories?.name || 'Quick Delivery'}</span>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition mt-0.5">{product.name}</h4>
                    </div>

                    {/* Variant Selector */}
                    {product.variants && product.variants.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentVariantKey || ''}
                          onChange={(e) => setSelectedVariants(prev => ({ ...prev, [product.id]: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-xl py-2 px-2.5 outline-none cursor-pointer truncate hover:border-emerald-400 transition"
                        >
                          {product.variants.map((v, i) => (
                            <option key={i} value={v.id || v.label || v.unit_label}>
                              {v.label || v.unit_label} - ₹{v.price}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Price and Add Button Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold leading-none">Price</span>
                        <span className="font-black text-base text-slate-900">₹{currentPrice.toFixed(2)}</span>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-200">Sold Out</span>
                        ) : qtyInCart > 0 ? (
                          <div className="flex items-center gap-2 bg-emerald-700 text-white px-3 py-1.5 rounded-2xl font-black text-xs shadow-lg shadow-emerald-700/30">
                            <button onClick={() => updateQuantity(cartItemMatch.cartItemId, -1)} className="p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"><Minus size={12}/></button>
                            <span className="w-4 text-center">{qtyInCart}</span>
                            <button onClick={() => updateQuantity(cartItemMatch.cartItemId, 1)} className="p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"><Plus size={12}/></button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-5 py-2.5 rounded-2xl transition duration-200 shadow-md shadow-emerald-700/25 active:scale-95 cursor-pointer uppercase tracking-wider"
                          >
                            Add
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
          <div className="flex justify-center items-center gap-1.5 pt-8 flex-wrap">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 h-10 rounded-2xl font-bold text-xs bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer transition"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-10 h-10 rounded-2xl font-black text-xs transition cursor-pointer shadow-2xs ${
                  currentPage === pageNum 
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/30 scale-105' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-emerald-300'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 h-10 rounded-2xl font-bold text-xs bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer transition"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}