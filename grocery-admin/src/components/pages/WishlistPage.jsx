// src/components/pages/WishlistPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Search, Heart } from 'lucide-react';
import Footer from '../Footer';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchWishlist(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchWishlist = async (userId) => {
    try {
      setLoading(true);
      // Fetch wishlist records joining with actual products from database
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          products (
            id,
            name,
            price,
            mrp,
            image_url,
            unit
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (err) {
      console.error('Error fetching wishlist from database:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
    } catch (err) {
      console.error('Error removing item:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#111813] font-sans text-white flex flex-col selection:bg-emerald-500 selection:text-white select-none pb-24">
      
      {/* Top Header */}
      <div className="px-4 py-4 flex items-center justify-between bg-[#111813] sticky top-0 z-30 border-b border-stone-800/60">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <h1 className="font-black text-white text-base tracking-tight">Wishlist</h1>
        <button 
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
        >
          <Search size={18} className="stroke-[2.5]" />
        </button>
      </div>

      <main className="flex-1 max-w-md mx-auto px-4 py-6 w-full">
        {loading ? (
          <div className="py-20 text-center text-stone-400 font-medium text-xs">Loading wishlist...</div>
        ) : wishlistItems.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-500">
              <Heart size={28} />
            </div>
            <p className="text-stone-400 text-xs font-medium">Your wishlist is empty</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-6 py-3 rounded-xl transition cursor-pointer"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {wishlistItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              return (
                <div 
                  key={item.id} 
                  className="bg-[#18231d] border border-stone-800/80 rounded-2xl p-3 flex flex-col justify-between relative shadow-sm group"
                >
                  {/* Wishlist Heart Button */}
                  <button 
                    onClick={() => handleRemoveFromWishlist(item.id)}
                    className="absolute top-3 right-3 text-emerald-400 hover:text-emerald-300 transition cursor-pointer z-10"
                    title="Remove from wishlist"
                  >
                    <Heart size={16} className="fill-emerald-400" />
                  </button>

                  {/* Product Image */}
                  <div className="w-full h-32 bg-[#1f2d26] rounded-xl overflow-hidden flex items-center justify-center p-2 mb-3">
                    <img 
                      src={product.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'} 
                      alt={product.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition duration-300" 
                    />
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1 mb-3">
                    <h2 className="font-bold text-stone-200 text-xs line-clamp-2 leading-tight">{product.name}</h2>
                    <p className="text-[11px] text-stone-400 font-medium">{product.unit || ''}</p>
                  </div>

                  {/* Price and Add Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-white text-xs">${product.price}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-[10px] text-stone-500 line-through">${product.mrp}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => alert(`Added ${product.name} to cart!`)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-[11px] transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}