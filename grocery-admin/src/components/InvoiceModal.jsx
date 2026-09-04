// src/components/InvoiceModal.jsx
import { X, Printer, ShieldCheck, Tag } from 'lucide-react';

export default function InvoiceModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  /* ─── helpers ─────────────────────────────────────────────────────────── */

  /**
   * Resolve the MRP for one order_item row.
   * Priority:
   *  1. Matching product_variant row (joined as products.product_variants[])
   *  2. product-level mrp column
   *  3. Fall back to the stored offer price (0 % discount shown)
   */
  function resolveItemMrp(item) {
    const offerPrice = Number(item.price || 0);

    // Try to find the matching variant via variant_id or variant_label
    const variants = item.products?.product_variants || [];
    let variant = null;
    if (item.variant_id) {
      variant = variants.find(v => v.id === item.variant_id);
    }
    if (!variant && item.variant_label) {
      variant = variants.find(
        v => v.unit_label === item.variant_label || v.label === item.variant_label
      );
    }

    if (variant && Number(variant.mrp || 0) > 0) return Number(variant.mrp);
    if (Number(item.products?.mrp || 0) > 0)     return Number(item.products.mrp);
    return offerPrice; // no MRP data → treat as 0 % off
  }

  /* ─── per-item calculations ────────────────────────────────────────────── */
  const lineItems = (order.order_items || []).map(item => {
    const qty        = Number(item.quantity || 1);
    const offerPrice = Number(item.price    || 0);
    const mrp        = resolveItemMrp(item);
    const discPct    = mrp > offerPrice ? Math.round(((mrp - offerPrice) / mrp) * 100) : 0;
    const variantLabel =
      item.variant_label ||
      (item.products?.product_variants || []).find(v => v.id === item.variant_id)?.unit_label ||
      '';

    return { item, qty, offerPrice, mrp, discPct, variantLabel };
  });

  /* ─── bill totals ──────────────────────────────────────────────────────── */
  const itemSubtotal   = lineItems.reduce((s, r) => s + r.offerPrice * r.qty, 0);
  const totalMrpSum    = lineItems.reduce((s, r) => s + r.mrp        * r.qty, 0);
  const productSavings = Math.max(0, totalMrpSum - itemSubtotal);

  // Prefer persisted columns; fall back to derivation for old orders
  const couponCode     = order.coupon_code || null;
  const deliveryFee    = Number(order.delivery_fee ?? 0);

  // discount_amount: use persisted value if available, else derive from total
  let discountAmount = Number(order.discount_amount ?? 0);
  if (!discountAmount && couponCode) {
    // old order: back-calculate coupon discount
    // total_amount = itemSubtotal - discount + deliveryFee
    const derived = itemSubtotal + deliveryFee - Number(order.total_amount || 0);
    if (derived > 0) discountAmount = derived;
  }

  const grandTotal     = Number(order.total_amount || 0);
  const totalSavings   = productSavings + discountAmount;

  /* ─── display helpers ──────────────────────────────────────────────────── */
  const formattedId = order.id
    ? `ORD${order.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`
    : 'N/A';

  /* ─── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-[1100] animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-emerald-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center shadow-sm text-sm">
              KD
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm block leading-none">KD Store</span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Tax Invoice</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-200"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-600 transition cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6 text-xs text-slate-700 font-sans">

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">KD Store Invoice</h2>
            <p className="text-[11px] text-emerald-700 font-bold">Lightning-Fast 10-Minute Grocery Delivery</p>
          </div>

          {/* Order meta */}
          <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2">
            {[
              ['Order ID',       formattedId],
              ['Date & Time',    new Date(order.created_at).toLocaleString()],
              ['Customer Email', order.customer_email],
              ['Contact Phone',  order.phone || 'N/A'],
              ['Status',         (order.status || 'pending').toUpperCase()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-stone-400 font-bold uppercase text-[10px]">{label}</span>
                <span className="font-medium text-slate-800 text-right max-w-[60%] break-words">{val}</span>
              </div>
            ))}

            {couponCode && (
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-emerald-200">
                <span className="text-stone-400 font-bold uppercase text-[10px]">Applied Coupon</span>
                <span className="inline-flex items-center gap-1 font-mono font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                  <Tag size={10} /> {couponCode}
                </span>
              </div>
            )}
          </div>

          {/* Delivery address */}
          <div className="space-y-1.5">
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Delivery Address</span>
            <p className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 leading-snug">
              {order.delivery_address || 'N/A'}
            </p>
          </div>

          {/* Item table */}
          <div className="space-y-2">
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Itemized Breakdown</span>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] uppercase text-stone-400 font-black">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">MRP</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-center">Disc</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {lineItems.map(({ item, qty, offerPrice, mrp, discPct, variantLabel }, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-bold text-slate-900">
                      {item.products?.name || 'Item'}
                      {variantLabel && (
                        <span className="block mt-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 rounded-md w-max">
                          {variantLabel}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-center font-mono">{qty}</td>
                    <td className="py-2.5 text-right text-stone-500">
                      {mrp > offerPrice
                        ? <span className="line-through">₹{mrp.toFixed(2)}</span>
                        : <span className="text-stone-400">—</span>}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">₹{offerPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-center">
                      {discPct > 0 ? (
                        <span className="bg-rose-50 text-rose-700 font-black text-[10px] px-2 py-0.5 rounded-lg border border-rose-200">
                          {discPct}% OFF
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      ₹{(offerPrice * qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill summary */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex justify-between text-stone-600">
              <span>Item Total</span>
              <span className="font-bold text-stone-900">₹{itemSubtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Tag size={11} />
                  Coupon Discount{couponCode ? ` (${couponCode})` : ''}
                </span>
                <span>−₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-600">
              <span>Delivery Charges</span>
              <span className={`font-bold ${deliveryFee === 0 ? 'text-emerald-600' : 'text-stone-900'}`}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between pt-3 border-t border-stone-200 font-black text-slate-900 text-sm">
              <span>Grand Total Paid</span>
              <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
            </div>

            {totalSavings > 0 && (
              <div className="mt-2 pt-3 border-t border-emerald-200 bg-emerald-50/70 p-3 rounded-xl flex items-center justify-between text-emerald-900 font-black">
                <span>🎉 Total Savings on this Order</span>
                <span className="text-emerald-700 text-sm">₹{totalSavings.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-stone-100 text-[10px] text-stone-400 space-y-1">
            <p className="flex items-center justify-center gap-1 font-bold text-emerald-700">
              <ShieldCheck size={14} /> Verified Secure Transaction
            </p>
            <p>Thank you for shopping with KD Store!</p>
          </div>

        </div>

        <div className="print:hidden pt-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
          >
            Close Invoice
          </button>
        </div>

      </div>
    </div>
  );
}
