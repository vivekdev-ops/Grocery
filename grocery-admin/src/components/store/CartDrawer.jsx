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
  Zap,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Trash2
} from 'lucide-react';

import { Link } from 'react-router-dom';

import CollapsedAddressSelector from '../CollapsedAddressSelector';

import { supabase } from '../../supabaseClient';

import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */

function StepBadge({ number, label, active, done }) {
  return (
    <div
      className={`flex items-center gap-2.5 ${
        active || done ? '' : 'opacity-40'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${
          done
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
            : active
              ? 'bg-emerald-100 text-emerald-800 ring-4 ring-emerald-500/20 shadow-xs'
              : 'bg-stone-100 text-stone-500'
        }`}
      >
        {done ? <CheckCircle size={14} /> : number}
      </div>

      <span
        className={`text-xs font-black uppercase tracking-wider ${
          active
            ? 'text-stone-900'
            : done
              ? 'text-emerald-800'
              : 'text-stone-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COUPON CHIP
───────────────────────────────────────────── */

function CouponChip({ coupon, onApply }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-200/80 rounded-2xl gap-3 hover:border-emerald-400 transition-all shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white">
          <Tag size={15} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-xs text-stone-900 uppercase tracking-wider">
              {coupon.code}
            </span>

            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              {coupon.discount_type === 'percentage'
                ? `${coupon.discount_value}% OFF`
                : `₹${coupon.discount_value} OFF`}
            </span>
          </div>

          <p className="text-[10px] text-stone-500 truncate mt-0.5 font-medium">
            {coupon.min_order_value
              ? `Min order ₹${coupon.min_order_value}`
              : 'No minimum order'}{' '}
            •{' '}
            {coupon.usage_limit_type === 'one_time'
              ? 'One-time use'
              : 'Multi-use offer'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(coupon.code)}
        className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
      >
        Apply
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CART ITEM HELPERS
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

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

  const safeCart = Array.isArray(cart) ? cart : [];
  const safeAddresses = Array.isArray(savedAddresses) ? savedAddresses : [];
  const safeDeliveryRules = Array.isArray(deliveryRules) ? deliveryRules : [];

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

      if (error) {
        console.error('Failed to load coupons:', error);
        return;
      }

      if (data) {
        const validCoupons = data.filter(
          (coupon) => !coupon.expiry_date || new Date(coupon.expiry_date) >= new Date()
        );
        setAvailableCoupons(validCoupons);
      }
    } catch (error) {
      console.error('Unexpected coupon error:', error);
    }
  };

  if (!isOpen) return null;

  const freeDeliveryRule = safeDeliveryRules
    .filter((rule) => Number(rule.delivery_fee) === 0)
    .sort((a, b) => Number(a.min_cart_value || 0) - Number(b.min_cart_value || 0))[0];

  const freeDeliveryThreshold = freeDeliveryRule ? Number(freeDeliveryRule.min_cart_value || 0) : 500;
  const safeCartSubtotal = Number(cartSubtotal) || 0;
  const amountNeeded = Math.max(0, freeDeliveryThreshold - safeCartSubtotal);
  const progressPct = freeDeliveryThreshold > 0 ? Math.min(100, (safeCartSubtotal / freeDeliveryThreshold) * 100) : 100;

  const isCartEmpty = safeCart.length === 0;
  const isAddressMissing = safeAddresses.length === 0 || !selectedAddressId;
  const isCheckoutDisabled = Boolean(checkingOut) || isCartEmpty || isAddressMissing;
  const hasAddress = !isAddressMissing;
  const hasCouponApplied = Boolean(appliedCoupon);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* DRAWER CONTAINER */}
          <motion.div
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[100] flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-stone-100 bg-white/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-2xs">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-stone-900 leading-tight">My Express Cart</h2>
                  <p className="text-[11px] text-stone-400 font-medium">
                    {totalItemsCount || 0} item{Number(totalItemsCount) !== 1 ? 's' : ''} in bag
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-2xl flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto scrollbar-none p-4 sm:p-6 space-y-6">
              
              {/* FREE DELIVERY PROGRESS BANNER */}
              {!isCartEmpty && freeDeliveryThreshold > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-4 text-white shadow-lg space-y-2.5 border border-emerald-500/20">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Zap size={14} className="text-amber-400 fill-amber-400 animate-bounce" />
                      {amountNeeded > 0 ? (
                        <>Add <span className="text-amber-300">₹{amountNeeded.toFixed(0)}</span> more for Free Delivery!</>
                      ) : (
                        <span className="text-emerald-300">🎉 Free Delivery Unlocked!</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full">
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* STEP 1: REVIEW ITEMS */}
              <div className="space-y-4">
                <StepBadge number="1" label="Review Items & Quantities" active done={!isCartEmpty} />

                {isCartEmpty ? (
                  <div className="bg-stone-50/80 rounded-3xl p-12 text-center border border-dashed border-stone-200 space-y-3">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                      <ShoppingCart size={28} />
                    </div>
                    <div>
                      <p className="font-black text-stone-900 text-base">Your cart is completely empty</p>
                      <p className="text-xs text-stone-400 mt-0.5 font-medium">Explore categories and add products to start shopping.</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    <div className="space-y-3">
                      {safeCart.map((item) => {
                        const uniqueKey = getCartItemKey(item);
                        if (!uniqueKey) return null;

                        const itemImage = getCartItemImage(item);
                        const itemTitle = item?.title || item?.product?.name || item?.name || 'Product Item';
                        const itemOfferPrice = getCartItemPrice(item);
                        const itemMrp = getCartItemMrp(item, itemOfferPrice);
                        const itemStock = getCartItemStock(item);
                        const variantLabel = getCartVariantLabel(item);
                        const quantity = Math.max(1, Number(item?.quantity || 1));
                        const hasMrp = itemMrp > itemOfferPrice;
                        const discountPercent = hasMrp && itemMrp > 0 ? Math.round(((itemMrp - itemOfferPrice) / itemMrp) * 100) : 0;
                        const isOutOfStock = itemStock <= 0;
                        const canIncrease = !isOutOfStock && quantity < itemStock;
                        const isLowStock = !isOutOfStock && itemStock > 0 && itemStock <= 5;

                        return (
                          <motion.div
                            key={uniqueKey}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-center gap-4 bg-white p-4 rounded-3xl border shadow-xs transition-all ${
                              isOutOfStock ? 'border-rose-200 bg-rose-50/20' : 'border-stone-200/80 hover:border-emerald-300'
                            }`}
                          >
                            {/* PRODUCT IMAGE */}
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={itemTitle}
                                className="w-16 h-16 rounded-2xl object-contain bg-stone-50 shrink-0 border border-stone-100 p-1"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 text-emerald-600">
                                <Package size={22} />
                              </div>
                            )}

                            {/* DETAILS */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="font-black text-xs sm:text-sm text-stone-900 truncate leading-snug">
                                {itemTitle}
                              </p>

                              {variantLabel && (
                                <span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                                  {variantLabel}
                                </span>
                              )}

                              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                <span className="text-xs sm:text-sm font-black text-stone-900">
                                  ₹{itemOfferPrice.toFixed(0)}
                                </span>

                                {hasMrp && (
                                  <>
                                    <span className="text-[10px] text-stone-400 line-through font-bold">
                                      ₹{itemMrp.toFixed(0)}
                                    </span>
                                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                      {discountPercent}% OFF
                                    </span>
                                  </>
                                )}
                              </div>

                              {isOutOfStock ? (
                                <p className="text-[10px] font-black text-rose-600">Out of stock</p>
                              ) : isLowStock ? (
                                <p className="text-[10px] font-bold text-amber-600">Only {itemStock} left in stock</p>
                              ) : null}
                            </div>

                            {/* QUANTITY & LINE TOTAL */}
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className={`flex items-center gap-1 rounded-2xl p-1 border ${
                                isOutOfStock ? 'bg-rose-100 border-rose-200' : 'bg-stone-50 border-stone-200'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(uniqueKey, -1)}
                                  disabled={isOutOfStock}
                                  className="w-7 h-7 hover:bg-white disabled:hover:bg-transparent rounded-xl flex items-center justify-center text-stone-600 disabled:text-stone-300 transition cursor-pointer"
                                  aria-label={`Decrease quantity of ${itemTitle}`}
                                >
                                  <Minus size={12} />
                                </button>

                                <span className="text-xs font-black w-6 text-center text-stone-900">
                                  {quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => updateQuantity(uniqueKey, 1)}
                                  disabled={!canIncrease}
                                  className="w-7 h-7 hover:bg-white disabled:hover:bg-transparent rounded-xl flex items-center justify-center text-stone-600 disabled:text-stone-300 transition cursor-pointer"
                                  aria-label={`Increase quantity of ${itemTitle}`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <span className="text-xs sm:text-sm font-black text-emerald-700">
                                ₹{(itemOfferPrice * quantity).toFixed(0)}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AnimatePresence>
                )}
              </div>

              {/* STEP 2: DELIVERY ADDRESS */}
              {!isCartEmpty && session && (
                <>
                  <div className="border-t border-stone-100 my-2" />

                  <div className="space-y-4">
                    <StepBadge number="2" label="Select Delivery Address" active done={hasAddress} />

                    <div className="bg-stone-50/80 p-4 rounded-3xl border border-stone-200/80">
                      <CollapsedAddressSelector
                        addresses={safeAddresses}
                        selectedAddressId={selectedAddressId}
                        onSelectAddressId={(id) => {
                          const selected = safeAddresses.find((address) => address.id === id);
                          if (selected) {
                            handleSelectAddress(selected);
                          }
                        }}
                        onAddNewAddress={() => setShowAddAddressBox(true)}
                      />
                    </div>

                    {/* ADD ADDRESS FORM BOX */}
                    <AnimatePresence>
                      {showAddAddressBox && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          onSubmit={handleAddAddress}
                          className="overflow-hidden bg-white p-5 rounded-3xl border border-emerald-200 shadow-md space-y-3"
                        >
                          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                            <p className="font-black text-stone-900 text-xs uppercase tracking-wider">Add New Location</p>
                            <button
                              type="button"
                              onClick={() => setShowAddAddressBox(false)}
                              className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Title (Home / Work)"
                              required
                              className="w-full border border-stone-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs font-bold outline-none bg-stone-50/50"
                              value={newAddressForm?.title || ''}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, title: e.target.value })}
                            />
                            <input
                              type="tel"
                              placeholder="Phone Number"
                              required
                              className="w-full border border-stone-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs font-bold outline-none bg-stone-50/50"
                              value={newAddressForm?.phone || ''}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={detectCustomerLocation}
                            className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                          >
                            <MapPin size={14} /> Detect GPS Coordinates Automatically
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="House / Flat No. *"
                              required
                              className="w-full border border-stone-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs font-bold outline-none bg-stone-50/50"
                              value={newAddressForm?.house_no || ''}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, house_no: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Ward / Colony Name *"
                              required
                              className="w-full border border-stone-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs font-bold outline-none bg-stone-50/50"
                              value={newAddressForm?.ward_no_name || ''}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, ward_no_name: e.target.value })}
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer transition shadow-lg shadow-emerald-600/20"
                          >
                            Save Address & Proceed
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* STEP 3: PROMO CODE & COUPONS */}
              {!isCartEmpty && session && hasAddress && (
                <>
                  <div className="border-t border-stone-100 my-2" />

                  <div className="space-y-4">
                    <StepBadge number="3" label="Apply Promo Code" active done={hasCouponApplied} />

                    {appliedCoupon ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 p-4 rounded-3xl shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-md text-white">
                            <Tag size={16} />
                          </div>
                          <div>
                            <p className="font-mono font-black text-emerald-900 text-sm tracking-wider uppercase">
                              {appliedCoupon.code}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                              Discount successfully applied ✓
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-xs font-black text-rose-600 hover:text-rose-800 hover:underline cursor-pointer transition bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs"
                        >
                          Remove
                        </button>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter promo code (e.g. SAVE20)"
                            className="flex-1 border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 px-4 py-3 rounded-2xl text-xs font-black uppercase outline-none bg-stone-50 text-stone-900 transition shadow-2xs"
                            value={couponInput || ''}
                            onChange={(e) => setCouponInput(e.target.value)}
                          />

                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition shadow-md active:scale-95"
                          >
                            Apply
                          </button>
                        </div>

                        {availableCoupons.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              Available Offers & Coupons
                            </p>

                            <div className="space-y-2 max-h-44 overflow-y-auto scrollbar-none pr-1">
                              {availableCoupons.map((coupon) => (
                                <CouponChip
                                  key={coupon.id}
                                  coupon={coupon}
                                  onApply={(code) => setCouponInput(code)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* LOGIN NUDGE */}
              {!isCartEmpty && !session && (
                <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl text-center space-y-3 shadow-sm">
                  <p className="text-xs font-black text-amber-900 leading-snug">
                    Sign in to select saved addresses, unlock coupons, and complete checkout.
                  </p>

                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md shadow-amber-600/20 transition cursor-pointer"
                  >
                    Login to Continue <ArrowRight size={14} />
                  </Link>
                </div>
              )}

            </div>

            {/* FOOTER SUMMARY & CHECKOUT */}
            <div className="border-t border-stone-100 bg-white p-6 space-y-4 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.08)] shrink-0">
              
              {/* BREAKDOWN */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-stone-800">₹{safeCartSubtotal.toFixed(2)}</span>
                </div>

                {Number(discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount Applied ({appliedCoupon?.code})</span>
                    <span>−₹{Number(discountAmount).toFixed(2)}</span>
                  </div>
                )}

                {selectedAddressDistance !== null && selectedAddressDistance !== undefined && !isCartEmpty && (
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>Store Delivery Distance</span>
                    <span className="font-bold text-stone-800">{Number(selectedAddressDistance).toFixed(2)} km</span>
                  </div>
                )}

                {!isCartEmpty && (
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>Delivery Charge</span>
                    {Number(deliveryFee) === 0 ? (
                      <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">FREE</span>
                    ) : (
                      <span className="font-bold text-stone-800">₹{Number(deliveryFee || 0).toFixed(2)}</span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-stone-100 text-sm font-black">
                  <span className="text-stone-900">Grand Total</span>
                  <motion.span
                    key={cartTotal}
                    initial={{ scale: 1.1, color: '#059669' }}
                    animate={{ scale: 1, color: '#047857' }}
                    transition={{ duration: 0.3 }}
                    className="text-lg font-black text-emerald-700"
                  >
                    ₹{!isCartEmpty ? Number(cartTotal || 0).toFixed(2) : '0.00'}
                  </motion.span>
                </div>
              </div>

              {/* VALIDATION WARNING HINT */}
              <AnimatePresence>
                {isCartEmpty ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-rose-600 font-bold text-center"
                  >
                    Please add items to your cart to proceed.
                  </motion.p>
                ) : isAddressMissing && session ? (
                  <motion.p
                    key="addr"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-amber-700 font-bold text-center"
                  >
                    Please select or add a delivery address to continue.
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* CHECKOUT BUTTON */}
              <motion.button
                whileTap={{ scale: 0.98 }}
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
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer"
              >
                <ShieldCheck size={18} />

                {checkingOut
                  ? 'Processing Order…'
                  : session
                    ? 'Place Secure Order Now'
                    : 'Login to Checkout'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}