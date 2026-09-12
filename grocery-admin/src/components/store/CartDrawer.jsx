// src/components/store/CartDrawer.jsx

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  MapPin,
  X,
  Plus,
  Minus,
  ShieldCheck,
  Tag,
  CheckCircle,
  ArrowRight,
  Banknote,
  Heart,
  ChevronDown,
  Navigation,
  Trash2,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

function getCartItemImage(item) {
  if (!item) return '';
  if (item.image) return item.image;
  if (item.image_url) return item.image_url;
  if (Array.isArray(item.images) && item.images.length > 0) return item.images[0];
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) return item.product.images[0];
  if (Array.isArray(item.product?.gallery) && item.product.gallery.length > 0) return item.product.gallery[0];
  if (item.product?.image_url) return item.product.image_url;
  return '';
}

function getCartVariantLabel(item) {
  if (!item?.variant) return '';
  return item.variant.unit_label || item.variant.label || item.variant.unit || '';
}

function getCartItemPrice(item) {
  if (!item) return 0;
  if (item.variant && item.variant.price != null) return Number(item.variant.price) || 0;
  return Number(item.price) || 0;
}

function getCartItemMrp(item, offerPrice) {
  if (!item) return offerPrice;
  if (item.variant && item.variant.mrp != null) return Number(item.variant.mrp) || offerPrice;
  return Number(item.mrp) || offerPrice;
}

function getCartItemStock(item) {
  if (!item) return 0;
  if (item.variant && item.variant.stock != null) return Number(item.variant.stock) || 0;
  return Number(item.stock) || 0;
}

function getCartItemKey(item) {
  return item?.cartItemId || item?.id || item?.product_id || null;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  totalItemsCount,
  session,
  savedAddresses,
  selectedAddressId,
  handleSelectAddress,
  showAddAddressBox,
  setShowAddAddressBox,
  newAddressForm,
  setNewAddressForm,
  detectCustomerLocation,
  handleAddAddress,
  handleDeleteAddress,
  updateQuantity,
  appliedCoupon,
  setAppliedCoupon,
  couponInput,
  setCouponInput,
  handleApplyCoupon,
  removeCoupon,
  cartSubtotal,
  discountAmount,
  selectedAddressDistance,
  deliveryFee,
  cartTotal,
  checkingOut,
  handleCheckout,
  navigate,
  deliveryRules = [],
  addToCart
}) {
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  const safeCart = Array.isArray(cart) ? cart : [];
  const safeAddresses = Array.isArray(savedAddresses) ? savedAddresses : [];
  const selectedAddress = safeAddresses.find((a) => a.id === selectedAddressId) || safeAddresses[0];

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCoupons();
    }
  }, [isOpen]);

  const fetchAvailableCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true);

      if (error) return;

      if (data) {
        const validCoupons = data.filter(
          (coupon) => !coupon.expiry_date || new Date(coupon.expiry_date) >= new Date()
        );
        setAvailableCoupons(validCoupons);
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const safeCartSubtotal = Number(cartSubtotal) || 0;
  const isCartEmpty = safeCart.length === 0;
  const isAddressMissing = safeAddresses.length === 0 || !selectedAddressId;
  const isCheckoutDisabled = Boolean(checkingOut) || isCartEmpty || isAddressMissing;

  const totalMrpSum = safeCart.reduce((sum, item) => {
    const itemOfferPrice = getCartItemPrice(item);
    const itemMrp = getCartItemMrp(item, itemOfferPrice);
    const qty = Number(item?.quantity || 1);
    return sum + (itemMrp * qty);
  }, 0);

  const couponDiscountVal = Number(discountAmount) || 0;
  const totalDiscountFromMrp = Math.max(0, totalMrpSum - safeCartSubtotal);
  const totalCombinedDiscount = totalDiscountFromMrp + couponDiscountVal;
  const finalComputedTotal = Math.max(0, safeCartSubtotal - couponDiscountVal) + Number(deliveryFee || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100]"
            onClick={onClose}
          />

          {/* Drawer Wrapper with Mobile Optimization */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-stone-100 shadow-2xl z-[100] flex flex-col font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MATCHING DARK ORANGE HEADER */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 border-b border-orange-800/30 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-md backdrop-blur-md text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-orange-700 flex items-center justify-center shadow-md shadow-orange-900/20 shrink-0 border border-orange-200">
                  <ShoppingCart size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="font-black text-white text-base md:text-lg tracking-tight">Your Shopping Cart</h2>
                  <p className="text-[11px] text-amber-100 font-bold flex items-center gap-1 mt-0.5 opacity-90">
                    <Sparkles size={12} className="text-amber-300 shrink-0" />
                    <span>{totalItemsCount || 0} items selected</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex w-8 h-8 rounded-full bg-white text-orange-700 font-black text-xs items-center justify-center shadow-xs">
                  KD
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 hover:bg-white hover:text-rose-600 rounded-2xl flex items-center justify-center text-white cursor-pointer transition shadow-xs border border-white/30"
                  title="Close Cart"
                >
                  <X size={18} className="stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* CART ITEMS LIST */}
              {isCartEmpty ? (
                <div className="bg-white rounded-[2rem] p-10 text-center border border-stone-200/80 shadow-xs space-y-3 my-auto">
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-orange-100">
                    <ShoppingCart size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-slate-900 text-sm">Your cart is feeling light</p>
                    <p className="text-xs text-stone-400 font-medium">Explore our store and add fresh groceries to your cart!</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md uppercase tracking-wider transition cursor-pointer inline-block mt-2"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] p-4 border border-stone-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="font-black text-[11px] text-stone-400 uppercase tracking-wider">Basket Items</span>
                    <span className="font-bold text-[11px] text-orange-600">Free Delivery Unlocked ⚡</span>
                  </div>

                  {safeCart.map((item) => {
                    const uniqueKey = getCartItemKey(item);
                    if (!uniqueKey) return null;

                    const itemImage = getCartItemImage(item);
                    const itemTitle = item?.title || item?.product?.name || item?.name || 'Item';
                    const itemOfferPrice = getCartItemPrice(item);
                    const itemMrp = getCartItemMrp(item, itemOfferPrice);
                    const hasItemMrp = itemMrp > itemOfferPrice;
                    const itemDiscountPct = hasItemMrp ? Math.round(((itemMrp - itemOfferPrice) / itemMrp) * 100) : 0;
                    const itemStock = getCartItemStock(item);
                    const variantLabel = getCartVariantLabel(item);
                    const quantity = Math.max(1, Number(item?.quantity || 1));
                    const isOutOfStock = itemStock <= 0;
                    const canIncrease = !isOutOfStock && quantity < itemStock;

                    return (
                      <div
                        key={uniqueKey}
                        className="flex items-center justify-between gap-3 py-3 border-b border-stone-100 last:border-0 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {itemImage ? (
                            <div className="w-16 h-16 rounded-2xl bg-stone-50 shrink-0 border border-stone-200/60 p-1 overflow-hidden flex items-center justify-center">
                              <img src={itemImage} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 text-orange-600 border border-orange-100">
                              <ShoppingCart size={22} />
                            </div>
                          )}

                          <div className="min-w-0 space-y-0.5">
                            <p className="font-black text-slate-900 text-xs line-clamp-1">
                              {itemTitle}
                            </p>
                            <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md inline-block">
                              {variantLabel || '1 unit'}
                            </span>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="font-black text-slate-900 text-xs">
                                ₹{itemOfferPrice.toFixed(0)}
                              </span>
                              {hasItemMrp && (
                                <span className="text-[10px] text-stone-400 line-through font-bold">
                                  ₹{itemMrp.toFixed(0)}
                                </span>
                              )}
                              {itemDiscountPct > 0 && (
                                <span className="text-[9px] text-orange-700 font-black bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                  {itemDiscountPct}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* QUANTITY CONTROLS */}
                        <div className="flex items-center bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl overflow-hidden h-9 shadow-sm shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, -1)}
                            disabled={isOutOfStock}
                            className="px-3 h-full hover:bg-orange-700 font-bold text-sm flex items-center justify-center cursor-pointer transition"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-2 font-black text-xs text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, 1)}
                            disabled={!canIncrease}
                            className="px-3 h-full hover:bg-orange-700 font-bold text-sm flex items-center justify-center cursor-pointer transition"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BEFORE YOU CHECKOUT SECTION */}
              {!isCartEmpty && safeCart.length > 0 && typeof addToCart === 'function' && (
                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 text-xs tracking-tight uppercase px-1">Before you Checkout</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3.5 rounded-[2rem] border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-2">
                      <div className="aspect-square bg-stone-50 rounded-2xl p-2 flex items-center justify-center relative">
                        <img src={getCartItemImage(safeCart[0])} alt="" className="w-full h-full object-contain" />
                        <Heart size={15} className="absolute top-2.5 right-2.5 text-stone-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{safeCart[0]?.title || 'Product'}</h4>
                        <p className="text-[10px] text-stone-400 font-bold">{getCartVariantLabel(safeCart[0]) || '1 unit'}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-black text-xs text-slate-900">₹{getCartItemPrice(safeCart[0])}</span>
                        <button 
                          type="button"
                          onClick={() => addToCart(safeCart[0]?.product || safeCart[0])}
                          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-3 py-1.5 rounded-xl font-black text-[10px] shadow-xs cursor-pointer transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COUPONS & PROMO CODE SECTION */}
              {!isCartEmpty && session && (
                <div className="bg-white rounded-[2rem] p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-xs flex items-center gap-2">
                      <Tag size={15} className="text-orange-600" /> Offers & Benefits
                    </h3>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-300 p-3.5 rounded-2xl shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-xs">
                          %
                        </div>
                        <div>
                          <span className="font-mono font-black text-xs text-orange-950 uppercase block tracking-wider">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[10px] text-orange-700 font-bold block">
                            Coupon applied successfully!
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[10px] font-black text-rose-600 bg-white px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition cursor-pointer shadow-2xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Promo Code"
                          className="flex-1 border border-stone-200 px-4 py-3 rounded-2xl text-xs font-black uppercase outline-none bg-stone-50 focus:border-orange-500 focus:bg-white transition"
                          value={couponInput || ''}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase cursor-pointer transition shadow-md"
                        >
                          Apply
                        </button>
                      </div>

                      {availableCoupons.length > 0 && (
                        <div className="space-y-2 pt-1 max-h-44 overflow-y-auto scrollbar-none pr-1">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200/80 rounded-2xl gap-2 hover:border-orange-400 hover:bg-orange-50/25 transition shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                                  %
                                </div>
                                <div className="min-w-0">
                                  <span className="font-mono font-black text-xs text-stone-900 uppercase block truncate">
                                    {coupon.code}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-medium block truncate">
                                    {coupon.discount_type === 'percentage'
                                      ? `${coupon.discount_value}% OFF on orders above ₹${coupon.min_order_value || 0}`
                                      : `₹${coupon.discount_value} flat discount`}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setCouponInput(coupon.code);
                                }}
                                className="shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl cursor-pointer transition shadow-sm"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PRICE DETAILS SECTION */}
              {!isCartEmpty && (
                <div className="bg-white rounded-[2rem] p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3.5">
                  <h3 className="font-black text-slate-900 text-xs tracking-tight uppercase">Bill Summary</h3>
                  <div className="space-y-2.5 text-stone-700 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-stone-500">Item Total (MRP)</span>
                      <span className="font-extrabold text-stone-900">₹{totalMrpSum.toFixed(0)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-500">Product Discount</span>
                      <span className="font-extrabold text-orange-600">-₹{totalCombinedDiscount.toFixed(0)}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between items-center bg-orange-50 px-3 py-2 rounded-2xl border border-orange-200 text-orange-900">
                        <span className="font-bold flex items-center gap-1.5">
                          <Tag size={12} className="text-orange-600" /> Coupon ({appliedCoupon.code})
                        </span>
                        <span className="font-black">-{couponDiscountVal > 0 ? `₹${couponDiscountVal.toFixed(0)}` : 'Applied'}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-500">Delivery Fee</span>
                      <span className="font-extrabold text-orange-600">FREE</span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-stone-100 text-sm font-black text-stone-950">
                      <span>To Pay</span>
                      <span className="text-orange-600 text-base font-black">
                        ₹{finalComputedTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERING TO / ADDRESS CARD */}
              {!isCartEmpty && (
                <div className="bg-white rounded-[2rem] p-4 sm:p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 border border-orange-100 shadow-2xs">
                      <MapPin size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-xs truncate">
                          Delivering to {selectedAddress?.title || 'Home'}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium truncate max-w-[200px] sm:max-w-xs mt-0.5">
                        {selectedAddress?.address || 'Select delivery address'}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 border border-orange-200"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* CANCELLATION POLICY */}
              {!isCartEmpty && (
                <div className="bg-white rounded-[2rem] p-4 border border-stone-200/80 shadow-xs space-y-1">
                  <h4 className="font-black text-stone-900 text-xs">Cancellation Policy</h4>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-medium">
                    Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided.
                  </p>
                </div>
              )}

              {/* LOGIN NUDGE IF NOT LOGGED IN */}
              {!isCartEmpty && !session && (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-[2rem] text-center space-y-3 shadow-xs">
                  <p className="font-bold text-amber-900 text-xs">
                    Please log in to place your order securely.
                  </p>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-black cursor-pointer shadow-sm text-xs uppercase tracking-wider"
                  >
                    Login to Checkout <ArrowRight size={14} />
                  </Link>
                </div>
              )}

            </div>

            {/* FIXED BOTTOM FOOTER BAR WITH 'PAY ON DELIVERY' */}
            {!isCartEmpty && (
              <div className="border-t border-stone-200/80 bg-white p-4 space-y-3 shrink-0 shadow-2xl">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Payment Mode</span>
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1">
                      <Banknote size={14} className="text-orange-600" /> Pay on Delivery (Cash / UPI)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    session
                      ? handleCheckout
                      : () => {
                          onClose();
                          navigate('/login');
                        }
                  }
                  disabled={session ? isCheckoutDisabled : false}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:bg-stone-300 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition flex items-center justify-between uppercase tracking-wider cursor-pointer text-xs"
                >
                  <span className="bg-orange-700 px-3.5 py-1.5 rounded-xl font-black text-sm font-mono shadow-inner">
                    ₹{finalComputedTotal.toFixed(0)}
                  </span>
                  <span className="flex items-center gap-2">
                    {checkingOut ? 'Placing Order...' : session ? 'Place Order Now' : 'Login to Checkout'} <ArrowRight size={16} className="stroke-[3]" />
                  </span>
                </button>
              </div>
            )}
          </motion.div>

          {/* SELECT AN ADDRESS / ADD NEW ADDRESS BOTTOM SHEET POPUP */}
          <AnimatePresence>
            {isAddressModalOpen && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end justify-center z-[200] font-sans">
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 250 }}
                  className="bg-white rounded-t-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 max-h-[85vh] relative z-[210]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto" />

                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <h3 className="font-black text-slate-900 text-base">
                      {isAddingNewAddress ? 'Add New Address' : 'Select Delivery Address'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (isAddingNewAddress) {
                          setIsAddingNewAddress(false);
                        } else {
                          setIsAddressModalOpen(false);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {isAddingNewAddress ? (
                    /* ADD NEW ADDRESS FORM */
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleAddAddress(e);
                        setIsAddingNewAddress(false);
                      }} 
                      className="space-y-3 pb-2 text-xs"
                    >
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase text-stone-400">Address Title (Required)</label>
                        <select
                          required
                          className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none font-bold cursor-pointer"
                          value={newAddressForm?.title || 'Home'}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, title: e.target.value })}
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Shop">Shop</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-stone-400">House No. / Flat (Required)</label>
                          <input
                            type="text"
                            required
                            placeholder="Flat/House No"
                            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none font-bold"
                            value={newAddressForm?.house_no || ''}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, house_no: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-stone-400">Locality / Area (Required)</label>
                          <input
                            type="text"
                            required
                            placeholder="Area / Colony"
                            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none font-bold"
                            value={newAddressForm?.ward_no_name || ''}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, ward_no_name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-stone-400">City</label>
                          <input
                            type="text"
                            disabled
                            value="Harraiya"
                            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-100 text-stone-500 font-bold cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-stone-400">District</label>
                          <input
                            type="text"
                            disabled
                            value="Basti"
                            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-100 text-stone-500 font-bold cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-stone-400">State</label>
                          <input
                            type="text"
                            disabled
                            value="Uttar Pradesh"
                            className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-100 text-stone-500 font-bold cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase text-stone-400">Phone Number (Required)</label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          className="w-full border border-stone-200 p-3 rounded-2xl text-xs bg-stone-50 outline-none font-bold"
                          value={newAddressForm?.phone || ''}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={detectCustomerLocation}
                        className="w-full bg-orange-50 border border-orange-200 text-orange-800 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Navigation size={14} /> Auto-detect GPS Location
                      </button>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(false)}
                          className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3.5 rounded-2xl font-black text-xs uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-600/20"
                        >
                          Save Address
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* ADDRESS CARDS LIST */
                    <>
                      <div className="space-y-3 max-h-[45vh] overflow-y-auto scrollbar-none">
                        {safeAddresses.length === 0 ? (
                          <p className="text-xs text-stone-400 text-center py-6">No saved addresses found.</p>
                        ) : (
                          safeAddresses.map((addr) => {
                            const isSelected = addr.id === selectedAddressId;
                            return (
                              <div
                                key={addr.id}
                                onClick={() => {
                                  handleSelectAddress(addr);
                                  setIsAddressModalOpen(false);
                                }}
                                className={`p-4 rounded-3xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                                  isSelected 
                                    ? 'border-orange-600 bg-orange-50/20 shadow-md ring-2 ring-orange-500/10' 
                                    : 'border-stone-200/80 bg-white hover:border-stone-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="pt-0.5 shrink-0">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-300 bg-transparent'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{addr.title}</h4>
                                    <p className="text-stone-500 text-[11px] font-medium leading-relaxed mt-0.5">{addr.address}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add New Address Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewAddressForm(prev => ({
                            ...prev,
                            title: 'Home',
                            city: 'Harraiya',
                            district: 'Basti',
                            state: 'Uttar Pradesh'
                          }));
                          setIsAddingNewAddress(true);
                        }}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition cursor-pointer"
                      >
                        <Plus size={18} className="stroke-[3]" /> Add New Address
                      </button>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}