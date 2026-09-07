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

function StepBadge({ number, label, active, done }) {
  return (
    <div
      className={`flex items-center gap-1.5 ${
        active || done ? '' : 'opacity-40'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${
          done
            ? 'bg-emerald-600 text-white'
            : active
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-stone-100 text-stone-500'
        }`}
      >
        {done ? <CheckCircle size={10} /> : number}
      </div>

      <span className="text-[10px] font-black uppercase text-stone-800">
        {label}
      </span>
    </div>
  );
}

function CouponChip({ coupon, onApply }) {
  return (
    <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Tag size={12} className="text-emerald-700 shrink-0" />
        <div className="min-w-0">
          <span className="font-mono font-black text-[11px] text-stone-900 uppercase">
            {coupon.code}
          </span>
          <span className="text-[9px] font-bold text-emerald-700 ml-1.5">
            {coupon.discount_type === 'percentage'
              ? `${coupon.discount_value}% OFF`
              : `₹${coupon.discount_value}`}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(coupon.code)}
        className="shrink-0 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer"
      >
        Apply
      </button>
    </div>
  );
}

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
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-stone-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={14} />
                </div>
                <div>
                  <h2 className="font-black text-stone-900">Cart</h2>
                  <p className="text-[10px] text-stone-400 font-medium">
                    {totalItemsCount || 0} items
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              
              {/* FREE DELIVERY BANNER */}
              {!isCartEmpty && freeDeliveryThreshold > 0 && (
                <div className="bg-slate-900 rounded-2xl p-2.5 text-white space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Zap size={11} className="text-amber-400 fill-amber-400" />
                      {amountNeeded > 0 ? `Add ₹${amountNeeded.toFixed(0)} for Free Delivery` : 'Free Delivery Unlocked'}
                    </span>
                    <span>{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}

              {/* STEP 1: REVIEW ITEMS */}
              <div className="space-y-2">
                <StepBadge number="1" label="Items" active done={!isCartEmpty} />

                {isCartEmpty ? (
                  <div className="bg-stone-50 rounded-2xl p-6 text-center border border-dashed border-stone-200">
                    <ShoppingCart size={22} className="text-stone-300 mx-auto mb-1" />
                    <p className="font-bold text-stone-600">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeCart.map((item) => {
                      const uniqueKey = getCartItemKey(item);
                      if (!uniqueKey) return null;

                      const itemImage = getCartItemImage(item);
                      const itemTitle = item?.title || item?.product?.name || item?.name || 'Item';
                      const itemOfferPrice = getCartItemPrice(item);
                      const itemStock = getCartItemStock(item);
                      const variantLabel = getCartVariantLabel(item);
                      const quantity = Math.max(1, Number(item?.quantity || 1));
                      const isOutOfStock = itemStock <= 0;
                      const canIncrease = !isOutOfStock && quantity < itemStock;

                      return (
                        <div
                          key={uniqueKey}
                          className="flex items-center gap-2.5 bg-white p-2.5 rounded-2xl border border-stone-200/80"
                        >
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt=""
                              className="w-10 h-10 rounded-xl object-contain bg-stone-50 shrink-0 border border-stone-100 p-0.5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                              <Package size={14} />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-900 truncate">
                              {itemTitle}
                            </p>
                            {variantLabel && (
                              <span className="text-[9px] font-bold text-emerald-700 block">
                                {variantLabel}
                              </span>
                            )}
                            <span className="font-black text-stone-900">
                              ₹{itemOfferPrice.toFixed(0)}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-0.5 border border-stone-200">
                              <button
                                type="button"
                                onClick={() => updateQuantity(uniqueKey, -1)}
                                disabled={isOutOfStock}
                                className="w-5 h-5 bg-white rounded-lg flex items-center justify-center text-stone-600 cursor-pointer shadow-2xs"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="font-black w-4 text-center">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(uniqueKey, 1)}
                                disabled={!canIncrease}
                                className="w-5 h-5 bg-white rounded-lg flex items-center justify-center text-stone-600 cursor-pointer shadow-2xs"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <span className="font-black text-emerald-700">
                              ₹{(itemOfferPrice * quantity).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: ADDRESS */}
              {!isCartEmpty && session && (
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <StepBadge number="2" label="Address" active done={hasAddress} />

                  <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
                    <CollapsedAddressSelector
                      addresses={safeAddresses}
                      selectedAddressId={selectedAddressId}
                      onSelectAddressId={(id) => {
                        const selected = safeAddresses.find((address) => address.id === id);
                        if (selected) handleSelectAddress(selected);
                      }}
                      onAddNewAddress={() => setShowAddAddressBox(true)}
                    />
                  </div>

                  {showAddAddressBox && (
                    <form
                      onSubmit={handleAddAddress}
                      className="bg-white p-3 rounded-2xl border border-emerald-200 space-y-2 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[10px] uppercase">New Address</span>
                        <button
                          type="button"
                          onClick={() => setShowAddAddressBox(false)}
                          className="text-stone-400 hover:text-stone-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Label (Home)"
                          required
                          className="border rounded-xl px-2.5 py-1.5 text-[11px] bg-stone-50"
                          value={newAddressForm?.title || ''}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, title: e.target.value })}
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          required
                          className="border rounded-xl px-2.5 py-1.5 text-[11px] bg-stone-50"
                          value={newAddressForm?.phone || ''}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={detectCustomerLocation}
                        className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 py-1.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MapPin size={11} /> Auto-detect GPS
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="House No *"
                          required
                          className="border rounded-xl px-2.5 py-1.5 text-[11px] bg-stone-50"
                          value={newAddressForm?.house_no || ''}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, house_no: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Locality *"
                          required
                          className="border rounded-xl px-2.5 py-1.5 text-[11px] bg-stone-50"
                          value={newAddressForm?.ward_no_name || ''}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, ward_no_name: e.target.value })}
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 text-white py-2 rounded-xl font-black text-[10px] uppercase cursor-pointer"
                      >
                        Save Address
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 3: COUPONS */}
              {!isCartEmpty && session && hasAddress && (
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <StepBadge number="3" label="Coupon" active done={hasCouponApplied} />

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-2xl">
                      <div>
                        <span className="font-mono font-black text-emerald-900 uppercase">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-[10px] text-emerald-700 block">Applied ✓</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[10px] font-black text-rose-600 bg-white px-2 py-1 rounded-lg border border-rose-200 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Promo code"
                          className="flex-1 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-black uppercase outline-none bg-stone-50"
                          value={couponInput || ''}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-stone-900 text-white px-4 py-1.5 rounded-xl font-black uppercase cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>

                      {availableCoupons.length > 0 && (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {availableCoupons.map((coupon) => (
                            <CouponChip
                              key={coupon.id}
                              coupon={coupon}
                              onApply={(code) => setCouponInput(code)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LOGIN NUDGE */}
              {!isCartEmpty && !session && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                  <p className="font-bold text-amber-900">
                    Sign in to checkout.
                  </p>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 bg-amber-600 text-white px-4 py-1.5 rounded-xl font-black cursor-pointer shadow-xs"
                  >
                    Login <ArrowRight size={12} />
                  </Link>
                </div>
              )}

            </div>

            {/* FOOTER */}
            <div className="border-t border-stone-100 bg-white p-3.5 space-y-2.5 shrink-0">
              <div className="space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-stone-900">₹{safeCartSubtotal.toFixed(2)}</span>
                </div>

                {Number(discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount</span>
                    <span>-₹{Number(discountAmount).toFixed(2)}</span>
                  </div>
                )}

                {!isCartEmpty && (
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    {Number(deliveryFee) === 0 ? (
                      <span className="font-black text-emerald-600">FREE</span>
                    ) : (
                      <span className="font-bold text-stone-900">₹{Number(deliveryFee || 0).toFixed(2)}</span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-sm font-black text-stone-900">
                  <span>Total</span>
                  <span className="text-emerald-700 text-base">
                    ₹{!isCartEmpty ? Number(cartTotal || 0).toFixed(2) : '0.00'}
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-black py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer text-[11px]"
              >
                <ShieldCheck size={14} />
                {checkingOut ? 'Processing...' : session ? 'Place Order' : 'Login to Checkout'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}