// src/components/pages/WishlistPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Heart, ShoppingCart, Trash2, Package, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import StoreHeader from '../store/StoreHeader';
import Footer from '../Footer';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setCustomerProfile(data);
          });
        fetchWishlist(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchWishlist = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id, product_id, products(*, product_variants(*))')
        .eq('user_id', userId);

      if (!error && data) {
        setWishlistItems(data.map(w => ({ ...w.products, wishlistId: w.id })).filter(Boolean));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!session) return;
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', session.user.id)
      .eq('product_id', productId);

    if (!error) {
      setWishlistItems(prev => prev.filter(p => p.id !== productId));
    }
  };

  const addToCart = (product) => {
    const variants = product.product_variants || product.variants || [];
    const activeVar = variants[0] || null;
    const cartItem = {
      cartItemId: `${product.id}-${activeVar?.id || 'default'}`,
      product,
      variant: activeVar,
      id: product.id,
      title: activeVar ? `${product.name} (${activeVar.unit_label || activeVar.label})` : product.name,
      price: Number(activeVar ? activeVar.price : product.price || 0),
      quantity: 1,
      image: product.image_url || (product.images && product.images[0]) || ''
    };

    const currentCart = JSON.parse(localStorage.getItem('cart_items') || '[]');
    const existing = currentCart.find(i => i.cartItemId === cartItem.cartItemId);
    const updated = existing
      ? currentCart.map(i => i.cartItemId === cartItem.cartItemId ? { ...i, quantity: i.quantity + 1 } : i)
      : [...currentCart, cartItem];

    localStorage.setItem('cart_items', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updated }));
    alert("Added to cart!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50/50 to-white font-sans text-stone-900 flex flex-col selection:bg-rose-500 selection:text-white text-xs">
      <StoreHeader session={session} customerProfile={customerProfile} showSearch={false} />

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-4 py-6 w-full space-y-6">
        
        {/* =================================================
            PAGE HEADER BANNER
        ================================================= */}
        <div className="bg-gradient-to-r from-rose-900 via-pink-950 to-rose-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <Heart size={180} />
          </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              My Wishlist <span className="text-sm bg-white/10 px-3 py-0.5 rounded-full border border-white/10 font-bold">{wishlistItems.length}</span>
            </h1>
           
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
            <div className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3 border-2 border-rose-500 border-t-transparent rounded-full" />
            <p className="text-stone-500 font-bold">Loading your wishlist...</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-stone-200 shadow-xs space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <Heart size={32} className="fill-rose-100" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-stone-900 text-sm">Your wishlist is empty</h3>
              <p className="text-stone-400 text-xs max-w-xs mx-auto">Explore our catalog and heart your favorite grocery items to save them here.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 cursor-pointer transition active:scale-95 inline-flex items-center gap-2"
            >
              Explore Store <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wishlistItems.map(product => {
              const img = product.image_url || (product.images && product.images[0]) || '';
              const variants = product.product_variants || product.variants || [];
              const price = variants[0]?.price || product.price || 0;
              const mrp = variants[0]?.mrp || product.mrp || 0;

              return (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-xs hover:shadow-md transition duration-300 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-16 h-16 bg-stone-50 rounded-2xl border border-stone-100 p-1.5 shrink-0 flex items-center justify-center overflow-hidden group-hover:border-emerald-200 transition">
                      {img ? <img src={img} alt="" className="w-full h-full object-contain group-hover:scale-105 transition duration-300" /> : <Package size={22} className="text-stone-300" />}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-black text-stone-900 text-xs truncate">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-700 text-sm">₹{price}</span>
                        {mrp > price && (
                          <span className="text-[10px] text-stone-400 line-through font-bold">₹{mrp}</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <Zap size={10} className="fill-emerald-600" /> In Stock
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl cursor-pointer transition shadow-md shadow-emerald-600/20 active:scale-95"
                      title="Add to Cart"
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <button 
                      onClick={() => removeFromWishlist(product.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-3 rounded-2xl cursor-pointer transition shadow-2xs active:scale-95"
                      title="Remove from Wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}