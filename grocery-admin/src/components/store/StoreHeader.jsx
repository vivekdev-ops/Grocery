// src/components/store/StoreHeader.jsx
import { Search, User, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ValueGoLogo from '../ValueGoLogo';

export default function StoreHeader({ session, searchQuery, setSearchQuery, totalItemsCount, onOpenProfile, onOpenCart }) {
  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
          <ValueGoLogo />
        </div>

        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition" size={18} />
            <input 
              type="text" 
              placeholder='Search "Fresh Milk", "Organic Tomatoes", "Snacks"...' 
              className="w-full pl-11 pr-4 py-3 bg-slate-100/80 focus:bg-white rounded-2xl text-sm font-medium text-slate-900 outline-none border-2 border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <button 
              onClick={onOpenProfile}
              className="w-11 h-11 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition duration-200 flex items-center justify-center border border-slate-200 active:scale-95 shadow-2xs"
              title="My Profile"
            >
              <User size={20} />
            </button>
          ) : (
            <Link to="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition duration-200 shadow-sm active:scale-95">
              Login
            </Link>
          )}

          <button 
            onClick={onOpenCart}
            className="h-11 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl flex items-center gap-2.5 shadow-lg shadow-emerald-600/25 transition duration-200 transform active:scale-95 relative font-black text-xs"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}