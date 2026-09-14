// src/components/pages/WishlistPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Search, Heart, X, Star, Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import PortalBottomNav from '../PortalBottomNav';
import CartDrawer from '../store/CartDrawer';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  // Modal specific interactive states
  const [modalActiveImage, setModalActiveImage] = useState('');
  const [modalSelectedVariantKey, setModalSelectedVariantKey] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);

  // Cart & Drawer State Synchronization
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddAddressBox, setShowAddAddressBox] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    title: 'Home',
    house_no: '',
    ward_no_name: '',
    city: 'Harraiya',
    district: 'Basti',
    state: 'Uttar Pradesh',
    pincode: '272155',
    phone: '',
    latitude: null,
    longitude: null
  });
  const [addressForm, setAddressForm] = useState({ phone: '', address: '' });
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchWishlist(session.user.id);
        fetchSavedAddresses(session.user.id);
        fetchDeliveryRules();
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    const handleOpenCartEvent = () => setIsCartOpen(true);
    window.addEventListener('openCartDrawer', handleOpenCartEvent);

    const handleCartUpdate = (e) => {
      if (e.detail) {
        setCart(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('cart_items');
          setCart(saved ? JSON.parse(saved) : []);
        } catch {
          setCart([]);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('openCartDrawer', handleOpenCartEvent);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [navigate]);

  const fetchWishlist = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          products!fk_wishlists_product (
            *,
            product_variants (*)
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (err) {
      console.error('Error fetching wishlist from database:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async (userId) => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setSavedAddresses(data);
      handleSelectAddress(data[0]);
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponInput.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        alert("Invalid or inactive coupon code.");
        return;
      }
      setAppliedCoupon(data);
      setCouponInput('');
      alert("Coupon applied successfully!");
    } catch {
      alert("Failed to apply coupon.");
    }
  };

  const handleCheckout = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!session?.user) { navigate('/login'); return; }

    if (!cart || cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setCheckingOut(true);
    try {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_email: session.user.email,
          customer_id: session.user.id,
          total_amount: cartTotal,
          status: 'pending',
          delivery_address: addressForm.address,
          phone: addressForm.phone,
          otp: generatedOtp,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: discountAmount,
          delivery_fee: deliveryFee,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item?.product?.id || item?.id || item?.product_id,
        variant_id: item?.variant?.id || null,
        variant_label: item?.variant?.unit_label || item?.variant?.label || null,
        quantity: Number(item?.quantity) || 1,
        price: Number(item?.price) || 0
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      setCart([]);
      localStorage.removeItem('cart_items');
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
      window.dispatchEvent(new Event('storage'));
      setIsCartOpen(false);
      alert("Order placed successfully!");
      navigate('/account/orders');
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error removing item:', err.message);
    }
  };

  const getProductImages = (product) => {
    if (!product) return ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'];
    let imgs = [];
    if (Array.isArray(product.images)) imgs = [...imgs, ...product.images];
    if (Array.isArray(product.gallery)) imgs = [...imgs, ...product.gallery];
    if (product.image_url) imgs.push(product.image_url);
    if (product.image) imgs.push(product.image);
    
    if (imgs.length === 0) {
      imgs.push('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    }
    return Array.from(new Set(imgs.filter(Boolean)));
  };

  const openProductModal = (product) => {
    setSelectedProductDetail(product);
    const imgs = getProductImages(product);
    setModalActiveImage(imgs[0]);
    const vars = product.product_variants || product.variants || [];
    if (vars.length > 0) {
      setModalSelectedVariantKey(vars[0].id || vars[0].unit_label || vars[0].label);
    } else {
      setModalSelectedVariantKey('');
    }
    setModalQuantity(1);
  };

  const addToCart = (product, variant = null, quantity = 1, e) => {
    if (e) e.stopPropagation();
    const vars = product.product_variants || product.variants || [];
    const activeVar = variant || (vars.find(v => (v.id || v.unit_label || v.label) === modalSelectedVariantKey) || vars[0] || null);
    const price = Number(activeVar?.price ?? product.price ?? 0);
    const cartItemId = `${product.id}-${activeVar?.id || activeVar?.unit_label || 'default'}`;
    const allImgs = getProductImages(product);
    const itemImage = allImgs[0];

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      let updated;
      if (existing) {
        updated = prev.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updated = [...prev, {
          cartItemId,
          product,
          variant: activeVar,
          id: product.id,
          product_id: product.id,
          title: product.name,
          price: price,
          quantity: quantity,
          stock: 99,
          image: itemImage
        }];
      }
      localStorage.setItem('cart_items', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updated }));
      window.dispatchEvent(new Event('storage'));
      return updated;
    });

    alert(`Added ${quantity} x ${product.name} to cart!`);
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const wishlistCount = wishlistItems.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 text-stone-900 pb-36 font-sans text-xs antialiased">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-white/20 animate-pulse" />
          <div className="space-y-1">
            <div className="w-24 h-4 bg-white/30 rounded animate-pulse" />
            <div className="w-36 h-3 bg-white/20 rounded animate-pulse" />
          </div>
        </div>

        <main className="max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 animate-pulse">
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white/70 backdrop-blur-md rounded-2xl border border-orange-100 h-28 w-full p-4 flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-stone-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-3 bg-stone-200 rounded" />
                  <div className="w-1/2 h-2.5 bg-stone-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <PortalBottomNav totalItemsCount={totalItemsCount} totalPrice={cartTotal} wishlistCount={wishlistCount} onOpenCart={() => setIsCartOpen(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 font-sans text-stone-900 pb-36 select-none flex flex-col w-full selection:bg-orange-600 selection:text-white text-xs antialiased">
      
      {/* Mobile-First Compact Top Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30 shadow-md">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition active:scale-95 cursor-pointer border border-white/30 shrink-0"
          title="Back"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <div className="min-w-0">
          <h1 className="font-black text-white text-sm sm:text-base tracking-tight truncate">My Wishlist</h1>
          <p className="text-[10px] text-amber-100 font-medium truncate">Saved items ready for quick purchase</p>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 w-full">
        {wishlistItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-orange-100 p-8 text-center shadow-sm space-y-3 mt-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <Heart className="w-7 h-7 fill-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-xs">Your wishlist is empty</h3>
              <p className="text-stone-400 text-[11px] mt-0.5">Tap the heart icon on any product to save items here.</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black shadow-sm cursor-pointer transition active:scale-95 uppercase tracking-wider text-[11px]"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-black uppercase tracking-wider text-[11px] text-stone-500">
                Saved Items ({wishlistItems.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {wishlistItems.map((item) => {
                const product = item.products;
                if (!product) return null;

                const variants = product.product_variants || product.variants || [];
                const firstVariant = variants[0] || null;

                const allImgs = getProductImages(product);
                const prodImage = allImgs[0];
                
                const price = Number(firstVariant?.price ?? product.price ?? 0);
                const mrp = Number(firstVariant?.mrp ?? product.mrp ?? 0);
                const hasMrp = mrp > price;
                const discountPct = hasMrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
                const unitLabel = firstVariant?.unit_label || firstVariant?.label || product.unit || '';

                return (
                  <div 
                    key={item.id} 
                    onClick={() => openProductModal(product)}
                    className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition duration-200 overflow-hidden p-3.5 flex flex-col justify-between relative cursor-pointer"
                  >
                    {/* Wishlist Remove Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveFromWishlist(item.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 transition cursor-pointer z-10 hover:bg-rose-100 shadow-2xs"
                      title="Remove from wishlist"
                    >
                      <Heart size={13} className="fill-rose-500" />
                    </button>

                    {discountPct > 0 && (
                      <div className="absolute top-2.5 left-2.5 z-10 bg-rose-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-xs">
                        {discountPct}% OFF
                      </div>
                    )}

                    {/* Product Image */}
                    <div className="w-full h-28 bg-stone-50 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-2.5 border border-stone-100">
                      <img 
                        src={prodImage} 
                        alt={product.name} 
                        className="w-full h-full object-contain hover:scale-105 transition duration-300" 
                      />
                    </div>

                    {/* Product Details */}
                    <div className="space-y-0.5 mb-2.5 min-w-0">
                      <h2 className="font-bold text-stone-900 text-xs truncate leading-tight">{product.name}</h2>
                      <p className="text-[10px] text-stone-400 font-medium truncate">{unitLabel}</p>
                    </div>

                    {/* Price and Add Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-orange-50 gap-1">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-slate-900 text-xs truncate">₹{price.toFixed(0)}</span>
                          {hasMrp && (
                            <span className="text-[9px] text-stone-400 line-through font-bold">₹{mrp.toFixed(0)}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => addToCart(product, firstVariant, 1, e)}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black px-3 py-1.5 rounded-xl text-[10px] transition cursor-pointer shadow-xs active:scale-95 uppercase tracking-wider shrink-0 flex items-center gap-1"
                      >
                        <ShoppingBag size={11} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Product Detail Modal Popup matching user's custom layout theme */}
      {selectedProductDetail && (() => {
        const modalVariants = selectedProductDetail.product_variants || selectedProductDetail.variants || [];
        const activeVar = modalVariants.find(v => (v.id || v.unit_label || v.label) === modalSelectedVariantKey) || modalVariants[0] || null;
        
        const modalPrice = Number(activeVar?.price ?? selectedProductDetail.price ?? 0);
        const modalMrp = Number(activeVar?.mrp ?? selectedProductDetail.mrp ?? 0);
        const modalHasMrp = modalMrp > modalPrice;
        const modalDiscountPct = modalHasMrp ? Math.round(((modalMrp - modalPrice) / modalMrp) * 100) : 0;
        const allModalImages = getProductImages(selectedProductDetail);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-3 text-xs font-sans">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-orange-100 p-5 space-y-4 relative flex flex-col">
              
              {/* Header row */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <button 
                  onClick={() => setSelectedProductDetail(null)}
                  className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition"
                >
                  <ArrowLeft size={16} className="stroke-[2.5]" />
                </button>
                <h3 className="font-black text-slate-900 text-sm tracking-tight">Product Details</h3>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                  <Heart size={15} className="fill-rose-500" />
                </div>
              </div>

              {/* Main Preview Image Container */}
              <div className="w-full h-48 bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center p-3 border border-orange-100 relative shadow-inner">
                {modalDiscountPct > 0 && (
                  <div className="absolute top-3 left-3 bg-orange-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-xs z-10">
                    {modalDiscountPct}% OFF
                  </div>
                )}
                <img 
                  src={modalActiveImage || allModalImages[0]} 
                  alt={selectedProductDetail.name} 
                  className="w-full h-full object-contain" 
                />
              </div>

              {/* Thumbnails Row */}
              {allModalImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {allModalImages.map((imgSrc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setModalActiveImage(imgSrc)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer bg-stone-50 flex items-center justify-center p-1 ${
                        modalActiveImage === imgSrc ? 'border-orange-600 ring-2 ring-orange-500/20' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgSrc} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Product Info Block */}
              <div className="space-y-1.5 pt-1">
                <h2 className="font-black text-slate-900 text-sm leading-tight">{selectedProductDetail.name}</h2>
                <div className="flex items-center gap-1.5 text-stone-500 font-bold text-xs">
                  <div className="flex items-center text-amber-500">
                    <Star size={13} className="fill-amber-400" />
                    <Star size={13} className="fill-amber-400" />
                    <Star size={13} className="fill-amber-400" />
                    <Star size={13} className="fill-amber-400" />
                    <Star size={13} className="text-stone-300" />
                  </div>
                  <span>4.0 (1 reviews)</span>
                </div>

                <div className="flex items-baseline gap-2.5 pt-1">
                  <span className="font-black text-slate-900 text-lg">₹{modalPrice.toFixed(0)}</span>
                  {modalHasMrp && (
                    <span className="text-xs text-stone-400 line-through font-bold">₹{modalMrp.toFixed(0)}</span>
                  )}
                  {modalDiscountPct > 0 && (
                    <span className="bg-orange-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                      {modalDiscountPct}% OFF
                    </span>
                  )}
                </div>
              </div>

              {/* Variant Selector */}
              {modalVariants.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-wider">Select Variant / Unit</label>
                  <div className="flex flex-wrap gap-2">
                    {modalVariants.map((v, vIdx) => {
                      const vKey = v.id || v.unit_label || v.label || vIdx;
                      const vLabel = v.unit_label || v.label || `Option ${vIdx + 1}`;
                      const isSelected = modalSelectedVariantKey === vKey;

                      return (
                        <button
                          key={vKey}
                          onClick={() => setModalSelectedVariantKey(vKey)}
                          className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer border ${
                            isSelected 
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-orange-600 shadow-sm' 
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {vLabel} • ₹{v.price}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedProductDetail.description && (
                <div className="space-y-1 pt-2 border-t border-stone-100">
                  <h4 className="font-black text-stone-700 text-[10px] uppercase tracking-wider">Description</h4>
                  <p className="text-stone-500 font-medium leading-relaxed text-xs line-clamp-3">
                    {selectedProductDetail.description}
                  </p>
                </div>
              )}

              {/* Bottom Action Row */}
              <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50 h-10 shrink-0">
                  <button 
                    onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                    className="px-2.5 h-full hover:bg-stone-200 text-stone-700 font-black transition cursor-pointer flex items-center justify-center"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="px-2.5 font-black text-xs text-stone-900">{modalQuantity}</span>
                  <button 
                    onClick={() => setModalQuantity(prev => prev + 1)}
                    className="px-2.5 h-full hover:bg-stone-200 text-stone-700 font-black transition cursor-pointer flex items-center justify-center"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                <button 
                  onClick={(e) => {
                    addToCart(selectedProductDetail, activeVar, modalQuantity, e);
                    setSelectedProductDetail(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black h-10 rounded-xl text-xs transition cursor-pointer shadow-md shadow-orange-600/20 active:scale-95 uppercase tracking-wider flex items-center justify-between px-4"
                >
                  <span>Add To Cart</span>
                  <span>₹{(modalPrice * modalQuantity).toFixed(0)}</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Global Bottom Navigation Bar with Wishlist Count Badge */}
      <PortalBottomNav 
        totalItemsCount={totalItemsCount}
        totalPrice={cartTotal}
        wishlistCount={wishlistCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart Drawer Component */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        totalItemsCount={totalItemsCount}
        session={session}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        handleSelectAddress={handleSelectAddress}
        showAddAddressBox={showAddAddressBox}
        setShowAddAddressBox={setShowAddAddressBox}
        newAddressForm={newAddressForm}
        setNewAddressForm={setNewAddressForm}
        detectCustomerLocation={() => {}}
        handleAddAddress={() => {}}
        handleDeleteAddress={() => {}}
        updateQuantity={() => {}}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        handleApplyCoupon={handleApplyCoupon}
        removeCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
        cartSubtotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
        discountAmount={discountAmount}
        selectedAddressDistance={selectedAddressDistance}
        deliveryFee={deliveryFee}
        cartTotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - discountAmount + deliveryFee}
        checkingOut={checkingOut}
        handleCheckout={handleCheckout}
        navigate={navigate}
        addToCart={() => {}}
      />

    </div>
  );
}