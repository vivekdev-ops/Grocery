// src/components/PortalBottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PortalBottomNav({ totalItemsCount = 0, totalPrice = 0, onOpenCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath.startsWith('/admin') || currentPath.startsWith('/shopkeeper') || currentPath.startsWith('/delivery')) {
    return null;
  }

  const navItems = [
    { label: 'Shop', path: '/', icon: Home },
    { label: 'Orders', path: '/account/orders', icon: ClipboardList },
    { label: 'Profile', path: '/account/profile', icon: User },
  ];

  return (
    <motion.div 
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="fixed bottom-3 inset-x-4 max-w-lg mx-auto z-50 font-sans"
    >
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] px-3 py-2 flex items-center justify-between">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <motion.button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className={`relative flex items-center gap-2 py-2 px-3.5 rounded-full transition-colors cursor-pointer ${
                  isActive ? 'text-white font-black' : 'text-stone-400 hover:text-stone-200 font-bold'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="pillActiveIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full -z-10 shadow-md shadow-orange-600/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={16} className={isActive ? 'text-white stroke-[2.5]' : 'text-stone-400 stroke-[2]' } />
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Floating Capsule Cart Action */}
        <motion.button
          type="button"
          onClick={() => {
            if (typeof onOpenCart === 'function') {
              onOpenCart();
            } else {
              window.dispatchEvent(new CustomEvent('openCartDrawer'));
            }
          }}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-full shadow-lg cursor-pointer font-black text-xs transition"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag size={15} className="text-orange-600" />
            {totalItemsCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2.5 -right-3 bg-orange-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
              >
                {totalItemsCount}
              </motion.span>
            )}
          </div>
          <span className="font-mono font-black text-orange-600">₹{totalPrice.toFixed(0)}</span>
        </motion.button>

      </div>
    </motion.div>
  );
}