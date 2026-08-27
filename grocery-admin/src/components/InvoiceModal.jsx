// src/components/InvoiceModal.jsx
import { X, Printer, ShieldCheck } from 'lucide-react';
import ValueGoLogo from './ValueGoLogo';

export default function InvoiceModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header actions */}
        <div className="flex justify-between items-center border-b pb-4 print:hidden">
          <div className="scale-90 origin-left">
            <ValueGoLogo />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="space-y-6 text-xs text-slate-700 font-sans">
          
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-900 uppercase">ValueGo Tax Invoice</h2>
            <p className="text-[11px] text-slate-400">Instant Quick-Commerce Delivery</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Order ID:</span>
              <span className="font-mono font-bold text-slate-900">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Date:</span>
              <span className="font-medium text-slate-800">{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Customer Email:</span>
              <span className="font-medium text-slate-800">{order.customer_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Phone:</span>
              <span className="font-medium text-slate-800">{order.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Delivery Address</span>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 leading-snug">
              {order.delivery_address}
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Itemized Breakdown</span>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-black">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {order.order_items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-bold text-slate-900">{item.products?.name || 'Item'}</td>
                    <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 text-right">₹{item.price}</td>
                    <td className="py-2.5 text-right font-bold">₹{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1 text-right">
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t">
              <span>Total Paid:</span>
              <span className="text-emerald-700">₹{order.total_amount}</span>
            </div>
          </div>

          <div className="text-center pt-4 border-t text-[10px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1 font-bold text-emerald-700">
              <ShieldCheck size={14} /> Verified Secure Transaction
            </p>
            <p>Thank you for shopping with ValueGo!</p>
          </div>

        </div>

        <div className="print:hidden pt-2">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold text-xs shadow-md transition"
          >
            Close Invoice
          </button>
        </div>

      </div>
    </div>
  );
}