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
  Trash2
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
  deliveryRules = []
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-[100]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-stone-50 shadow-2xl z-[100] flex flex-col font-sans text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-stone-200/80 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-700 cursor-pointer transition"
                >
                  <X size={16} />
                </button>
                <h2 className="font-black text-slate-900 text-base tracking-tight">Checkout</h2>
              </div>
              <span className="text-[11px] font-extrabold text-stone-500">{totalItemsCount || 0} items</span>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* CART ITEMS LIST */}
              {isCartEmpty ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs space-y-2">
                  <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto">
                    <ShoppingCart size={22} />
                  </div>
                  <p className="font-black text-stone-800 text-sm">Your cart is empty</p>
                  <p className="text-xs text-stone-400">Add items from the store to checkout.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
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
                        className="flex items-center justify-between gap-3 py-3 border-b border-stone-100 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt=""
                              className="w-14 h-14 rounded-2xl object-contain bg-stone-50 shrink-0 border border-stone-100 p-1"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                              <ShoppingCart size={20} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs truncate">
                              {itemTitle}
                            </p>
                            <span className="text-[10px] font-bold text-stone-400 block mt-0.5">
                              {variantLabel || '1 unit'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-black text-slate-900 text-xs">
                                ₹{itemOfferPrice.toFixed(0)}
                              </span>
                              {hasItemMrp && (
                                <span className="text-[10px] text-stone-400 line-through font-bold">
                                  ₹{itemMrp.toFixed(0)}
                                </span>
                              )}
                              {itemDiscountPct > 0 && (
                                <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-1 py-0.2 rounded">
                                  {itemDiscountPct}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* QUANTITY CONTROLS */}
                        <div className="flex items-center border border-emerald-500 rounded-2xl overflow-hidden bg-white h-9 shrink-0 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, -1)}
                            disabled={isOutOfStock}
                            className="px-3 h-full text-emerald-500 hover:bg-emerald-50 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-2 font-black text-xs text-slate-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, 1)}
                            disabled={!canIncrease}
                            className="px-3 h-full text-emerald-500 hover:bg-emerald-50 font-bold text-xs flex items-center justify-center cursor-pointer"
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
              {!isCartEmpty && (
                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 text-sm tracking-tight px-1">Before you Checkout</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.isArray(safeCart) && safeCart.length > 0 && (
                      <div className="bg-white p-3.5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-2">
                        <div className="aspect-square bg-stone-50 rounded-2xl p-2 flex items-center justify-center relative">
                          <img src={getCartItemImage(safeCart[0])} alt="" className="w-full h-full object-contain" />
                          <Heart size={16} className="absolute top-2.5 right-2.5 text-stone-400" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{safeCart[0]?.title || 'Product'}</h4>
                          <p className="text-[10px] text-stone-400 font-bold">{getCartVariantLabel(safeCart[0]) || '500 ml'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-xs text-slate-900">₹{getCartItemPrice(safeCart[0])}</span>
                            <span className="text-[9px] text-stone-400 line-through">₹{getCartItemMrp(safeCart[0], getCartItemPrice(safeCart[0])) + 2}</span>
                          </div>
                          <button 
                            onClick={() => addToCart(safeCart[0]?.product || safeCart[0])}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-extrabold text-[10px] shadow-xs cursor-pointer transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COUPONS & PROMO CODE SECTION */}
              {!isCartEmpty && session && (
                <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-xs flex items-center gap-2">
                      <Tag size={14} className="text-emerald-500" /> APPLY COUPON
                    </h3>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-3 rounded-2xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-xs">
                          %
                        </div>
                        <div>
                          <span className="font-mono font-black text-xs text-emerald-950 uppercase block">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold block">
                            Coupon applied successfully!
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[10px] font-black text-rose-600 bg-white px-2.5 py-1 rounded-xl border border-rose-200 hover:bg-rose-50 transition cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Promo Code"
                          className="flex-1 border border-stone-200 px-3.5 py-2.5 rounded-2xl text-xs font-black uppercase outline-none bg-stone-50 focus:border-emerald-500"
                          value={couponInput || ''}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase cursor-pointer transition shadow-xs"
                        >
                          Apply
                        </button>
                      </div>

                      {availableCoupons.length > 0 && (
                        <div className="space-y-2 pt-1 max-h-40 overflow-y-auto scrollbar-none">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200/80 rounded-2xl gap-2 hover:border-emerald-300 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0">
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
                                className="shrink-0 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-[10px] font-black px-3 py-1.5 rounded-xl cursor-pointer transition"
                              >
                                Use Code
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
                <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
                  <div className="space-y-2.5 text-stone-700 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-stone-500">Item Total</span>
                      <span className="font-extrabold text-stone-900">₹{totalMrpSum.toFixed(0)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-500">Discount</span>
                      <span className="font-extrabold text-emerald-600">-₹{totalCombinedDiscount.toFixed(0)}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-emerald-900">
                        <span className="font-bold flex items-center gap-1.5">
                          <Tag size={12} className="text-emerald-600" /> Applied Coupon ({appliedCoupon.code})
                        </span>
                        <span className="font-black">-{couponDiscountVal > 0 ? `₹${couponDiscountVal.toFixed(0)}` : 'Applied'}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-500">Delivery Free</span>
                      <span className="font-extrabold text-emerald-500">Free</span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-stone-100 text-sm font-black text-stone-950">
                      <span>Grand Total</span>
                      <span className="text-slate-900 text-base">
                        ₹{finalComputedTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERING TO / ADDRESS CARD */}
              {!isCartEmpty && (
                <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-xs truncate">
                          Delivering to {selectedAddress?.title || 'Home'}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-medium truncate max-w-[180px] mt-0.5">
                        {selectedAddress?.address || 'Select delivery address'}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-emerald-500 font-black text-xs hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* CANCELLATION POLICY */}
              {!isCartEmpty && (
                <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-1">
                  <h4 className="font-black text-stone-900 text-xs">Cancellation Policy</h4>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-medium">
                    Not happy with quality? Reject items or the whole order at doorstep.
                  </p>
                </div>
              )}

              {/* LOGIN NUDGE IF NOT LOGGED IN */}
              {!isCartEmpty && !session && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-2 shadow-xs">
                  <p className="font-bold text-amber-900 text-xs">
                    Sign in to complete your quick order.
                  </p>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 bg-amber-600 text-white px-5 py-2 rounded-xl font-black cursor-pointer shadow-xs text-xs"
                  >
                    Login <ArrowRight size={12} />
                  </Link>
                </div>
              )}

            </div>

            {/* FIXED BOTTOM FOOTER BAR WITH 'PAY ON DELIVERY' */}
            {!isCartEmpty && (
              <div className="border-t border-stone-200/80 bg-white p-4 space-y-3 shrink-0 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Pay Using</span>
                    <span className="font-black text-xs text-slate-900">Pay on Delivery</span>
                  </div>
                  <ChevronDown size={16} className="text-stone-400" />
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
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-300 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition flex items-center justify-between uppercase tracking-wider cursor-pointer text-xs"
                >
                  <span className="bg-emerald-600 px-3 py-1.5 rounded-xl font-black text-sm">₹{finalComputedTotal.toFixed(0)}</span>
                  <span className="flex items-center gap-2">
                    {checkingOut ? 'Processing...' : session ? 'Place Order' : 'Login to Checkout'} <ArrowRight size={16} className="stroke-[3]" />
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
                      {isAddingNewAddress ? 'Add New Address' : 'Select an Address'}
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
                      className="space-y-3 pb-2"
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
                          <label className="block text-[10px] font-black uppercase text-stone-400">House No. (Required)</label>
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
                          <label className="block text-[10px] font-black uppercase text-stone-400">Locality / Ward (Required)</label>
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
                        className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20"
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
                                    ? 'border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10' 
                                    : 'border-stone-200/80 bg-white hover:border-stone-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="pt-0.5 shrink-0">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300 bg-transparent'
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
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
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