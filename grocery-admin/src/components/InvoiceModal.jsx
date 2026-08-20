// src/components/InvoiceModal.jsx
import { Printer, X } from 'lucide-react';

export default function InvoiceModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.order_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.total_amount;
  const estimatedTax = subtotal * 0.05;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          /* Hide the rest of the application layout */
          body > *:not(#root) {
            display: none !important;
          }
          /* Hide the modal backdrop and action buttons */
          .print\\:hidden {
            display: none !important;
          }
          /* Isolate and display only the single invoice content container */
          #single-invoice-receipt {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15px !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `} catch (e) {}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full">
        
        {/* Modal Header Actions */}
        <div className="flex justify-between items-center p-6 border-b print:hidden bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Tax Invoice</h3>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition">
              <Printer size={16} /> Print / Download
            </button>
            <button onClick={onClose} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300"><X size={18} /></button>
          </div>
        </div>

        {/* Single Invoice Printable Card */}
        <div id="single-invoice-receipt" className="p-8 overflow-y-auto flex-1 space-y-6 text-sm text-gray-800">
          
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h1 className="text-2xl font-black text-[#0c831f] uppercase tracking-wider">QuickBazaar</h1>
              <p className="text-xs text-gray-500 mt-0.5">10-Minute Instant Grocery Delivery</p>
              <p className="text-xs text-gray-400 mt-1">GSTIN: 07AAAAA0000A1Z5</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-900">INVOICE</h2>
              <p className="text-xs font-mono font-bold text-gray-600 mt-1">#{order.id.toUpperCase()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Date: {new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">BILLED TO</h4>
              <p className="font-bold text-gray-900">{order.customer_email || 'Customer'}</p>
              <p className="text-xs text-gray-600 mt-0.5">Phone: {order.phone || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DELIVERY ADDRESS</h4>
              <p className="text-xs text-gray-700 leading-relaxed">{order.delivery_address || 'Not specified'}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-400 font-bold">
                <th className="py-3">ITEM DESCRIPTION</th>
                <th className="py-3 text-center">QTY</th>
                <th className="py-3 text-right">PRICE</th>
                <th className="py-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {order.order_items?.map(item => (
                <tr key={item.id}>
                  <td className="py-3 font-medium text-gray-900">{item.products?.name || 'Product'}</td>
                  <td className="py-3 text-center font-bold text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t pt-4 space-y-2 text-right">
            <div className="flex justify-between text-gray-600 max-w-xs ml-auto">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 max-w-xs ml-auto">
              <span>Estimated GST (5%):</span>
              <span>₹{estimatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 max-w-xs ml-auto">
              <span>Delivery Fee:</span>
              <span>{order.total_amount > subtotal ? `₹${(order.total_amount - subtotal).toFixed(2)}` : 'FREE'}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-black text-gray-900 pt-2 border-t max-w-xs ml-auto">
              <span>Grand Total:</span>
              <span className="text-[#0c831f]">₹{order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-6 text-center text-xs text-gray-400">
            <p>Thank you for shopping with QuickBazaar! This is a computer-generated tax invoice.</p>
          </div>

        </div>
      </div>
    </div>
  );
}