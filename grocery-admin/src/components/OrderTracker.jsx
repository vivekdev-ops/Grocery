// src/components/OrderTracker.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle, Truck, Package, Search } from 'lucide-react';

export default function OrderTracker() {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!orderIdInput.trim()) return;

    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .ilike('id', `${orderIdInput.trim()}%`)
      .single();

    if (error || !data) {
      setError('Order not found. Please check your order ID.');
      setOrder(null);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  const steps = ['processing', 'shipped', 'delivered'];
  const getCurrentStepIndex = (status) => {
    if (status === 'shipped') return 1;
    if (status === 'delivered') return 2;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        <div className="bg-white rounded-3xl border p-8 shadow-xs text-center space-y-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Track Your Order</h2>
          <p className="text-xs text-gray-500">Enter your order ID to view live status and fulfillment details.</p>

          <form onSubmit={handleTrackOrder} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Enter Order ID..."
                value={orderIdInput}
                onChange={e => setOrderIdInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-green-600 outline-none transition"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-2xl text-xs transition shadow-md shadow-green-600/20"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>

          {error && <p className="text-xs font-medium text-red-600 bg-red-50 p-3.5 rounded-2xl">{error}</p>}
        </div>

        {order && (
          <div className="bg-white rounded-3xl border p-8 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Order ID</p>
                <p className="font-mono font-bold text-sm text-gray-900">#{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase">Total Amount</p>
                <p className="font-black text-base text-gray-900">₹{order.total_amount?.toFixed(2)}</p>
              </div>
            </div>

            {/* Visual Step Tracker Bar */}
            <div className="py-4">
              <div className="flex justify-between relative">
                {steps.map((st, idx) => {
                  const currentIdx = getCurrentStepIndex(order.status);
                  const isCompleted = idx <= currentIdx;
                  return (
                    <div key={st} className="flex flex-col items-center z-10">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition ${
                        isCompleted ? 'bg-green-600 text-white shadow-md shadow-green-600/20' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {idx === 0 && <Package size={16} />}
                        {idx === 1 && <Truck size={16} />}
                        {idx === 2 && <CheckCircle size={16} />}
                      </div>
                      <span className={`text-[11px] font-bold mt-2 uppercase tracking-wider ${isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery & Items Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-1.5">
              <p className="font-bold text-gray-700 uppercase tracking-wider mb-1">Shipping Details</p>
              <p className="text-gray-600">📍 {order.delivery_address || 'N/A'}</p>
              <p className="text-gray-600">📞 {order.phone || 'N/A'}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}