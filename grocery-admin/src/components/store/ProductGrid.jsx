// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Star, Sparkles, Clock, Package, ChevronRight } from 'lucide-react';

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
  products,
  currentProducts,
  filteredProducts,
  totalPages,
  currentPage,
  setCurrentPage,
  wishlistIds,
  toggleWishlist,
  selectedVariants,
  setSelectedVariants,
  addToCart,
  onSelectProduct
}) {

  const fallbackCategoryImages = [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80'
  ];

  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const displayCategoryTitle = activeCategory === 'All' ? 'All Products & Daily Essentials' : (activeCategoryObj ? activeCategoryObj.name : 'Category Products');

  // Use full products list when All is selected, otherwise use filtered list
  const sourceProducts = activeCategory === 'All' ? (products || []) : (filteredProducts || []);

  const productsByCategory = categories.map(cat => {
    const items = sourceProducts.filter(p => 
      p.category_id === cat.id || 
      p.category === cat.id || 
      p.category === cat.name ||
      p.categories?.name === cat.name
    );
    return { ...cat, items };
  }).filter(cat => cat.items.length > 0);

  return (
    <main className="max-w-7xl mx-auto px-4 mt-4 space-y-10 font-sans">
      
      {/* Promotional Banner Carousel */}
      {banners.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-md bg-emerald-950 min-h-[160px] md:min-h-[200px] flex items-center">
          <div className="w-full h-full relative">
            <img 
              src={banners[currentSlide]?.image_url} 
              alt={banners[currentSlide]?.title || 'Banner'} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-transparent to-transparent flex flex-col justify-center p-6 md:p-10 text-white">
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider w-max mb-2">Instant Delivery</span>
              <h2 className="text-xl md:text-3xl font-black tracking-tight">{banners[currentSlide]?.title || 'Stock up on daily essentials'}</h2>
              <p className="text-xs text-emerald-200 mt-1 max-w-md">{banners[currentSlide]?.subtitle || 'Get farm-fresh groceries delivered in minutes.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Categories Grid Section with Default "All Items" Option */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-base md:text-lg text-slate-900">Shop by Category</h3>
          <span className="text-xs font-bold text-slate-400">Explore all categories</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3">
          <div 
            onClick={() => setActiveCategory('All')}
            className={`bg-white rounded-2xl p-2.5 text-center border shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col items-center justify-between gap-2 group ${
              activeCategory === 'All' ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/30' : 'border-slate-100'
            }`}
          >
            <div className="w-full h-16 md:h-20 rounded-xl bg-emerald-100 text-emerald-800 overflow-hidden flex items-center justify-center p-1">
              <span className="text-xl font-black">✨</span>
            </div>
            <span className="text-[10px] md:text-[11px] font-black text-slate-800 leading-tight line-clamp-2">All Items</span>
          </div>

          {categories.map((cat, index) => {
            const isSelected = activeCategory === cat.id;
            const catImage = cat.image_url || fallbackCategoryImages[index % fallbackCategoryImages.length];

            return (
              <div 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`bg-white rounded-2xl p-2.5 text-center border shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col items-center justify-between gap-2 group ${
                  isSelected ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div className="w-full h-16 md:h-20 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center p-1">
                  <img src={catImage} alt={cat.name} className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-300" />
                </div>
                <span className="text-[10px] md:text-[11px] font-black text-slate-800 leading-tight line-clamp-2">{cat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flash Sale Bar if active */}
      {activeFlashSale && (
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 rounded-3xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Sparkles size={24} className="text-amber-200 animate-bounce" />
            </div>
            <div>
              <h4 className="font-black text-base">{activeFlashSale.title || 'Mega Flash Sale'}</h4>
              <p className="text-xs text-rose-100">Hurry! Special discounts active across store items.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/40 px-4 py-2.5 rounded-2xl border border-white/20 font-mono font-bold text-sm">
            <Clock size={16} className="text-amber-300" />
            <span>Ends in: {formatTime(timeLeft)}</span>
          </div>
        </div>
      )}

      {/* Main Catalog View: Horizontal Scrolling Shelves when 'All' is selected */}
      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-slate-400">Loading instant store catalog...</div>
      ) : activeCategory === 'All' ? (
        <div className="space-y-12">
          {productsByCategory.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-emerald-100 text-xs text-slate-400 italic shadow-sm">
              No products found in the catalog.
            </div>
          ) : (
            productsByCategory.map(catSection => (
              <div key={catSection.id} className="space-y-4">
                
                {/* Section Header with "see all" button on the right */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    {catSection.name}
                  </h3>
                  <button 
                    onClick={() => setActiveCategory(catSection.id)} 
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 uppercase tracking-wider cursor-pointer"
                  >
                    see all
                  </button>
                </div>

                {/* Horizontal Scrollable Shelf Container */}
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
                    {catSection.items.map(product => {
                      const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
                      const currentVariantKey = selectedVariants[product.id];
                      const activeVariant = product.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
                      
                      const price = Number(activeVariant ? activeVariant.price : product.price || 0);
                      const mrp = Number(activeVariant?.mrp || product.mrp || 0);
                      const hasMrp = mrp > price;
                      const stock = Number(activeVariant ? activeVariant.stock : product.stock || 0);
                      const isOutOfStock = stock <= 0;
                      const isWishlisted = wishlistIds.includes(product.id);

                      return (
                        <div 
                          key={product.id} 
                          onClick={() => onSelectProduct(product)}
                          className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group cursor-pointer relative min-w-[160px] sm:min-w-[180px] max-w-[180px]"
                        >
                          <button 
                            onClick={(e) => toggleWishlist(product.id, e)}
                            className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition shadow-xs ${
                              isWishlisted ? 'bg-rose-50 text-rose-600' : 'bg-slate-100/80 hover:bg-white text-slate-500'
                            }`}
                          >
                            <Heart size={14} className={isWishlisted ? 'fill-rose-600' : ''} />
                          </button>

                          <div>
                            <div className="w-full h-36 bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center mb-2.5">
                              {pImages[0] ? (
                                <img src={pImages[0]} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
                              ) : (
                                <span className="text-3xl">📦</span>
                              )}
                              
                              {product.dealBadge && (
                                <span className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow">
                                  {product.dealBadge}
                                </span>
                              )}

                              <span className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md font-mono font-bold text-[9px] text-slate-700 flex items-center gap-0.5 shadow-2xs">
                                <Clock size={10} className="text-emerald-600"/> 8 MINS
                              </span>
                            </div>

                            <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{product.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{activeVariant?.unit_label || activeVariant?.label || product.unit || '1 pc'}</p>
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                            <div>
                              <span className="font-black text-xs text-slate-900">₹{price.toFixed(0)}</span>
                              {hasMrp && (
                                <span className="text-[10px] text-slate-400 line-through block leading-none">₹{mrp.toFixed(0)}</span>
                              )}
                            </div>

                            {isOutOfStock ? (
                              <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2.5 py-1 rounded-xl">Sold Out</span>
                            ) : (
                              <button 
                                onClick={() => addToCart(product)}
                                className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent font-black px-3.5 py-1.5 rounded-xl text-xs uppercase transition cursor-pointer shadow-2xs active:scale-95"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        /* --- SINGLE CATEGORY GRID VIEW WHEN A SPECIFIC CATEGORY IS SELECTED --- */
        <div className="space-y-6">
          <div className="flex justify-between items-center pt-2 border-b border-emerald-100 pb-2">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {displayCategoryTitle}
            </h3>
            <span className="text-xs font-bold text-slate-400">{currentProducts.length} items available</span>
          </div>

          {currentProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-emerald-100 text-xs text-slate-400 italic shadow-sm">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentProducts.map(product => {
                const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
                const currentVariantKey = selectedVariants[product.id];
                const activeVariant = product.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
                
                const price = Number(activeVariant ? activeVariant.price : product.price || 0);
                const mrp = Number(activeVariant?.mrp || product.mrp || 0);
                const hasMrp = mrp > price;
                const stock = Number(activeVariant ? activeVariant.stock : product.stock || 0);
                const isOutOfStock = stock <= 0;
                const isWishlisted = wishlistIds.includes(product.id);

                return (
                  <div 
                    key={product.id} 
                    onClick={() => onSelectProduct(product)}
                    className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group cursor-pointer relative"
                  >
                    <button 
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition shadow-xs ${
                        isWishlisted ? 'bg-rose-50 text-rose-600' : 'bg-slate-100/80 hover:bg-white text-slate-500'
                      }`}
                    >
                      <Heart size={14} className={isWishlisted ? 'fill-rose-600' : ''} />
                    </button>

                    <div>
                      <div className="w-full h-36 bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center mb-2.5">
                        {pImages[0] ? (
                          <img src={pImages[0]} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
                        ) : (
                          <span className="text-3xl">📦</span>
                        )}
                        
                        {product.dealBadge && (
                          <span className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow">
                            {product.dealBadge}
                          </span>
                        )}

                        <span className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md font-mono font-bold text-[9px] text-slate-700 flex items-center gap-0.5 shadow-2xs">
                          <Clock size={10} className="text-emerald-600"/> 8 MINS
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{product.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{activeVariant?.unit_label || activeVariant?.label || product.unit || '1 pc'}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                      <div>
                        <span className="font-black text-xs text-slate-900">₹{price.toFixed(0)}</span>
                        {hasMrp && (
                          <span className="text-[10px] text-slate-400 line-through block leading-none">₹{mrp.toFixed(0)}</span>
                        )}
                      </div>

                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2.5 py-1 rounded-xl">Sold Out</span>
                      ) : (
                        <button 
                          onClick={() => addToCart(product)}
                          className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent font-black px-3.5 py-1.5 rounded-xl text-xs uppercase transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

    </main>
  );
}