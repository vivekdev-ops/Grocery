// src/components/PortalBottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, ClipboardList } from 'lucide-react';

export default function PortalBottomNav({ totalItemsCount = 0, totalPrice = 0, onOpenCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath.startsWith('/admin') || currentPath.startsWith('/shopkeeper') || currentPath.startsWith('/delivery')) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg pb-safe">
      <div className="max-w-xl mx-auto px-4 py-1.5 flex items-center justify-around">
        
        {/* Home */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative ${
            currentPath === '/' ? 'text-emerald-600 font-black' : 'text-stone-400 hover:text-stone-700 font-medium'
          }`}
        >
          <Home size={18} className={currentPath === '/' ? 'text-emerald-600 scale-110' : ''} />
          <span className="text-[9.5px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* Orders */}
        <button
          type="button"
          onClick={() => navigate('/account/orders')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative ${
            currentPath === '/account/orders' ? 'text-emerald-600 font-black' : 'text-stone-400 hover:text-stone-700 font-medium'
          }`}
        >
          <ClipboardList size={18} className={currentPath === '/account/orders' ? 'text-emerald-600 scale-110' : ''} />
          <span className="text-[9.5px] tracking-tight mt-0.5">Orders</span>
        </button>

        {/* Cart Button with Dynamic Badge Count */}
        <button
          type="button"
          onClick={() => {
            if (typeof onOpenCart === 'function') {
              onOpenCart();
            } else {
              window.dispatchEvent(new CustomEvent('openCartDrawer'));
            }
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative text-stone-400 hover:text-stone-700 font-medium"
        >
          <div className="relative">
            <ShoppingBag size={18} />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-black shadow-xs z-20">
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] tracking-tight mt-0.5">Cart</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => navigate('/account/profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative ${
            currentPath === '/account/profile' ? 'text-emerald-600 font-black' : 'text-stone-400 hover:text-stone-700 font-medium'
          }`}
        >
          <User size={18} className={currentPath === '/account/profile' ? 'text-emerald-600 scale-110' : ''} />
          <span className="text-[9.5px] tracking-tight mt-0.5">Profile</span>
        </button>

      </div>
    </div>
  );
}