// src/components/store/StoreHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, User, ShoppingCart, MapPin, ChevronDown, Loader2, Zap, Mic, MicOff, Package, Gift, HelpCircle, LogOut, Sparkles, Menu, X, FolderTree, UserCircle, Heart, Info, Share2, FileText, Shield, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';

export default function StoreHeader({
  session, customerProfile, searchQuery, setSearchQuery,
  totalItemsCount, onOpenCart, showSearch = true,
  categories = [], activeCategory = 'All', setActiveCategory = () => {}
}) {
  const [locationName, setLocationName] = useState('6391 Elgin St. Celina, Delaware 10299');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prevCount, setPrevCount] = useState(totalItemsCount);
  const [cartBounce, setCartBounce] = useState(false);
  
  // Menus & Drawers state
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const accountMenuRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const navigate = useNavigate();

  const avatarUrl = customerProfile?.avatar_url || session?.user?.user_metadata?.avatar_url;

  useEffect(() => { fetchCurrentLocation(); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (totalItemsCount > prevCount) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 500);
    }
    setPrevCount(totalItemsCount);
  }, [totalItemsCount]);

  const handleProfileClick = () => {
    if (!session) {
      navigate('/login');
    } else {
      setIsAccountMenuOpen(prev => !prev);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) { return; }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data?.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.city || 'Home';
            setLocationName(`${area}, ${data.address.state || ''}`);
          }
        } catch { /* ignore */ }
        finally { setIsFetchingLocation(false); }
      },
      () => { setIsFetchingLocation(false); },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice search is not supported in this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e) => setSearchQuery && setSearchQuery(e.results[0][0].transcript);
    rec.start();
  };

  const displayName = customerProfile?.full_name
    ? customerProfile.full_name.split(' ')[0]
    : session?.user?.email?.split('@')[0];

  const activeCategories = (categories || []).filter(c => c.is_active !== false);
  const activeCategoryObj = activeCategories.find(c => c.id === activeCategory);
  const isAnyCategorySelected = activeCategory !== 'All';

  return (
    <header className="bg-white sticky top-0 z-40 font-sans transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3.5">

        {/* If category is selected, show custom header with back arrow, category title, search icon, and cart icon */}
        {isAnyCategorySelected ? (
          <div className="flex items-center justify-between py-1">
            <button 
              onClick={() => setActiveCategory('All')}
              className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-slate-900 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={22} className="stroke-[2.5]" />
            </button>

            <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate max-w-[220px] sm:max-w-md">
              {activeCategoryObj?.name || 'Category'}
            </h2>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => {}} 
                className="p-2 rounded-full hover:bg-stone-100 text-slate-900 transition cursor-pointer"
                title="Search"
              >
                <Search size={22} className="stroke-[2.5]" />
              </button>

              <motion.button
                onClick={onOpenCart}
                animate={cartBounce ? { scale: [1, 1.2, 1] } : {}}
                className="relative p-2 rounded-full text-slate-900 hover:bg-stone-100 transition cursor-pointer"
                title="Cart"
              >
                <ShoppingCart size={22} className="stroke-[2.2]" />
                <AnimatePresence>
                  {totalItemsCount > 0 && (
                    <motion.span
                      key={totalItemsCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0.5 right-0.5 bg-emerald-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                    >
                      {totalItemsCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Bar: Location & Shopping Bag */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1 cursor-pointer">
                    <span className="font-bold text-slate-900 text-sm">Home</span>
                    <ChevronDown size={14} className="text-slate-800 font-bold" />
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium truncate max-w-[260px] sm:max-w-md">{locationName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {session && <NotificationBell session={session} size={18} />}

                {/* Shopping Bag Icon Button */}
                <motion.button
                  onClick={onOpenCart}
                  animate={cartBounce ? { scale: [1, 1.2, 1] } : {}}
                  className="relative p-2.5 rounded-full text-slate-800 hover:bg-stone-100 transition cursor-pointer"
                >
                  <ShoppingCart size={22} className="stroke-[2.2]" />
                  <AnimatePresence>
                    {totalItemsCount > 0 && (
                      <motion.span
                        key={totalItemsCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                      >
                        {totalItemsCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* Search Bar & Filter Button matching reference screenshot */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 relative bg-[#F4F5F7] rounded-2xl flex items-center px-4 py-3 shadow-inner">
                <Search size={18} className="text-stone-400 mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-none placeholder-stone-400"
                  value={searchQuery}
                  onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-2xl transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0"
                title="Filters / Menu"
              >
                <SlidersHorizontal size={20} className="stroke-[2.5]" />
              </button>
            </div>
          </>
        )}

      </div>

      {/* Mobile Slideout Menu for Categories & Account Links */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-stone-100 overflow-hidden px-4 py-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-black uppercase tracking-wider text-[10px] text-stone-400">Quick Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setActiveCategory('All'); setIsMobileMenuOpen(false); }}
                className={`p-3 rounded-2xl font-bold text-left border ${activeCategory === 'All' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-stone-50 border-stone-200'}`}
              >
                All Categories
              </button>
              {categories.filter(c => !c.parent_id).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setIsMobileMenuOpen(false); }}
                  className={`p-3 rounded-2xl font-bold text-left border truncate ${activeCategory === cat.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-stone-50 border-stone-200'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {session ? (
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/account/orders'); }} className="w-full text-left py-2.5 px-3 rounded-xl font-bold bg-stone-50 text-stone-800 flex items-center gap-2">
                  <Package size={16} className="text-emerald-500" /> My Orders
                </button>
                <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full text-left py-2.5 px-3 rounded-xl font-bold bg-rose-50 text-rose-600 flex items-center gap-2">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full py-3 bg-emerald-500 text-white text-center font-black rounded-2xl shadow-md">
                Login / Sign Up
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}