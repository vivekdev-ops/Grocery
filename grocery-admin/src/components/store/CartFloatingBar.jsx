// src/components/store/CartFloatingBar.jsx
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function CartFloatingBar({ totalItemsCount, totalPrice, onOpenCart }) {
  if (!totalItemsCount || totalItemsCount <= 0) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 z-40 max-w-md mx-auto animate-bounce-short">
      <div 
        onClick={onOpenCart}
        className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between cursor-pointer border border-emerald-400/40 hover:scale-[1.02] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative shadow-inner">
            <ShoppingBag size={22} className="text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full font-black flex items-center justify-center shadow-md animate-pulse">
              {totalItemsCount}
            </span>
          </div>
          <div>
            <h4 className="font-black text-xs md:text-sm tracking-tight leading-none">
              {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} in Cart
            </h4>
            <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
              Total: ₹{totalPrice ? totalPrice.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/15 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase backdrop-blur-md">
          <span>View Cart</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}