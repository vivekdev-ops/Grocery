// src/components/InvoiceModal.jsx
import { X, Printer } from 'lucide-react';

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const delivery = Number(order.delivery_fee || order.delivery_charge || 0);
  const discount = Number(order.discount || order.discount_amount || 0);
  const tax = Number(order.tax || order.tax_amount || 0);
  const total = Number(order.total_amount || order.grand_total || (subtotal + delivery + tax - discount));

  const formattedDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');

  const invoiceNo = `INV-${String(order.id || '0000').slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden font-sans border border-stone-100 my-8">
        
        {/* Modal Header Actions (Hidden during print) */}
        <div className="bg-stone-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-stone-300">Tax Invoice Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-300 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-8 sm:p-10 bg-white text-stone-800 space-y-8 print:p-0">
          
          {/* Company & Invoice Top Meta */}
          <div className="flex justify-between items-start border-b border-stone-200 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md">
                  KD
                </div>
                <div>
                  <h1 className="text-lg font-black text-stone-900 tracking-tight leading-none">KD Store Quick Commerce</h1>
                  <p className="text-[11px] text-stone-500 mt-1 font-medium">10-Minute Grocery Delivery Service</p>
                </div>
              </div>
              <div className="text-xs text-stone-500 mt-4 space-y-0.5">
                <p><strong className="text-stone-700">GSTIN:</strong> 07AAAAA0000A1Z5</p>
                <p><strong className="text-stone-700">Support:</strong> support@kdstore.com | +91 98765 43210</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-black text-stone-900">{invoiceNo}</h2>
              <p className="text-xs text-stone-500 mt-1"><strong className="text-stone-700">Date:</strong> {formattedDate}</p>
            </div>
          </div>

          {/* Billing & Shipping Grid */}
          <div className="grid grid-cols-2 gap-6 bg-stone-50/70 border border-stone-100 p-5 rounded-2xl text-xs">
            <div>
              <span className="font-extrabold text-stone-400 uppercase tracking-wider block mb-1.5 text-[10px]">Billed To / Customer</span>
              <p className="font-bold text-stone-900 text-sm">{order.customer_email || 'Valued Customer'}</p>
              <p className="text-stone-600 mt-0.5">Phone: {order.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="font-extrabold text-stone-400 uppercase tracking-wider block mb-1.5 text-[10px]">Delivery Address</span>
              <p className="font-medium text-stone-700 leading-relaxed">
                {order.delivery_address || order.address || 'Address info registered with order profile.'}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-200 text-[10px] uppercase tracking-wider text-stone-500 font-black">
                  <th className="py-3 px-2">Item Description</th>
                  <th className="py-3 px-2 text-center">Unit / Variant</th>
                  <th className="py-3 px-2 text-center">Qty</th>
                  <th className="py-3 px-2 text-right">Price</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-medium text-stone-800">
                {items.map((item, idx) => {
                  const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
                  return (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3.5 px-2 font-bold text-stone-900">{item.products?.name || item.title || 'Product Item'}</td>
                      <td className="py-3.5 px-2 text-center text-stone-500">{item.variant_label || 'Standard'}</td>
                      <td className="py-3.5 px-2 text-center font-bold">{item.quantity}</td>
                      <td className="py-3.5 px-2 text-right">₹{Number(item.price || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-2 text-right font-black text-stone-900">₹{itemTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation Summary */}
          <div className="flex justify-end pt-2 border-t border-stone-200">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Item Subtotal</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount Savings</span>
                  <span>−₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span>{delivery === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${delivery.toFixed(2)}`}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Taxes (GST)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-black text-sm pt-3 border-t-2 border-stone-900">
                <span>Grand Total</span>
                <span className="text-emerald-700 text-base">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes & Signature */}
          <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[11px] text-stone-500">
            <div>
              <p className="font-bold text-stone-700">Terms & Conditions:</p>
              <p className="mt-0.5">1. Goods once sold will only be taken back as per return policy guidelines.</p>
              <p>2. This is a computer-generated tax invoice and requires no physical signature.</p>
            </div>
            <div className="text-right sm:text-right w-full sm:w-auto">
              <div className="font-serif italic font-bold text-stone-800 text-sm mb-1">KD Store Auth.</div>
              <div className="border-t border-stone-300 pt-1 font-bold text-stone-600 uppercase tracking-wider text-[10px]">Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}