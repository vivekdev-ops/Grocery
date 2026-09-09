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
  Banknote
} from 'lucide-react';

import { Link } from 'react-router-dom';

import CollapsedAddressSelector from '../CollapsedAddressSelector';

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

  const safeCart = Array.isArray(cart) ? cart : [];
  const safeAddresses = Array.isArray(savedAddresses) ? savedAddresses : [];

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

  // Calculate total MRP sum dynamically across all items in cart
  const totalMrpSum = safeCart.reduce((sum, item) => {
    const itemOfferPrice = getCartItemPrice(item);
    const itemMrp = getCartItemMrp(item, itemOfferPrice);
    const qty = Number(item?.quantity || 1);
    return sum + (itemMrp * qty);
  }, 0);

  // Discount on MRP + Coupon savings
  const totalDiscountFromMrp = Math.max(0, totalMrpSum - safeCartSubtotal);
  const calculatedTotalSavings = totalDiscountFromMrp + (Number(discountAmount) || 0);

  // Exact final total matching subtotal - coupon discount + delivery fee
  const finalComputedTotal = Math.max(0, safeCartSubtotal - (Number(discountAmount) || 0)) + Number(deliveryFee || 0);

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
            <div className="h-12 flex items-center justify-between px-3 border-b border-stone-200/80 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-stone-700 cursor-pointer transition"
                >
                  <X size={14} />
                </button>
                <h2 className="font-black text-stone-900 text-sm tracking-tight">Cart</h2>
              </div>
              <span className="text-[10px] font-bold text-stone-500">{totalItemsCount || 0} items</span>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              
              {/* DELIVERING TO / ADDRESS CARD */}
              <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-stone-900 text-[11px]">Delivering to Home</span>
                </div>
                <div className="text-stone-600 text-[10px] font-medium flex items-center justify-between">
                  <span className="truncate pr-2">
                    {safeAddresses.find(a => a.id === selectedAddressId)?.address || 'Select delivery address below'}
                  </span>
                </div>
                <div className="pt-0.5">
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
                    className="bg-stone-50 p-2.5 rounded-xl border border-emerald-200 space-y-1.5 shadow-xs mt-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-[9px] uppercase">New Address</span>
                      <button
                        type="button"
                        onClick={() => setShowAddAddressBox(false)}
                        className="text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Label (Home)"
                        required
                        className="border rounded-lg px-2 py-1 text-[10px] bg-white"
                        value={newAddressForm?.title || ''}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, title: e.target.value })}
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        required
                        className="border rounded-lg px-2 py-1 text-[10px] bg-white"
                        value={newAddressForm?.phone || ''}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={detectCustomerLocation}
                      className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 py-1 rounded-lg font-bold text-[9px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MapPin size={10} /> Auto-detect GPS
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="House No *"
                        required
                        className="border rounded-lg px-2 py-1 text-[10px] bg-white"
                        value={newAddressForm?.house_no || ''}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, house_no: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Locality *"
                        required
                        className="border rounded-lg px-2 py-1 text-[10px] bg-white"
                        value={newAddressForm?.ward_no_name || ''}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, ward_no_name: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-1.5 rounded-lg font-black text-[9px] uppercase cursor-pointer"
                    >
                      Save Address
                    </button>
                  </form>
                )}
              </div>

              {/* DISTANCE testing WARNING BANNER (IF APPLICABLE) */}
              {selectedAddressDistance && selectedAddressDistance > 15 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-center text-rose-700 font-bold text-[10px]">
                  You seem to be <span className="font-black">{selectedAddressDistance.toFixed(1)} km</span> away from this address
                </div>
              )}

              {/* CART ITEMS LIST */}
              {isCartEmpty ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-stone-200/80 shadow-2xs space-y-1.5">
                  <div className="w-10 h-10 bg-stone-100 text-stone-400 rounded-xl flex items-center justify-center mx-auto">
                    <ShoppingCart size={18} />
                  </div>
                  <p className="font-black text-stone-800 text-xs">Your cart is empty</p>
                  <p className="text-[10px] text-stone-400">Add items from the store to get started.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-2.5">
                  {safeCart.map((item) => {
                    const uniqueKey = getCartItemKey(item);
                    if (!uniqueKey) return null;

                    const itemImage = getCartItemImage(item);
                    const itemTitle = item?.title || item?.product?.name || item?.name || 'Item';
                    const itemOfferPrice = getCartItemPrice(item);
                    const itemMrp = getCartItemMrp(item, itemOfferPrice);
                    const itemStock = getCartItemStock(item);
                    const variantLabel = getCartVariantLabel(item);
                    const quantity = Math.max(1, Number(item?.quantity || 1));
                    const isOutOfStock = itemStock <= 0;
                    const canIncrease = !isOutOfStock && quantity < itemStock;

                    return (
                      <div
                        key={uniqueKey}
                        className="flex items-center justify-between gap-2.5 py-1.5 border-b border-stone-100 last:border-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt=""
                              className="w-10 h-10 rounded-xl object-contain bg-stone-50 shrink-0 border border-stone-100 p-0.5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                              <ShoppingCart size={14} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 text-[11px] truncate">
                              {itemTitle}
                            </p>
                            {variantLabel && (
                              <span className="text-[9px] font-bold text-stone-500 block">
                                {variantLabel}
                              </span>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-black text-stone-900 text-[11px]">
                                ₹{itemOfferPrice.toFixed(0)}
                              </span>
                              {itemMrp > itemOfferPrice && (
                                <span className="text-[9px] text-stone-400 line-through font-bold">
                                  ₹{itemMrp.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* QUANTITY CONTROLS */}
                        <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden shadow-xs h-7 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, -1)}
                            disabled={isOutOfStock}
                            className="px-2 h-full hover:bg-emerald-700 font-bold text-[10px] flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 font-black text-[10px]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(uniqueKey, 1)}
                            disabled={!canIncrease}
                            className="px-2 h-full hover:bg-emerald-700 font-bold text-[10px] flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COUPONS & PROMO CODE SECTION */}
              {!isCartEmpty && session && (
                <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-stone-900 text-[11px] flex items-center gap-1">
                      <Tag size={12} className="text-emerald-600" /> Apply Coupon
                    </h3>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-[10px]">
                          %
                        </div>
                        <div>
                          <span className="font-mono font-black text-[10px] text-emerald-900 uppercase block">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold block">
                            Coupon applied successfully!
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[9px] font-black text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer shadow-2xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Enter Promo Code"
                          className="flex-1 border border-stone-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase outline-none bg-stone-50 focus:border-emerald-600"
                          value={couponInput || ''}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase cursor-pointer transition shadow-2xs"
                        >
                          Apply
                        </button>
                      </div>

                      {availableCoupons.length > 0 && (
                        <div className="space-y-1.5 pt-0.5 max-h-36 overflow-y-auto scrollbar-none">
                          {availableCoupons.map((coupon) => (
                            <div
                              key={coupon.id}
                              className="flex items-center justify-between p-2 bg-stone-50 border border-stone-200/80 rounded-xl gap-2 hover:border-emerald-300 transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-[9px] shrink-0">
                                  %
                                </div>
                                <div className="min-w-0">
                                  <span className="font-mono font-black text-[10px] text-stone-900 uppercase block truncate">
                                    {coupon.code}
                                  </span>
                                  <span className="text-[9px] text-stone-500 font-medium block truncate">
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
                                className="shrink-0 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-[9px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition"
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
                <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-2.5">
                  <h3 className="font-black text-stone-900 text-[11px]">Price Details</h3>
                  
                  <div className="space-y-1.5 text-stone-600 text-[10px]">
                    <div className="flex justify-between">
                      <span>MRP (incl. of all taxes)</span>
                      <span className="font-bold text-stone-900">₹{totalMrpSum.toFixed(0)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span>Delivery Charges</span>
                      </div>
                      <span className="font-bold text-stone-900">₹{Number(deliveryFee || 0).toFixed(0)}</span>
                    </div>

                    {totalDiscountFromMrp > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount on MRP</span>
                        <span>-₹{totalDiscountFromMrp.toFixed(0)}</span>
                      </div>
                    )}

                    {Number(discountAmount) > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Coupon Discount</span>
                        <span>-₹{Number(discountAmount).toFixed(0)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-xs font-black text-stone-900">
                      <span>Total Amount</span>
                      <span className="text-emerald-700 text-sm">
                        ₹{finalComputedTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-center text-emerald-800 font-black text-[10px]">
                    You'll save ₹{calculatedTotalSavings.toFixed(0)} on this order
                  </div>
                </div>
              )}

              {/* CANCELLATION POLICY */}
              {!isCartEmpty && (
                <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-1">
                  <h4 className="font-black text-stone-900 text-[11px]">Cancellation Policy</h4>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Not happy with quality? Reject items or the whole order at doorstep.
                  </p>
                </div>
              )}

              {/* LOGIN NUDGE IF NOT LOGGED IN */}
              {!isCartEmpty && !session && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1.5 shadow-2xs">
                  <p className="font-bold text-amber-900 text-[11px]">
                    Sign in to complete your quick order.
                  </p>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 bg-amber-600 text-white px-4 py-1.5 rounded-xl font-black cursor-pointer shadow-xs text-[10px]"
                  >
                    Login <ArrowRight size={10} />
                  </Link>
                </div>
              )}

            </div>

            {/* FIXED BOTTOM FOOTER BAR */}
            {!isCartEmpty && (
              <div className="border-t border-stone-200/80 bg-white p-3 space-y-2 shrink-0 shadow-lg">
                <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center justify-between text-[10px]">
                  <span className="font-bold text-emerald-900">You'll save ₹{calculatedTotalSavings.toFixed(0)} on this order</span>
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center font-bold border border-emerald-200">
                      <Banknote size={14} />
                    </div>
                    <div>
                      <span className="font-black text-stone-900 block text-[10px]">Cash on Delivery</span>
                      <span className="text-[9px] text-stone-400 font-bold">Pay when order arrives</span>
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
                    className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-300 text-stone-950 font-black py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-1 uppercase tracking-wider cursor-pointer text-[10px]"
                  >
                    {checkingOut ? 'Processing...' : session ? `Order • ₹${finalComputedTotal.toFixed(0)}` : 'Login to Checkout'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}