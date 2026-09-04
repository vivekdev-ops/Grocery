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
  CheckCircle
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
      className={`flex items-center gap-2 ${
        active || done ? '' : 'opacity-40'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
          done
            ? 'bg-brand-600 text-white'
            : active
              ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500/30'
              : 'bg-stone-100 text-stone-500'
        }`}
      >
        {done ? <CheckCircle size={13} /> : number}
      </div>

      <span
        className={`text-xs font-black uppercase tracking-wider ${
          active
            ? 'text-stone-900'
            : done
              ? 'text-brand-700'
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
    <div className="flex items-center justify-between p-2.5 bg-brand-50/60 border border-brand-200/60 rounded-xl gap-2 hover:bg-brand-50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
          <Tag size={12} className="text-white" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-black text-[11px] text-stone-900 uppercase">
              {coupon.code}
            </span>

            <span className="text-[9px] font-black text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-full">
              {coupon.discount_type === 'percentage'
                ? `${coupon.discount_value}% OFF`
                : `₹${coupon.discount_value} OFF`}
            </span>
          </div>

          <p className="text-[9px] text-stone-400 truncate mt-0.5">
            {coupon.min_order_value
              ? `Min ₹${coupon.min_order_value}`
              : 'No min order'}{' '}
            •{' '}
            {coupon.usage_limit_type === 'one_time'
              ? 'One-time'
              : 'Multi-use'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(coupon.code)}
        className="shrink-0 bg-brand-700 hover:bg-brand-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition cursor-pointer btn-press"
      >
        Apply
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CART ITEM HELPERS
───────────────────────────────────────────── */

/**
 * Get the image from the current cart item.
 */
function getCartItemImage(item) {
  if (!item) return '';

  if (item.image) {
    return item.image;
  }

  if (item.image_url) {
    return item.image_url;
  }

  if (
    Array.isArray(item.images) &&
    item.images.length > 0
  ) {
    return item.images[0];
  }

  if (
    Array.isArray(item.product?.images) &&
    item.product.images.length > 0
  ) {
    return item.product.images[0];
  }

  if (
    Array.isArray(item.product?.gallery) &&
    item.product.gallery.length > 0
  ) {
    return item.product.gallery[0];
  }

  if (item.product?.image_url) {
    return item.product.image_url;
  }

  return '';
}

/**
 * Get the variant label.
 *
 * Example:
 * 5KG
 * 10KG
 * 1 Litre
 */
function getCartVariantLabel(item) {
  if (!item?.variant) {
    return '';
  }

  return (
    item.variant.unit_label ||
    item.variant.label ||
    item.variant.unit ||
    ''
  );
}

/**
 * IMPORTANT:
 * Price comes from product_variants.price.
 *
 * We deliberately DO NOT use:
 * item.product.price
 * item.product.mrp
 * item.product.stock
 */
function getCartItemPrice(item) {
  if (!item) return 0;

  if (item.variant && item.variant.price != null) {
    return Number(item.variant.price) || 0;
  }

  // Legacy cart compatibility.
  // Cart items created by the updated CustomerStorefront
  // already contain item.price.
  return Number(item.price) || 0;
}

/**
 * MRP comes from product_variants.mrp.
 */
function getCartItemMrp(item, offerPrice) {
  if (!item) {
    return offerPrice;
  }

  if (
    item.variant &&
    item.variant.mrp != null
  ) {
    return Number(item.variant.mrp) || offerPrice;
  }

  // Legacy cart compatibility.
  return Number(item.mrp) || offerPrice;
}

/**
 * Current stock comes from product_variants.stock.
 */
function getCartItemStock(item) {
  if (!item) return 0;

  if (
    item.variant &&
    item.variant.stock != null
  ) {
    return Number(item.variant.stock) || 0;
  }

  // Legacy cart compatibility.
  return Number(item.stock) || 0;
}

/**
 * Get a stable cart key.
 */
function getCartItemKey(item) {
  return (
    item?.cartItemId ||
    item?.id ||
    item?.product_id ||
    null
  );
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

  /* ─────────────────────────────────────────────
     SAFE DATA
  ───────────────────────────────────────────── */

  const safeCart = Array.isArray(cart)
    ? cart
    : [];

  const safeAddresses = Array.isArray(savedAddresses)
    ? savedAddresses
    : [];

  const safeDeliveryRules = Array.isArray(deliveryRules)
    ? deliveryRules
    : [];

  /* ─────────────────────────────────────────────
     FETCH COUPONS
  ───────────────────────────────────────────── */

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
        console.error(
          'Failed to load coupons:',
          error
        );
        return;
      }

      if (data) {
        const validCoupons = data.filter(
          (coupon) =>
            !coupon.expiry_date ||
            new Date(coupon.expiry_date) >= new Date()
        );

        setAvailableCoupons(validCoupons);
      }
    } catch (error) {
      console.error(
        'Unexpected coupon error:',
        error
      );
    }
  };

  /* ─────────────────────────────────────────────
     DO NOT RENDER WHEN CLOSED
  ───────────────────────────────────────────── */

  if (!isOpen) {
    return null;
  }

  /* ─────────────────────────────────────────────
     DELIVERY CALCULATIONS
  ───────────────────────────────────────────── */

  const freeDeliveryRule = safeDeliveryRules
    .filter(
      (rule) =>
        Number(rule.delivery_fee) === 0
    )
    .sort(
      (a, b) =>
        Number(a.min_cart_value || 0) -
        Number(b.min_cart_value || 0)
    )[0];

  const freeDeliveryThreshold =
    freeDeliveryRule
      ? Number(
          freeDeliveryRule.min_cart_value || 0
        )
      : 500;

  const safeCartSubtotal =
    Number(cartSubtotal) || 0;

  const amountNeeded = Math.max(
    0,
    freeDeliveryThreshold -
      safeCartSubtotal
  );

  const progressPct =
    freeDeliveryThreshold > 0
      ? Math.min(
          100,
          (safeCartSubtotal /
            freeDeliveryThreshold) *
            100
        )
      : 100;

  /* ─────────────────────────────────────────────
     CART STATE
  ───────────────────────────────────────────── */

  const isCartEmpty =
    safeCart.length === 0;

  const isAddressMissing =
    safeAddresses.length === 0 ||
    !selectedAddressId;

  const isCheckoutDisabled =
    Boolean(checkingOut) ||
    isCartEmpty ||
    isAddressMissing;

  const hasAddress =
    !isAddressMissing;

  const hasCouponApplied =
    Boolean(appliedCoupon);

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ─────────────────────────────────────
              BACKDROP
          ───────────────────────────────────── */}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* ─────────────────────────────────────
              DRAWER
          ───────────────────────────────────── */}

          <motion.div
            initial={{
              x: '100%',
              opacity: 0.8
            }}
            animate={{
              x: 0,
              opacity: 1
            }}
            exit={{
              x: '100%',
              opacity: 0.8
            }}
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 34
            }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col font-sans"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* ─────────────────────────────────
                HEADER
            ───────────────────────────────── */}

            <div className="h-14 flex items-center justify-between px-4 border-b border-stone-100 bg-white/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart
                    size={16}
                    className="text-brand-700"
                  />
                </div>

                <div>
                  <p className="text-xs font-black text-stone-900 leading-none">
                    My Cart
                  </p>

                  <p className="text-[9px] text-stone-400 mt-0.5">
                    {totalItemsCount || 0}{' '}
                    item
                    {Number(totalItemsCount) !== 1
                      ? 's'
                      : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* ─────────────────────────────────
                SCROLLABLE BODY
            ───────────────────────────────── */}

            <div className="flex-1 overflow-y-auto scrollbar-none">
              {/* ───────────────────────────────
                  FREE DELIVERY PROGRESS
              ─────────────────────────────── */}

              {!isCartEmpty &&
                freeDeliveryThreshold > 0 && (
                  <div className="px-4 pt-3 pb-0">
                    <div className="bg-gradient-to-r from-brand-800 to-brand-900 rounded-2xl p-3 space-y-2">
                      <p className="text-[11px] font-black text-white flex items-center gap-1.5">
                        <Zap
                          size={11}
                          className="text-amber-400 fill-amber-400"
                        />

                        {amountNeeded > 0 ? (
                          <span>
                            Add{' '}
                            <span className="text-amber-400">
                              ₹
                              {amountNeeded.toFixed(
                                0
                              )}
                            </span>{' '}
                            more for FREE
                            delivery!
                          </span>
                        ) : (
                          <span className="text-brand-300">
                            🎉 You qualify for FREE
                            delivery!
                          </span>
                        )}
                      </p>

                      <div className="relative h-1.5 bg-brand-700/60 rounded-full overflow-hidden">
                        <motion.div
                          initial={{
                            width: 0
                          }}
                          animate={{
                            width: `${progressPct}%`
                          }}
                          transition={{
                            duration: 0.6,
                            ease: 'easeOut'
                          }}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-amber-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

              <div className="p-4 space-y-5">
                {/* ─────────────────────────────
                    STEP 1 — ITEMS
                ───────────────────────────── */}

                <div className="space-y-3">
                  <StepBadge
                    number="1"
                    label="Review Items"
                    active
                    done={!isCartEmpty}
                  />

                  {isCartEmpty ? (
                    <div className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100 space-y-2">
                      <ShoppingCart
                        size={28}
                        className="text-stone-300 mx-auto"
                      />

                      <p className="text-xs font-bold text-stone-600">
                        Your cart is empty
                      </p>

                      <p className="text-[10px] text-stone-400">
                        Add products to unlock
                        checkout
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      <div className="space-y-2">
                        {safeCart.map((item) => {
                          const uniqueKey =
                            getCartItemKey(item);

                          if (!uniqueKey) {
                            return null;
                          }

                          /* ─────────────────────
                             VARIANT DATA
                          ───────────────────── */

                          const itemImage =
                            getCartItemImage(
                              item
                            );

                          const itemTitle =
                            item?.title ||
                            item?.product?.name ||
                            item?.name ||
                            'Product Item';

                          /*
                           * IMPORTANT:
                           * Price is variant.price.
                           */
                          const itemOfferPrice =
                            getCartItemPrice(
                              item
                            );

                          /*
                           * IMPORTANT:
                           * MRP is variant.mrp.
                           */
                          const itemMrp =
                            getCartItemMrp(
                              item,
                              itemOfferPrice
                            );

                          /*
                           * IMPORTANT:
                           * Stock is variant.stock.
                           */
                          const itemStock =
                            getCartItemStock(
                              item
                            );

                          const variantLabel =
                            getCartVariantLabel(
                              item
                            );

                          const quantity = Math.max(
                            1,
                            Number(
                              item?.quantity || 1
                            )
                          );

                          const hasMrp =
                            itemMrp >
                            itemOfferPrice;

                          const discountPercent =
                            hasMrp &&
                            itemMrp > 0
                              ? Math.round(
                                  ((itemMrp -
                                    itemOfferPrice) /
                                    itemMrp) *
                                    100
                                )
                              : 0;

                          const isOutOfStock =
                            itemStock <= 0;

                          const canIncrease =
                            !isOutOfStock &&
                            quantity <
                              itemStock;

                          const isLowStock =
                            !isOutOfStock &&
                            itemStock > 0 &&
                            itemStock <= 5;

                          return (
                            <motion.div
                              key={uniqueKey}
                              layout
                              initial={{
                                opacity: 0,
                                x: 16
                              }}
                              animate={{
                                opacity: 1,
                                x: 0
                              }}
                              exit={{
                                opacity: 0,
                                x: -16
                              }}
                              transition={{
                                duration: 0.22
                              }}
                              className={`flex items-center gap-3 bg-white p-2.5 rounded-xl border shadow-xs ${
                                isOutOfStock
                                  ? 'border-rose-200 bg-rose-50/20'
                                  : 'border-stone-100'
                              }`}
                            >
                              {/* IMAGE */}

                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={itemTitle}
                                  className="w-12 h-12 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                                  <ShoppingCart
                                    size={16}
                                    className="text-brand-300"
                                  />
                                </div>
                              )}

                              {/* PRODUCT DETAILS */}

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[11px] text-stone-900 truncate leading-tight">
                                  {itemTitle}
                                </p>

                                {variantLabel && (
                                  <span className="inline-block mt-0.5 text-[9px] font-extrabold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-md">
                                    {variantLabel}
                                  </span>
                                )}

                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-stone-700 font-bold">
                                    ₹
                                    {itemOfferPrice.toFixed(
                                      0
                                    )}
                                  </span>

                                  {hasMrp && (
                                    <>
                                      <span className="text-[9px] text-stone-400 line-through">
                                        ₹
                                        {itemMrp.toFixed(
                                          0
                                        )}
                                      </span>

                                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1 rounded">
                                        {discountPercent}%
                                        OFF
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* STOCK STATUS */}

                                {isOutOfStock ? (
                                  <p className="text-[9px] font-black text-rose-600 mt-1">
                                    Out of stock
                                  </p>
                                ) : isLowStock ? (
                                  <p className="text-[9px] font-bold text-amber-600 mt-1">
                                    Only{' '}
                                    {itemStock}{' '}
                                    left
                                  </p>
                                ) : null}
                              </div>

                              {/* QUANTITY */}

                              <div
                                className={`flex items-center gap-1 rounded-xl p-0.5 shrink-0 ${
                                  isOutOfStock
                                    ? 'bg-rose-100'
                                    : 'bg-stone-100'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      uniqueKey,
                                      -1
                                    )
                                  }
                                  disabled={
                                    isOutOfStock
                                  }
                                  className="w-6 h-6 hover:bg-white disabled:hover:bg-transparent rounded-lg flex items-center justify-center text-stone-600 disabled:text-stone-300 transition cursor-pointer disabled:cursor-not-allowed"
                                  aria-label={`Decrease quantity of ${itemTitle}`}
                                >
                                  <Minus size={11} />
                                </button>

                                <span className="text-xs font-black w-5 text-center text-stone-900">
                                  {quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      uniqueKey,
                                      1
                                    )
                                  }
                                  disabled={
                                    !canIncrease
                                  }
                                  className="w-6 h-6 hover:bg-white disabled:hover:bg-transparent rounded-lg flex items-center justify-center text-stone-600 disabled:text-stone-300 transition cursor-pointer disabled:cursor-not-allowed"
                                  aria-label={`Increase quantity of ${itemTitle}`}
                                >
                                  <Plus size={11} />
                                </button>
                              </div>

                              {/* LINE TOTAL */}

                              <span className="text-xs font-black text-brand-700 shrink-0 w-14 text-right">
                                ₹
                                {(
                                  itemOfferPrice *
                                  quantity
                                ).toFixed(0)}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  )}
                </div>

                {/* ─────────────────────────────
                    STEP 2 & 3
                ───────────────────────────── */}

                {!isCartEmpty && session && (
                  <>
                    <div className="border-t border-stone-100" />

                    {/* ─────────────────────────
                        ADDRESS
                    ───────────────────────── */}

                    <div className="space-y-3">
                      <StepBadge
                        number="2"
                        label="Delivery Address"
                        active
                        done={hasAddress}
                      />

                      <div>
                        <CollapsedAddressSelector
                          addresses={safeAddresses}
                          selectedAddressId={
                            selectedAddressId
                          }
                          onSelectAddressId={(id) => {
                            const selected =
                              safeAddresses.find(
                                (address) =>
                                  address.id ===
                                  id
                              );

                            if (selected) {
                              handleSelectAddress(
                                selected
                              );
                            }
                          }}
                          onAddNewAddress={() =>
                            setShowAddAddressBox(
                              true
                            )
                          }
                        />
                      </div>

                      {/* ADD ADDRESS FORM */}

                      <AnimatePresence>
                        {showAddAddressBox && (
                          <motion.form
                            initial={{
                              opacity: 0,
                              height: 0
                            }}
                            animate={{
                              opacity: 1,
                              height: 'auto'
                            }}
                            exit={{
                              opacity: 0,
                              height: 0
                            }}
                            transition={{
                              duration: 0.25
                            }}
                            onSubmit={
                              handleAddAddress
                            }
                            className="overflow-hidden"
                          >
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5 text-xs">
                              <div className="flex justify-between items-center">
                                <p className="font-black text-stone-800">
                                  Add New Address
                                </p>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddAddressBox(
                                      false
                                    )
                                  }
                                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              <input
                                type="text"
                                placeholder="Title (Home / Work)"
                                required
                                className="w-full border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={
                                  newAddressForm
                                    ?.title || ''
                                }
                                onChange={(e) =>
                                  setNewAddressForm({
                                    ...newAddressForm,
                                    title: e.target
                                      .value
                                  })
                                }
                              />

                              <button
                                type="button"
                                onClick={
                                  detectCustomerLocation
                                }
                                className="w-full bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <MapPin size={13} />
                                Detect GPS Location
                              </button>

                              <input
                                type="text"
                                placeholder="House No."
                                required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={
                                  newAddressForm
                                    ?.house_no || ''
                                }
                                onChange={(e) =>
                                  setNewAddressForm({
                                    ...newAddressForm,
                                    house_no:
                                      e.target.value
                                  })
                                }
                              />

                              <input
                                type="text"
                                placeholder="Ward / Colony Name"
                                required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={
                                  newAddressForm
                                    ?.ward_no_name ||
                                  ''
                                }
                                onChange={(e) =>
                                  setNewAddressForm({
                                    ...newAddressForm,
                                    ward_no_name:
                                      e.target.value
                                  })
                                }
                              />

                              <input
                                type="tel"
                                placeholder="Phone Number"
                                required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={
                                  newAddressForm
                                    ?.phone || ''
                                }
                                onChange={(e) =>
                                  setNewAddressForm({
                                    ...newAddressForm,
                                    phone: e.target
                                      .value
                                  })
                                }
                              />

                              <button
                                type="submit"
                                className="w-full bg-brand-700 hover:bg-brand-800 text-white py-2.5 rounded-xl font-black cursor-pointer transition btn-press"
                              >
                                Save Address
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ─────────────────────────
                        COUPON
                    ───────────────────────── */}

                    {hasAddress && (
                      <>
                        <div className="border-t border-stone-100" />

                        <div className="space-y-3">
                          <StepBadge
                            number="3"
                            label="Promo Code"
                            active
                            done={
                              hasCouponApplied
                            }
                          />

                          {appliedCoupon ? (
                            <motion.div
                              initial={{
                                opacity: 0,
                                scale: 0.96
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1
                              }}
                              className="flex items-center justify-between bg-brand-50 border border-brand-200 p-3 rounded-2xl"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
                                  <Tag
                                    size={14}
                                    className="text-white"
                                  />
                                </div>

                                <div>
                                  <p className="font-mono font-black text-brand-800 text-xs">
                                    {
                                      appliedCoupon.code
                                    }
                                  </p>

                                  <p className="text-[9px] text-brand-600 font-bold">
                                    Discount applied ✓
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={
                                  removeCoupon
                                }
                                className="text-[10px] font-black text-rose-500 hover:text-rose-700 hover:underline cursor-pointer transition"
                              >
                                Remove
                              </button>
                            </motion.div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Enter coupon code"
                                  className="flex-1 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 p-2.5 rounded-xl text-xs font-black uppercase outline-none bg-stone-50 text-stone-900 transition"
                                  value={
                                    couponInput ||
                                    ''
                                  }
                                  onChange={(e) =>
                                    setCouponInput(
                                      e.target
                                        .value
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  onClick={
                                    handleApplyCoupon
                                  }
                                  className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition btn-press"
                                >
                                  Apply
                                </button>
                              </div>

                              {availableCoupons.length >
                                0 && (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider">
                                    Available Offers
                                  </p>

                                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none pr-0.5">
                                    {availableCoupons.map(
                                      (coupon) => (
                                        <CouponChip
                                          key={
                                            coupon.id
                                          }
                                          coupon={
                                            coupon
                                          }
                                          onApply={(
                                            code
                                          ) => {
                                            setCouponInput(
                                              code
                                            );
                                          }}
                                        />
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ─────────────────────────────
                    LOGIN NUDGE
                ───────────────────────────── */}

                {!isCartEmpty && !session && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2.5">
                    <p className="text-xs font-bold text-amber-900">
                      Login to add addresses and
                      checkout
                    </p>

                    <Link
                      to="/login"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2 rounded-xl text-xs font-black shadow transition btn-press"
                    >
                      Login Now
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────
                FOOTER SUMMARY
            ───────────────────────────────── */}

            <div className="border-t border-stone-100 bg-white px-4 pt-3 pb-4 space-y-3 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.06)] shrink-0">
              {/* LINE ITEMS */}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Items Total</span>

                  <span className="font-bold text-stone-700">
                    ₹
                    {safeCartSubtotal.toFixed(
                      2
                    )}
                  </span>
                </div>

                {Number(discountAmount) > 0 && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -4
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    className="flex justify-between text-brand-700 font-bold"
                  >
                    <span>
                      Discount (
                      {appliedCoupon?.code})
                    </span>

                    <span>
                      −₹
                      {Number(
                        discountAmount
                      ).toFixed(2)}
                    </span>
                  </motion.div>
                )}

                {selectedAddressDistance !==
                  null &&
                  selectedAddressDistance !==
                    undefined &&
                  !isCartEmpty && (
                    <div className="flex justify-between text-stone-500">
                      <span>
                        Store Distance
                      </span>

                      <span className="font-bold text-stone-700">
                        {Number(
                          selectedAddressDistance
                        ).toFixed(2)}{' '}
                        km
                      </span>
                    </div>
                  )}

                {!isCartEmpty && (
                  <div className="flex justify-between text-stone-500">
                    <span>
                      Delivery Fee
                    </span>

                    {Number(deliveryFee) ===
                    0 ? (
                      <span className="font-black text-brand-600">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-stone-700">
                        ₹
                        {Number(
                          deliveryFee || 0
                        ).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                  <span className="font-black text-stone-900 text-sm">
                    Total
                  </span>

                  <motion.span
                    key={cartTotal}
                    initial={{
                      scale: 1.1,
                      color: '#059669'
                    }}
                    animate={{
                      scale: 1,
                      color: '#047857'
                    }}
                    transition={{
                      duration: 0.35
                    }}
                    className="font-black text-lg text-brand-700"
                  >
                    ₹
                    {!isCartEmpty
                      ? Number(
                          cartTotal || 0
                        ).toFixed(2)
                      : '0.00'}
                  </motion.span>
                </div>
              </div>

              {/* ─────────────────────────────
                  VALIDATION HINT
              ───────────────────────────── */}

              <AnimatePresence>
                {isCartEmpty ? (
                  <motion.p
                    key="empty"
                    initial={{
                      opacity: 0
                    }}
                    animate={{
                      opacity: 1
                    }}
                    exit={{
                      opacity: 0
                    }}
                    className="text-[10px] text-rose-500 font-bold text-center"
                  >
                    Add items to your cart
                    first
                  </motion.p>
                ) : isAddressMissing &&
                  session ? (
                  <motion.p
                    key="addr"
                    initial={{
                      opacity: 0
                    }}
                    animate={{
                      opacity: 1
                    }}
                    exit={{
                      opacity: 0
                    }}
                    className="text-[10px] text-amber-600 font-bold text-center"
                  >
                    Please select a delivery
                    address to continue
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* ─────────────────────────────
                  CHECKOUT BUTTON
              ───────────────────────────── */}

              <motion.button
                whileTap={{
                  scale: 0.97
                }}
                type="button"
                onClick={
                  session
                    ? handleCheckout
                    : () => {
                        onClose();
                        navigate('/login');
                      }
                }
                disabled={
                  session
                    ? isCheckoutDisabled
                    : false
                }
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <ShieldCheck size={15} />

                {checkingOut
                  ? 'Placing Order…'
                  : session
                    ? 'Place Secure Order'
                    : 'Login to Checkout'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}