// src/components/PortalBottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, ClipboardList } from 'lucide-react';

export default function PortalBottomNav({ totalItemsCount = 0, totalPrice = 0, onOpenCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Don't show bottom nav on admin or driver portals
  if (currentPath.startsWith('/admin') || currentPath.startsWith('/shopkeeper') || currentPath.startsWith('/delivery')) {
    return null;
  }

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Orders', path: '/account/orders', icon: ClipboardList },
    { label: 'Cart', action: onOpenCart, icon: ShoppingBag, badge: totalItemsCount },
    { label: 'Profile', path: '/account/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg pb-safe">
      
      {/* Floating Cart Strip (Shows automatically when items are added) */}
      {totalItemsCount > 0 && onOpenCart && (
        <div className="px-3 pt-2 pb-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-black text-xs relative">
              <ShoppingBag size={16} />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {totalItemsCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black leading-none">{totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}</p>
              <p className="text-[9px] text-emerald-100 font-medium">₹{totalPrice ? totalPrice.toFixed(2) : '0.00'}</p>
            </div>
          </div>
          <button
            onClick={onOpenCart}
            className="bg-white text-emerald-800 text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-xs uppercase tracking-wider cursor-pointer hover:bg-emerald-50 transition"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-xl mx-auto px-4 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path ? currentPath === item.path : false;

          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative ${
                isActive ? 'text-emerald-600 font-black' : 'text-stone-400 hover:text-stone-700 font-medium'
              }`}
            >
              <div className="relative">
                <Icon size={18} className={isActive ? 'text-emerald-600 scale-110' : ''} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}