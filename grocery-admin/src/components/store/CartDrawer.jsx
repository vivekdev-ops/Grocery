// src/components/store/CartDrawer.jsx
import { ShoppingCart, MapPin, X, Plus, Minus, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import CollapsedAddressSelector from '../CollapsedAddressSelector';

export default function CartDrawer({
  isOpen, onClose, cart, totalItemsCount, session,
  savedAddresses, selectedAddressId, handleSelectAddress,
  showAddAddressBox, setShowAddAddressBox, newAddressForm, setNewAddressForm,
  detectCustomerLocation, handleAddAddress, updateQuantity,
  appliedCoupon, couponInput, setCouponInput, handleApplyCoupon, removeCoupon,
  cartSubtotal, discountAmount, selectedAddressDistance, deliveryFee, cartTotal,
  checkingOut, handleCheckout, navigate
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300 font-sans">
      <div className="bg-white text-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-emerald-100 transition-transform duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-700" /> My Cart ({totalItemsCount})
          </h3>
          <button onClick={onClose} className="p-2 bg-emerald-100/60 rounded-full text-slate-600 hover:text-slate-900 transition">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-[#F0FDF4]/30">
          
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
                  <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-emerald-100 text-slate-700 rounded-lg transition"><Minus size={12}/></button>
                  <span className="text-xs font-black w-4 text-center text-slate-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-emerald-100 text-slate-700 rounded-lg transition"><Plus size={12}/></button>
                </div>
              </div>
            ))}
          </div>

          {session ? (
            <div className="space-y-4 pt-3 border-t border-emerald-100">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-2">
                <MapPin size={16} className="text-emerald-700"/> Delivery Address
              </h4>
              
              {/* Collapsed Default Address Selector */}
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

              {/* Add Address Form Box if toggled */}
              {showAddAddressBox && (
                <form onSubmit={handleAddAddress} className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-2.5 text-xs text-slate-800 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center font-bold text-slate-900 mb-1">
                    <span>Add New Address</span>
                    <button type="button" onClick={() => setShowAddAddressBox(false)} className="text-slate-400 hover:text-slate-700"><X size={14}/></button>
                  </div>
                  <input type="text" placeholder="Title (Home/Work)" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.title} onChange={e => setNewAddressForm({...newAddressForm, title: e.target.value})} />
                  <button type="button" onClick={detectCustomerLocation} className="w-full bg-emerald-100 text-emerald-800 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-emerald-300">
                    Detect GPS Location
                  </button>
                  <input type="text" placeholder="House No." required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.house_no} onChange={e => setNewAddressForm({...newAddressForm, house_no: e.target.value})} />
                  <input type="text" placeholder="Ward / Colony Name" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.ward_no_name} onChange={e => setNewAddressForm({...newAddressForm, ward_no_name: e.target.value})} />
                  <input type="tel" placeholder="Phone Number" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-emerald-50/20 text-slate-900 outline-none focus:border-emerald-500" value={newAddressForm.phone} onChange={e => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                  <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-black">Save Address</button>
                </form>
              )}

              {/* Coupon Section */}
              <div className="pt-2 border-t border-emerald-100">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-2">Promo Code</h4>
                {appliedCoupon ? (
                  <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <div>
                      <span className="font-mono font-black text-emerald-800 text-xs">{appliedCoupon.code}</span>
                      <p className="text-[11px] text-emerald-600">Discount applied!</p>
                    </div>
                    <button onClick={removeCoupon} className="text-xs text-rose-600 font-bold hover:underline">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="Enter coupon code" 
                      className="flex-1 border border-emerald-200 p-2 rounded-xl text-xs uppercase outline-none font-bold focus:border-emerald-500 bg-emerald-50/30 text-slate-900"
                      value={couponInput} onChange={e => setCouponInput(e.target.value)}
                    />
                    <button onClick={handleApplyCoupon} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition">Apply</button>
                  </div>
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
              <span>{deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${deliveryFee.toFixed(2)}`}</span>
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
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 transition duration-200 transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            {checkingOut ? 'Placing Order...' : session ? 'Place Secure Order' : 'Login to Checkout'}
          </button>
        </div>

      </div>
    </div>
  );
}