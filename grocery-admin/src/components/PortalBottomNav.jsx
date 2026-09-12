// src/components/PortalBottomNav.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, ClipboardList, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function PortalBottomNav({ totalItemsCount = 0, onOpenCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const fetchWishlistCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (!error && count !== null) {
        setWishlistCount(count);
      }
    };

    fetchWishlistCount();

    const handleWishlistUpdate = () => fetchWishlistCount();
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    window.addEventListener('storage', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
      window.removeEventListener('storage', handleWishlistUpdate);
    };
  }, []);

  if (currentPath.startsWith('/admin') || currentPath.startsWith('/shopkeeper') || currentPath.startsWith('/delivery')) {
    return null;
  }

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Orders', path: '/account/orders', icon: ClipboardList },
    { label: 'Wishlist', path: '/account/wishlist', icon: Heart, badge: wishlistCount },
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
              
              <div className="relative">
                <Icon size={17} className={isActive ? 'stroke-[2.5] text-orange-600' : 'stroke-[2] text-stone-500'} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-600 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center z-20">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </motion.button>
          );
        })}

        {/* Cart Tab with icon badge only (no surrounding border ring) */}
        <motion.button
          type="button"
          onClick={() => {
            if (typeof onOpenCart === 'function') {
              onOpenCart();
            } else {
              window.dispatchEvent(new CustomEvent('openCartDrawer'));
            }
          }}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-colors cursor-pointer text-stone-500 hover:text-stone-900 font-bold"
        >
          <div className="relative">
            <ShoppingBag size={17} className="stroke-[2] text-stone-500" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-rose-600 text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center z-20">
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Cart</span>
        </motion.button>

      </div>
    </motion.div>
  );
}