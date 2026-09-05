// src/components/InvoiceModal.jsx
import { X, Printer, CheckCircle2, ShieldCheck, MapPin, Phone, Mail, Sparkles } from 'lucide-react';

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  
  // Calculate subtotal, MRP subtotal, and total item savings
  let calculatedSubtotal = 0;
  let calculatedMrpSubtotal = 0;

  items.forEach(item => {
    const qty = Number(item.quantity || 1);
    const sellingPrice = Number(item.price || 0);
    calculatedSubtotal += sellingPrice * qty;

    // Correctly check item/variant/product MRP fields
    const itemMrp = Number(
      item.mrp || 
      item.variant?.mrp || 
      item.variants?.mrp || 
      item.products?.mrp || 
      item.product?.mrp || 
      sellingPrice
    );

    calculatedMrpSubtotal += (itemMrp > sellingPrice ? itemMrp : sellingPrice) * qty;
  });

  const subtotal = calculatedSubtotal;
  const delivery = Number(order.delivery_fee || order.delivery_charge || 0);
  const explicitDiscount = Number(order.discount || order.discount_amount || 0);
  
  // Total product savings (MRP total - Selling total) + any coupon/explicit discount
  const productSavings = Math.max(0, calculatedMrpSubtotal - calculatedSubtotal);
  const totalSavings = productSavings + explicitDiscount;

  const tax = Number(order.tax || order.tax_amount || 0);
  const total = Number(order.total_amount || order.grand_total || (subtotal + delivery + tax - explicitDiscount));

  const formattedDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-IN');

  const invoiceNo = `INV-${String(order.id || '0000').slice(0, 8).toUpperCase()}`;
  const rawOrderId = String(order.id || '');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-emerald-100 my-8 flex flex-col max-h-[94vh]">
        
        {/* Modal Header Actions (Hidden during print) */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white px-6 py-4 flex justify-between items-center print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-white block">Official Tax Invoice</span>
              <span className="text-[10px] text-emerald-300 font-medium">KD Store Quick Commerce Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()} 
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-2 bg-emerald-900/60 hover:bg-emerald-900 rounded-full text-emerald-200 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-6 sm:p-12 bg-white text-stone-800 space-y-8 overflow-y-auto flex-1 print:p-0">
          
          {/* Watermark/Brand Top Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-emerald-100 pb-6 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-emerald-600/25">
                KD
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">KD Store Quick Commerce</h1>
                <p className="text-xs text-emerald-700 font-bold mt-1">10-Minute Lightning Grocery Delivery</p>
              </div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-3xl border border-emerald-200 text-right sm:text-right w-full sm:w-auto space-y-0.5">
              <h2 className="text-lg font-black text-emerald-900 font-mono">{invoiceNo}</h2>
              <p className="text-[11px] text-stone-500 font-bold"><strong className="text-stone-700">Date:</strong> {formattedDate}</p>
              <p className="text-[10px] text-emerald-800 font-mono font-black">Order ID: #{rawOrderId}</p>
            </div>
          </div>

          {/* Company Details & Billing/Shipping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Store Details */}
            <div className="bg-stone-50/80 border border-stone-200/80 p-5 rounded-3xl space-y-2 text-xs">
              <span className="font-black text-emerald-800 uppercase tracking-wider block text-[10px]">Issued By</span>
              <p className="font-black text-slate-900 text-sm">KD Store Operations</p>
              <div className="text-stone-600 space-y-1 font-medium pt-1">
                <p className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600 shrink-0" /> <strong>GSTIN:</strong> 07AAAAA0000A1Z5</p>
                <p className="flex items-center gap-1.5"><Mail size={13} className="text-emerald-600 shrink-0" /> support@kdstore.com</p>
                <p className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-600 shrink-0" /> +91 98765 43210</p>
              </div>
            </div>

            {/* Column 2: Billed To / Customer */}
            <div className="bg-emerald-50/30 border border-emerald-200/80 p-5 rounded-3xl space-y-2 text-xs">
              <span className="font-black text-emerald-800 uppercase tracking-wider block text-[10px]">Billed To / Customer</span>
              <p className="font-black text-slate-900 text-sm truncate">{order.customer_email || 'Valued Customer'}</p>
              <div className="text-stone-600 space-y-1 font-medium pt-1">
                <p className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-600 shrink-0" /> <strong>Phone:</strong> {order.phone || 'N/A'}</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> <strong>Payment:</strong> Prepaid / COD Verified</p>
              </div>
            </div>

            {/* Column 3: Delivery Address */}
            <div className="bg-stone-50/80 border border-stone-200/80 p-5 rounded-3xl space-y-2 text-xs">
              <span className="font-black text-emerald-800 uppercase tracking-wider block text-[10px]">Delivery Destination</span>
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="font-medium text-stone-700 leading-snug">
                  {order.delivery_address || order.address || 'Address info registered with order profile.'}
                </p>
              </div>
            </div>

          </div>

          {/* Itemized Table */}
          <div className="border border-emerald-100 rounded-3xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white text-[11px] uppercase tracking-wider font-black">
                  <th className="py-4 px-4">Item Description</th>
                  <th className="py-4 px-4 text-center">Unit / Variant</th>
                  <th className="py-4 px-4 text-center">Qty</th>
                  <th className="py-4 px-4 text-right">MRP</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-xs font-medium text-stone-800">
                {items.map((item, idx) => {
                  const itemQty = Number(item.quantity || 1);
                  const itemPrice = Number(item.price || 0);
                  const itemMrp = Number(
                    item.mrp || 
                    item.variant?.mrp || 
                    item.variants?.mrp || 
                    item.products?.mrp || 
                    item.product?.mrp || 
                    itemPrice
                  );
                  const itemTotal = itemPrice * itemQty;
                  const itemDiscountPct = itemMrp > itemPrice ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100) : 0;

                  return (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-4 px-4 font-black text-slate-900">
                        <div className="flex items-center gap-3">
                          {item.products?.image_url && (
                            <img src={item.products.image_url} alt="" className="w-9 h-9 rounded-xl object-cover bg-white border border-emerald-200 shrink-0" />
                          )}
                          <div>
                            <span className="block">{item.products?.name || item.title || 'Product Item'}</span>
                            {itemDiscountPct > 0 && (
                              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block border border-emerald-200">
                                {itemDiscountPct}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-stone-600 font-bold">
                        <span className="bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">{item.variant_label || 'Standard'}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-black text-slate-900">{itemQty}</td>
                      <td className="py-4 px-4 text-right text-stone-400 line-through font-bold">
                        {itemMrp > itemPrice ? `₹${itemMrp.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-right font-bold">₹{itemPrice.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right font-black text-emerald-700 text-sm">₹{itemTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-80 bg-emerald-50/40 p-6 rounded-3xl border border-emerald-200 space-y-3 text-xs shadow-2xs">
              <div className="flex justify-between text-stone-600 font-bold">
                <span>Item Subtotal</span>
                <span className="text-slate-900 font-black">₹{subtotal.toFixed(2)}</span>
              </div>
              
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700 font-black bg-emerald-100/60 p-2 rounded-xl border border-emerald-200">
                  <span>🎉 Total Savings</span>
                  <span>−₹{totalSavings.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600 font-bold">
                <span>Delivery Charge</span>
                <span>{delivery === 0 ? <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">FREE</strong> : `₹${delivery.toFixed(2)}`}</span>
              </div>
              
              {tax > 0 && (
                <div className="flex justify-between text-stone-600 font-bold">
                  <span>Taxes (GST Included)</span>
                  <span className="text-slate-900">₹{tax.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-slate-900 font-black text-base pt-3 border-t-2 border-emerald-200">
                <span>Grand Total</span>
                <span className="text-emerald-700 text-lg">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes & Signature */}
          <div className="pt-8 border-t-2 border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-[11px] text-stone-500">
            <div className="space-y-1">
              <p className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Terms & Conditions:</p>
              <p className="font-medium">1. Goods once sold will only be taken back as per store return policy guidelines.</p>
              <p className="font-medium">2. This is a computer-generated official tax invoice and requires no physical signature.</p>
            </div>
            <div className="text-right sm:text-right w-full sm:w-auto bg-stone-50 p-4 rounded-3xl border border-stone-200">
              <div className="font-serif italic font-black text-slate-900 text-base mb-0.5">KD Store Auth.</div>
              <div className="border-t border-stone-300 pt-1 font-black text-stone-600 uppercase tracking-widest text-[9px]">Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}