// src/components/store/CartDrawer.jsx
import { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, X, Plus, Minus, ShieldCheck, Sparkles, Tag, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import CollapsedAddressSelector from '../CollapsedAddressSelector';
import { supabase } from '../../supabaseClient';

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

  // Fetch active coupons to display as suggestions
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCoupons();
    }
  }, [isOpen]);

  const fetchAvailableCoupons = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true);

    if (!error && data) {
      const validCoupons = data.filter(c => !c.expiry_date || new Date(c.expiry_date) >= new Date());
      setAvailableCoupons(validCoupons);
    }
  };

  if (!isOpen) return null;

  // Dynamically calculate the free delivery threshold from admin rules where fee is 0
  const freeDeliveryRule = deliveryRules
    .filter(r => Number(r.delivery_fee) === 0)
    .sort((a, b) => Number(a.min_cart_value) - Number(b.min_cart_value))[0];

  const freeDeliveryThreshold = freeDeliveryRule ? Number(freeDeliveryRule.min_cart_value) : 500;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const progressPercentage = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);

  const applySpecificCoupon = (code) => {
    setCouponInput(code);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300 font-sans">
      <div className="bg-white text-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-emerald-100 transition-transform duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-700" /> My Cart ({totalItemsCount})
          </h3>
          <button onClick={onClose} className="p-2 bg-emerald-100/60 rounded-full text-slate-600 hover:text-slate-900 transition cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-[#F0FDF4]/30">
          
          {/* Dynamic Free Delivery Progress */}
          {freeDeliveryThreshold > 0 && cart.length > 0 && (
            <div className="bg-emerald-950/80 rounded-2xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-emerald-300">
                {amountNeededForFreeDelivery > 0
                  ? `Add ₹${amountNeededForFreeDelivery.toFixed(2)} more for FREE delivery!`
                  : '🎉 You qualify for FREE delivery!'}
              </p>
              <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden border border-emerald-700/50">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.cartItemId} className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={item.image || ''} alt="" className="w-11 h-11 object-cover rounded-xl border border-emerald-100 bg-emerald-50/30 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-500 font-medium">₹{Number(item.price || 0).toFixed(2)} each</span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-700 shrink-0">₹{(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                <div className="flex items-center gap-1.5 bg-emerald-50/60 p-1 rounded-xl border border-emerald-200 shrink-0">
                  <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-emerald-100 text-slate-700 rounded-lg transition cursor-pointer"><Minus size={12}/></button>
                  <span className="text-xs font-black w-4 text-center text-slate-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-emerald-100 text-slate-700 rounded-lg transition cursor-pointer"><Plus size={12}/></button>
                </div>
              </div>
            ))}
          </div>

          {session ? (
            <div className="space-y-4 pt-3 border-t border-emerald-100">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-2">
                <MapPin size={16} className="text-emerald-700"/> Delivery Address
              </h4>
              
              <div className="text-slate-900">
                <CollapsedAddressSelector 
                  addresses={savedAddresses}
                  selectedAddressId={selectedAddressId}
                  onSelectAddressId={(id) => {
                    const selectedObj = savedAddresses.find(a => a.id === id);
                    if (selectedObj) handleSelectAddress(selectedObj);
                  }}
                  onAddNewAddress={() => setShowAddAddressBox(true)}
                />
              </div>

              {showAddAddressBox && (
                <form onSubmit={handleAddAddress} className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-2.5 text-xs text-slate-800 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                    <span>Add New Address</span>
                    <button type="button" onClick={() => setShowAddAddressBox(false)} className="text-slate-400 hover:text-slate-700"><X size={14}/></button>
                  </div>
                  <input type="text" placeholder="Title (Home/Work)" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.title} onChange={e => setNewAddressForm({...newAddressForm, title: e.target.value})} />
                  <button type="button" onClick={detectCustomerLocation} className="w-full bg-emerald-100 text-emerald-800 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-emerald-300 cursor-pointer">
                    Detect GPS Location
                  </button>
                  <input type="text" placeholder="House No." required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.house_no} onChange={e => setNewAddressForm({...newAddressForm, house_no: e.target.value})} />
                  <input type="text" placeholder="Ward / Colony Name" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.ward_no_name} onChange={e => setNewAddressForm({...newAddressForm, ward_no_name: e.target.value})} />
                  <input type="tel" placeholder="Phone Number" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.phone} onChange={e => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                  <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-black cursor-pointer">Save Address</button>
                </form>
              )}

              <div className="pt-2 border-t border-emerald-100 space-y-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Promo Code</h4>
                {appliedCoupon ? (
                  <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <div>
                      <span className="font-mono font-black text-emerald-800 text-xs">{appliedCoupon.code}</span>
                      <p className="text-[11px] text-emerald-600">Discount applied!</p>
                    </div>
                    <button onClick={removeCoupon} className="text-xs text-rose-600 font-bold hover:underline cursor-pointer">Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input 
                        type="text" placeholder="Enter coupon code" 
                        className="flex-1 border border-emerald-200 p-2 rounded-xl text-xs uppercase outline-none font-bold focus:border-emerald-500 bg-emerald-50/30 text-slate-900"
                        value={couponInput} onChange={e => setCouponInput(e.target.value)}
                      />
                      <button onClick={handleApplyCoupon} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer">Apply</button>
                    </div>

                    {availableCoupons.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Offers</span>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {availableCoupons.map(coupon => {
                            return (
                              <div key={coupon.id} className="bg-emerald-50/50 border border-emerald-200/80 p-2.5 rounded-2xl flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 bg-emerald-600 text-white rounded-xl shrink-0">
                                    <Tag size={12} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-slate-900 uppercase">{coupon.code}</span>
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {coupon.min_order_value ? `Min order ₹${coupon.min_order_value}` : 'No min order'} • {coupon.usage_limit_type === 'one_time' ? 'One-time use' : 'Multiple use'}
                                    </p>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => applySpecificCoupon(coupon.code)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition shadow-xs shrink-0 cursor-pointer"
                                >
                                  Apply
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
              <p className="text-xs font-bold text-amber-900">Please log in to complete your checkout.</p>
              <Link to="/login" className="inline-block bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm">Login Now</Link>
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        <div className="p-5 border-t border-emerald-100 bg-emerald-50/50 space-y-3 shadow-2xl">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Items Total:</span>
              <span>₹{cartSubtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount ({appliedCoupon?.code}):</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            {selectedAddressDistance !== null && (
              <div className="flex justify-between text-slate-500">
                <span>Store Distance:</span>
                <span className="font-bold text-slate-800">{selectedAddressDistance} KM</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Delivery Fee:</span>
              <span>{deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${(deliveryFee || 0).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-center text-base font-black text-slate-900 pt-2 border-t border-emerald-200">
              <span>To Pay:</span>
              <span className="text-emerald-700">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={session ? handleCheckout : () => { onClose(); navigate('/login'); }}
            disabled={checkingOut || (session && savedAddresses.length === 0)}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 transition duration-200 transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck size={16} />
            {checkingOut ? 'Placing Order...' : session ? 'Place Secure Order' : 'Login to Checkout'}
          </button>
        </div>

      </div>
    </div>
  );
}