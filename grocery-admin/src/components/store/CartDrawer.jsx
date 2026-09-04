// src/components/store/CartDrawer.jsx
import { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, X, Plus, Minus, ShieldCheck, Tag, Zap, ChevronDown, Trash2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CollapsedAddressSelector from '../CollapsedAddressSelector';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
function StepBadge({ number, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 ${active || done ? '' : 'opacity-40'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors
        ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500/30' : 'bg-stone-100 text-stone-500'}`}
      >
        {done ? <CheckCircle size={13} /> : number}
      </div>
      <span className={`text-xs font-black uppercase tracking-wider ${active ? 'text-stone-900' : done ? 'text-brand-700' : 'text-stone-400'}`}>
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
            <span className="font-mono font-black text-[11px] text-stone-900 uppercase">{coupon.code}</span>
            <span className="text-[9px] font-black text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-full">
              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
            </span>
          </div>
          <p className="text-[9px] text-stone-400 truncate mt-0.5">
            {coupon.min_order_value ? `Min ₹${coupon.min_order_value}` : 'No min order'} • {coupon.usage_limit_type === 'one_time' ? 'One-time' : 'Multi-use'}
          </p>
        </div>
      </div>
      <button
        onClick={() => onApply(coupon.code)}
        className="shrink-0 bg-brand-700 hover:bg-brand-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition cursor-pointer btn-press"
      >
        Apply
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CartDrawer({
  isOpen, onClose, cart, totalItemsCount, session,
  savedAddresses, selectedAddressId, handleSelectAddress,
  showAddAddressBox, setShowAddAddressBox, newAddressForm, setNewAddressForm,
  detectCustomerLocation, handleAddAddress, handleDeleteAddress, updateQuantity,
  appliedCoupon, setAppliedCoupon, couponInput, setCouponInput, handleApplyCoupon, removeCoupon,
  cartSubtotal, discountAmount, selectedAddressDistance, deliveryFee, cartTotal,
  checkingOut, handleCheckout, navigate, deliveryRules = []
}) {
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    if (isOpen) fetchAvailableCoupons();
  }, [isOpen]);

  const fetchAvailableCoupons = async () => {
    const { data, error } = await supabase.from('coupons').select('*').eq('is_active', true);
    if (!error && data) {
      setAvailableCoupons(data.filter(c => !c.expiry_date || new Date(c.expiry_date) >= new Date()));
    }
  };

  if (!isOpen) return null;

  const freeDeliveryRule = deliveryRules
    .filter(r => Number(r.delivery_fee) === 0)
    .sort((a, b) => Number(a.min_cart_value) - Number(b.min_cart_value))[0];
  const freeDeliveryThreshold = freeDeliveryRule ? Number(freeDeliveryRule.min_cart_value) : 500;
  const amountNeeded = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const progressPct = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);

  const isCartEmpty       = cart.length === 0;
  const isAddressMissing = savedAddresses.length === 0 || !selectedAddressId;
  const isCheckoutDisabled = checkingOut || isCartEmpty || isAddressMissing;

  const hasAddress = !isAddressMissing;
  const hasCouponApplied = !!appliedCoupon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* ── HEADER ── */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-stone-100 bg-white/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={16} className="text-brand-700" />
                </div>
                <div>
                  <p className="text-xs font-black text-stone-900 leading-none">My Cart</p>
                  <p className="text-[9px] text-stone-400 mt-0.5">{totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto scrollbar-none">

              {/* Free delivery progress */}
              {!isCartEmpty && freeDeliveryThreshold > 0 && (
                <div className="px-4 pt-3 pb-0">
                  <div className="bg-gradient-to-r from-brand-800 to-brand-900 rounded-2xl p-3 space-y-2">
                    <p className="text-[11px] font-black text-white flex items-center gap-1.5">
                      <Zap size={11} className="text-amber-400 fill-amber-400" />
                      {amountNeeded > 0
                        ? <span>Add <span className="text-amber-400">₹{amountNeeded.toFixed(0)}</span> more for FREE delivery!</span>
                        : <span className="text-brand-300">🎉 You qualify for FREE delivery!</span>}
                    </p>
                    <div className="relative h-1.5 bg-brand-700/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-amber-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-5">

                {/* ── STEP 1: Items ── */}
                <div className="space-y-3">
                  <StepBadge number="1" label="Review Items" active done={!isCartEmpty} />

                  {isCartEmpty ? (
                    <div className="bg-stone-50 rounded-2xl p-8 text-center border border-stone-100 space-y-2">
                      <ShoppingCart size={28} className="text-stone-300 mx-auto" />
                      <p className="text-xs font-bold text-stone-600">Your cart is empty</p>
                      <p className="text-[10px] text-stone-400">Add products to unlock checkout</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map(item => {
  const uniqueKey = item?.cartItemId || item?.id || item?.product_id;
  const itemImage = item?.image || item?.image_url || (item?.images && item.images[0]) || '';
  const itemTitle = item?.title || item?.name || 'Product Item';
  const itemPrice = Number(item?.price || 0);
  const variantLabel = item?.variant?.unit_label || item?.variant?.label || '';

  if (!uniqueKey) return null;

  return (
    <motion.div
      key={uniqueKey}
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-stone-100 shadow-xs"
    >
      {itemImage ? (
        <img src={itemImage} alt={itemTitle} className="w-12 h-12 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-100" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <ShoppingCart size={16} className="text-brand-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[11px] text-stone-900 truncate leading-tight">{itemTitle}</p>
        {variantLabel && (
          <span className="inline-block mt-0.5 text-[9px] font-extrabold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded-md">
            {variantLabel}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-stone-700 font-bold">₹{itemPrice.toFixed(0)}</p>
          {(() => {
            const itemMrp = Number(item?.variant?.mrp || item?.product?.mrp || 0);
            return itemMrp > itemPrice ? (
              <p className="text-[9px] text-stone-400 line-through">₹{itemMrp.toFixed(0)}</p>
            ) : null;
          })()}
        </div>
      </div>
      <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-0.5 shrink-0">
        <button onClick={() => updateQuantity(uniqueKey, -1)} className="w-6 h-6 hover:bg-white rounded-lg flex items-center justify-center text-stone-600 transition cursor-pointer">
          <Minus size={11} />
        </button>
        <span className="text-xs font-black w-5 text-center text-stone-900">{item?.quantity || 1}</span>
        <button onClick={() => updateQuantity(uniqueKey, 1)} className="w-6 h-6 hover:bg-white rounded-lg flex items-center justify-center text-stone-600 transition cursor-pointer">
          <Plus size={11} />
        </button>
      </div>
      <span className="text-xs font-black text-brand-700 shrink-0 w-14 text-right">
        ₹{(itemPrice * (item?.quantity || 1)).toFixed(0)}
      </span>
    </motion.div>
  );
})}
                    </div>
                  )}
                </div>

                {/* ── STEP 2 & 3: Address + Coupon (shown when cart has items and user is logged in) ── */}
                {!isCartEmpty && session && (
                  <>
                    {/* Divider */}
                    <div className="border-t border-stone-100" />

                    {/* Address */}
                    <div className="space-y-3">
                      <StepBadge number="2" label="Delivery Address" active done={hasAddress} />
                      <div>
                        <CollapsedAddressSelector
                          addresses={savedAddresses}
                          selectedAddressId={selectedAddressId}
                          onSelectAddressId={id => {
                            const sel = savedAddresses.find(a => a.id === id);
                            if (sel) handleSelectAddress(sel);
                          }}
                          onAddNewAddress={() => setShowAddAddressBox(true)}
                        />
                      </div>

                      <AnimatePresence>
                        {showAddAddressBox && (
                          <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            onSubmit={handleAddAddress}
                            className="overflow-hidden"
                          >
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5 text-xs">
                              <div className="flex justify-between items-center">
                                <p className="font-black text-stone-800">Add New Address</p>
                                <button type="button" onClick={() => setShowAddAddressBox(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                                  <X size={14} />
                                </button>
                              </div>
                              <input type="text" placeholder="Title (Home / Work)" required
                                className="w-full border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={newAddressForm.title} onChange={e => setNewAddressForm({ ...newAddressForm, title: e.target.value })} />
                              <button type="button" onClick={detectCustomerLocation}
                                className="w-full bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                                <MapPin size={13} /> Detect GPS Location
                              </button>
                              <input type="text" placeholder="House No." required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={newAddressForm.house_no} onChange={e => setNewAddressForm({ ...newAddressForm, house_no: e.target.value })} />
                              <input type="text" placeholder="Ward / Colony Name" required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={newAddressForm.ward_no_name} onChange={e => setNewAddressForm({ ...newAddressForm, ward_no_name: e.target.value })} />
                              <input type="tel" placeholder="Phone Number" required
                                className="w-full border border-stone-200 focus:border-brand-500 p-2.5 rounded-xl bg-white text-stone-900 outline-none transition"
                                value={newAddressForm.phone} onChange={e => setNewAddressForm({ ...newAddressForm, phone: e.target.value })} />
                              <button type="submit" className="w-full bg-brand-700 hover:bg-brand-800 text-white py-2.5 rounded-xl font-black cursor-pointer transition btn-press">
                                Save Address
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Coupon — only shown when address is selected */}
                    {hasAddress && (
                      <>
                        <div className="border-t border-stone-100" />
                        <div className="space-y-3">
                          <StepBadge number="3" label="Promo Code" active done={hasCouponApplied} />

                          {appliedCoupon ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-between bg-brand-50 border border-brand-200 p-3 rounded-2xl"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
                                  <Tag size={14} className="text-white" />
                                </div>
                                <div>
                                  <p className="font-mono font-black text-brand-800 text-xs">{appliedCoupon.code}</p>
                                  <p className="text-[9px] text-brand-600 font-bold">Discount applied ✓</p>
                                </div>
                              </div>
                              <button onClick={removeCoupon} className="text-[10px] font-black text-rose-500 hover:text-rose-700 hover:underline cursor-pointer transition">
                                Remove
                              </button>
                            </motion.div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <input
                                  type="text" placeholder="Enter coupon code"
                                  className="flex-1 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 p-2.5 rounded-xl text-xs font-black uppercase outline-none bg-stone-50 text-stone-900 transition"
                                  value={couponInput} onChange={e => setCouponInput(e.target.value)}
                                />
                                <button onClick={handleApplyCoupon}
                                  className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition btn-press">
                                  Apply
                                </button>
                              </div>

                              {availableCoupons.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Available Offers</p>
                                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none pr-0.5">
                                    {availableCoupons.map(c => (
                                      <CouponChip key={c.id} coupon={c} onApply={code => setCouponInput(code)} />
                                    ))}
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

                {/* Login nudge */}
                {!isCartEmpty && !session && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2.5">
                    <p className="text-xs font-bold text-amber-900">Login to add addresses and checkout</p>
                    <Link to="/login" className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2 rounded-xl text-xs font-black shadow transition btn-press">
                      Login Now
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── FOOTER SUMMARY ── */}
            <div className="border-t border-stone-100 bg-white px-4 pt-3 pb-4 space-y-3 shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.06)] shrink-0">
              {/* Line items */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Items Total</span>
                  <span className="font-bold text-stone-700">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between text-brand-700 font-bold">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>−₹{discountAmount.toFixed(2)}</span>
                  </motion.div>
                )}
                {selectedAddressDistance !== null && !isCartEmpty && (
                  <div className="flex justify-between text-stone-500">
                    <span>Store Distance</span>
                    <span className="font-bold text-stone-700">{selectedAddressDistance} km</span>
                  </div>
                )}
                {!isCartEmpty && (
                  <div className="flex justify-between text-stone-500">
                    <span>Delivery Fee</span>
                    {deliveryFee === 0
                      ? <span className="font-black text-brand-600">FREE</span>
                      : <span className="font-bold text-stone-700">₹{(deliveryFee || 0).toFixed(2)}</span>}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                  <span className="font-black text-stone-900 text-sm">Total</span>
                  <motion.span
                    key={cartTotal}
                    initial={{ scale: 1.1, color: '#059669' }}
                    animate={{ scale: 1, color: '#047857' }}
                    transition={{ duration: 0.35 }}
                    className="font-black text-lg text-brand-700"
                  >
                    ₹{!isCartEmpty ? cartTotal.toFixed(2) : '0.00'}
                  </motion.span>
                </div>
              </div>

              {/* Validation hint */}
              <AnimatePresence>
                {isCartEmpty ? (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-rose-500 font-bold text-center">
                    Add items to your cart first
                  </motion.p>
                ) : isAddressMissing && session ? (
                  <motion.p key="addr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-amber-600 font-bold text-center">
                    Please select a delivery address to continue
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* Checkout button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={session ? handleCheckout : () => { onClose(); navigate('/login'); }}
                disabled={session ? isCheckoutDisabled : false}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <ShieldCheck size={15} />
                {checkingOut ? 'Placing Order…' : session ? 'Place Secure Order' : 'Login to Checkout'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}