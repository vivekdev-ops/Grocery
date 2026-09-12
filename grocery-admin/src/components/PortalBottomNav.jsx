// src/components/PortalBottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, ClipboardList, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalBottomNav({ totalItemsCount = 0, totalPrice = 0, onOpenCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath.startsWith('/admin') || currentPath.startsWith('/shopkeeper') || currentPath.startsWith('/delivery')) {
    return null;
  }

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Orders', path: '/account/orders', icon: ClipboardList },
    { label: 'Wishlist', path: '/account/wishlist', icon: Heart },
    { label: 'Profile', path: '/account/profile', icon: User },
  ];

  return (
    <motion.div 
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-10px_30px_-5px_rgba(249,115,22,0.12)] pb-safe font-sans"
    >
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around gap-1">
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <motion.button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-colors cursor-pointer ${
                isActive ? 'text-orange-600 font-black' : 'text-stone-500 hover:text-stone-900 font-bold'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-orange-50 rounded-2xl -z-10 border border-orange-200/60 shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <Icon size={17} className={isActive ? 'stroke-[2.5] text-orange-600' : 'stroke-[2] text-stone-500'} />
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </motion.button>
          );
        })}

        {/* Animated Floating Cart Button */}
        <motion.button
          type="button"
          onClick={() => {
            if (typeof onOpenCart === 'function') {
              onOpenCart();
            } else {
              window.dispatchEvent(new CustomEvent('openCartDrawer'));
            }
          }}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3.5 py-2 rounded-2xl shadow-lg shadow-orange-600/30 cursor-pointer font-black text-xs"
        >
          <div className="relative">
            <ShoppingBag size={17} className="text-white" />
            {totalItemsCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2.5 bg-white text-orange-600 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-orange-200"
              >
                {totalItemsCount}
              </motion.span>
            )}
          </div>
          <span>₹{totalPrice.toFixed(0)}</span>
        </motion.button>

      </div>
    </motion.div>
  );
}