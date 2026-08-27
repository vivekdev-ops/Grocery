// src/components/OrderDetailsModal.jsx
import { X, FileText, Ban, Star, Truck, User, Mail, Phone } from 'lucide-react';

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  userReviewsMap,
  setReviewModalProduct,
  handleReorder,
  setSelectedInvoiceOrder,
  handleCancelOrder,
  assignedAgent // Optional: Pass the resolved delivery agent object containing name, email, and phone
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <FileText size={16} className="text-emerald-700" /> Order #{order.id.slice(0, 8)} Details
          </h3>
          <button onClick={onClose} className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 transition">
            <X size={16}/>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          
          {/* Status Badge */}
          <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 flex justify-between items-center">
            <span className="text-slate-500 font-bold">Order Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {order.status}
            </span>
          </div>

          {/* Cancellation Remark if cancelled */}
          {order.status === 'cancelled' && (
            <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1">
              <span className="text-rose-900 font-black uppercase text-[10px] tracking-wider block">Cancellation Reason</span>
              <p className="text-rose-700 font-medium leading-snug">
                {order.cancellation_remark || 'No specific remark provided.'}
              </p>
            </div>
          )}

          {/* Delivery OTP verification */}
          {order.otp && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex justify-between items-center">
              <span className="text-emerald-900 font-bold">Delivery Verification OTP:</span>
              <span className="font-mono font-black text-emerald-700 text-sm tracking-widest bg-white px-3 py-1 rounded-xl border border-emerald-200">
                {order.otp}
              </span>
            </div>
          )}

          {/* ASSIGNED DELIVERY AGENT COMPLETE DETAILS (NAME, EMAIL, PHONE) */}
          <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200 space-y-2">
            <p className="text-blue-900 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Truck size={14} className="text-blue-700" /> Assigned Delivery Agent
            </p>
            {assignedAgent ? (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <User size={13} className="text-blue-600 shrink-0" />
                  <span>{assignedAgent.name || assignedAgent.full_name || 'Delivery Staff'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Mail size={13} className="text-blue-600 shrink-0" />
                  <span>{assignedAgent.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-mono text-xs">
                  <Phone size={13} className="text-blue-600 shrink-0" />
                  <span>{assignedAgent.phone || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No delivery agent assigned yet.</p>
            )}
          </div>

          {/* Ordered Line Items */}
          <div className="space-y-1">
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Ordered Items</span>
            <div className="space-y-2 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100 max-h-48 overflow-y-auto">
              {order.order_items?.map(item => {
                const itemImages = item.products?.images || item.products?.gallery || [item.products?.image_url].filter(Boolean);
                const itemImg = itemImages[0] || '';
                const hasReviewed = userReviewsMap ? userReviewsMap[item.product_id] : null;

                return (
                  <div key={item.id} className="flex flex-col gap-2 py-2 border-b border-emerald-100 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={itemImg} alt="" className="w-10 h-10 object-cover rounded-xl border border-emerald-200 bg-white shrink-0" />
                        <div>
                          <span className="font-black text-slate-900 block line-clamp-1">{item.products?.name || 'Item'}</span>
                          <span className="text-slate-500 font-medium text-[11px]">Qty: {item.quantity} • ₹{item.price * item.quantity}</span>
                        </div>
                      </div>

                      {order.status === 'delivered' && item.products && setReviewModalProduct && (
                        <button
                          onClick={() => setReviewModalProduct(item.products)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                            hasReviewed 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Star size={12} className={hasReviewed ? "fill-amber-500 text-amber-500" : ""} />
                          {hasReviewed ? 'Edit Review' : 'Rate Item'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer & Delivery Address */}
          <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Customer & Delivery Address</p>
            <p className="text-slate-900 font-bold">{order.customer_email || 'Guest'}</p>
            <p className="text-slate-800 font-medium leading-snug mt-0.5">{order.delivery_address}</p>
            <p className="text-slate-500 font-mono text-[11px] pt-0.5">Phone: {order.phone || 'N/A'}</p>
          </div>

          {/* Bill Total */}
          <div className="pt-2 border-t border-emerald-100 flex justify-between items-center font-black text-sm text-slate-900">
            <span>Total Amount Paid:</span>
            <span className="text-emerald-700">₹{order.total_amount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {order.status === 'delivered' && handleReorder && (
            <button 
              onClick={() => handleReorder(order)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md"
            >
              Reorder All Items
            </button>
          )}

          {order.status === 'delivered' && setSelectedInvoiceOrder && (
            <button 
              onClick={() => setSelectedInvoiceOrder(order)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-2xl font-bold text-xs border border-slate-200 transition"
            >
              View Tax Invoice / Bill
            </button>
          )}

          {order.status === 'pending' && handleCancelOrder && (
            <button 
              onClick={() => handleCancelOrder(order.id)}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Ban size={15} /> Cancel Order
            </button>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}