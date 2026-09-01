// src/components/store/ProductGrid.jsx
import { useState } from 'react';
import { Heart, Star, ShoppingBag, ChevronDown } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      
      {/* Banners Slider */}
      {banners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="relative rounded-3xl overflow-hidden shadow-xl h-48 sm:h-64 md:h-80 bg-emerald-950 border border-emerald-800/60">
            {banners.map((banner, index) => (
              <div 
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6">
                  <h2 className="text-white text-lg sm:text-2xl font-black">{banner.title || 'Super Grocery Deals'}</h2>
                  <p className="text-emerald-300 text-xs sm:text-sm font-medium mt-1">{banner.subtitle || 'Delivered fresh in 10 minutes'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

     

      {/* Category Pills Bar with Images */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none py-2">
        <div className="flex gap-2.5 min-w-max">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
              activeCategory === 'All' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer border ${
                activeCategory === cat.id 
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.image_url && (
                <img src={cat.image_url} alt="" className="w-5 h-5 object-cover rounded-full border border-emerald-300 shrink-0" />
              )}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Product Grid */}
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="text-center py-24 text-slate-400 font-bold text-sm">Loading fresh inventory...</div>
        ) : currentProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-2xs space-y-2">
            <p className="text-slate-800 text-sm font-black">No products found.</p>
            <p className="text-slate-400 text-xs">Try selecting a different category or clearing your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentProducts.map(product => {
              const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
              const isWishlisted = wishlistIds.includes(product.id);
              
              const variantsList = product.variants || [];
              const currentVariantKey = selectedVariants[product.id];
              const activeVariant = variantsList.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
              
              // Base price & variant price calculations
              const rawSellingPrice = Number(activeVariant ? activeVariant.price : product.price || 0);
              const rawMrpPrice = Number(activeVariant?.mrp || product.mrp || 0);

              // If product has an active deal badge override from fetchStoreData
              let sellingPrice = rawSellingPrice;
              let hasMrp = rawMrpPrice > sellingPrice;
              let discountPct = hasMrp ? Math.round(((rawMrpPrice - sellingPrice) / rawMrpPrice) * 100) : null;
              let mrpPrice = rawMrpPrice;

              if (product.dealBadge) {
                const matchPercent = String(product.dealBadge).match(/(\d+)\s*%/);
                const extractedPercent = matchPercent ? parseInt(matchPercent[1], 10) : 0;
                if (extractedPercent > 0) {
                  sellingPrice = Math.round(rawSellingPrice * (1 - extractedPercent / 100));
                  mrpPrice = rawMrpPrice > sellingPrice ? rawMrpPrice : rawSellingPrice;
                  hasMrp = mrpPrice > sellingPrice;
                  discountPct = extractedPercent;
                }
              }
              
              const stockCount = Number(activeVariant ? activeVariant.stock : product.stock || 0);
              const isOutOfStock = stockCount <= 0;

              const cartVariantKey = activeVariant ? (activeVariant.id || activeVariant.label || activeVariant.unit_label) : null;
              const cartItemId = cartVariantKey ? `${product.id}-${cartVariantKey}` : product.id;
              const cartItem = cart.find(ci => ci.cartItemId === cartItemId);
              const quantityInCart = cartItem ? cartItem.quantity : 0;

              // Product object with overridden price for cart insertion
              const productWithDealPrice = { ...product, price: sellingPrice };

              return (
                <div 
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-lg transition duration-300 flex flex-col justify-between group cursor-pointer relative"
                >
                  {/* Discount Badge */}
                  {discountPct && (
                    <span className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                      {product.dealBadge ? product.dealBadge : `${discountPct}% OFF`}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button 
                    onClick={(e) => toggleWishlist(product.id, e)}
                    className={`absolute top-3 right-3 z-10 p-2 rounded-full border transition cursor-pointer ${
                      isWishlisted ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white/80 backdrop-blur-xs text-slate-500 border-slate-200 hover:text-rose-600'
                    }`}
                  >
                    <Heart size={15} className={isWishlisted ? 'fill-rose-600' : ''} />
                  </button>

                  <div className="space-y-3">
                    <div className="relative h-40 bg-emerald-50/40 rounded-2xl overflow-hidden flex items-center justify-center border border-emerald-100">
                      {pImages[0] ? (
                        <img src={pImages[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <Package size={32} className="text-emerald-300" />
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">Sold Out</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {product.categories?.name || 'Grocery'}
                      </span>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm mt-2 line-clamp-1 group-hover:text-emerald-700 transition">{product.name}</h4>
                    </div>

                    {/* Variants Dropdown Selector */}
                    {variantsList.length > 0 && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <select 
                          value={currentVariantKey}
                          onChange={(e) => setSelectedVariants(prev => ({ ...prev, [product.id]: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none pr-8"
                        >
                          {variantsList.map(v => (
                            <option key={v.id || v.label || v.unit_label} value={v.id || v.label || v.unit_label}>
                              {v.unit_label || v.label} - ₹{v.price}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-slate-900 text-sm">₹{sellingPrice}</span>
                        {hasMrp && (
                          <span className="text-[11px] text-slate-400 line-through">₹{mrpPrice}</span>
                        )}
                      </div>
                    </div>

                    <div onClick={e => e.stopPropagation()}>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">Sold Out</span>
                      ) : quantityInCart === 0 ? (
                        <button 
                          onClick={() => addToCart(productWithDealPrice)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md shadow-emerald-700/20 active:scale-95 cursor-pointer"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-md">
                          <button onClick={() => updateQuantity(cartItemId, -1)} className="w-5 h-5 flex items-center justify-center font-black text-sm hover:bg-emerald-800 rounded cursor-pointer">-</button>
                          <span className="font-black text-xs">{quantityInCart}</span>
                          <button onClick={() => updateQuantity(cartItemId, 1)} className="w-5 h-5 flex items-center justify-center font-black text-sm hover:bg-emerald-800 rounded cursor-pointer">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Previous
            </button>
            <span className="text-xs font-black text-slate-700 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}