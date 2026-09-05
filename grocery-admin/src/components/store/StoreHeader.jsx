// src/components/store/StoreHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, User, ShoppingCart, MapPin, ChevronDown, Loader2, Zap, Mic, MicOff, Package, Gift, HelpCircle, LogOut, Sparkles, Menu, X, FolderTree } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';

export default function StoreHeader({
  session, customerProfile, searchQuery, setSearchQuery,
  totalItemsCount, onOpenCart, showSearch = true,
  categories = [], activeCategory = 'All', setActiveCategory = () => {}
}) {
  const [locationName, setLocationName] = useState('Detecting location...');
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
    if (!navigator.geolocation) { setLocationName('New Delhi, India'); return; }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data?.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || 'Current Location';
            setLocationName(`${area}, ${data.address.state || ''}`);
          } else {
            setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        } catch { setLocationName('New Delhi, India'); }
        finally { setIsFetchingLocation(false); }
      },
      (err) => { console.warn('Geolocation error:', err.message); setLocationName('New Delhi, India'); setIsFetchingLocation(false); },
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
  const userPhone = customerProfile?.phone || session?.user?.email || '8955782853';

  // Category items
  const activeCategories = (categories || []).filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_id);
  const activeCategoryObj = activeCategories.find(c => c.id === activeCategory);
  const currentCategoryLabel = activeCategory === 'All' ? 'All Categories' : (activeCategoryObj?.name || 'Category');

  const fallbackImages = [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&auto=format&fit=crop&q=80',
  ];

  return (
    <>
      {/* ── DELIVERY TICKER ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 text-emerald-100 py-1.5 shadow-inner">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest shrink-0">
              <Zap size={12} className="text-amber-400 fill-amber-400 animate-pulse" />
              ⚡ Lightning Fast Delivery in 13 Minutes
              <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block mx-2" />
              Free Delivery on Orders Above ₹500
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className={`bg-white/95 backdrop-blur-xl sticky top-0 z-40 border-b border-emerald-100/80 font-sans transition-all duration-300 ${scrolled ? 'shadow-md shadow-emerald-950/5' : ''}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2 sm:gap-4">

          {/* Left: Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => { setActiveCategory('All'); navigate('/'); }}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-all">
                KD
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-black text-slate-900 tracking-tight">KD Store</p>
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> 13 mins
                </span>
              </div>
            </button>
          </div>

          {/* Categories Dropdown Menu Trigger (Desktop) */}
          <div className="relative hidden lg:block" ref={categoryMenuRef}>
            <button
              onClick={() => setIsCategoryMenuOpen(prev => !prev)}
              className="flex items-center gap-2 h-11 px-4 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-2xl transition-all cursor-pointer font-black text-xs text-emerald-900 shadow-2xs group"
            >
              <FolderTree size={16} className="text-emerald-700 group-hover:rotate-12 transition-transform" />
              <span className="truncate max-w-[130px]">{currentCategoryLabel}</span>
              <ChevronDown size={14} className={`text-emerald-700 transition-transform duration-200 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Categories Popup Menu */}
            <AnimatePresence>
              {isCategoryMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-emerald-100 py-3 z-50 overflow-hidden text-xs max-h-[75vh] overflow-y-auto"
                >
                  <div className="px-5 py-2.5 border-b border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                    <span className="font-black text-slate-900 uppercase tracking-wider text-[10px]">Explore Store Categories</span>
                    <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-full font-bold">{activeCategories.length}</span>
                  </div>
                  
                  <div className="py-1 px-1.5 space-y-0.5">
                    <button
                      onClick={() => { setActiveCategory('All'); setIsCategoryMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-2xl font-bold flex items-center justify-between transition cursor-pointer ${
                        activeCategory === 'All' ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-700 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Sparkles size={15} className={activeCategory === 'All' ? 'text-white' : 'text-emerald-600'} /> All Categories
                      </span>
                    </button>

                    {parentCategories.map((cat, idx) => {
                      const isSelected = activeCategory === cat.id;
                      const img = cat.image_url || fallbackImages[idx % fallbackImages.length];
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { setActiveCategory(cat.id); setIsCategoryMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-2xl font-bold flex items-center justify-between transition cursor-pointer ${
                            isSelected ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-800 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200/60 shadow-2xs">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="truncate">{cat.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location Picker */}
          <button
            onClick={fetchCurrentLocation}
            className="hidden xl:flex items-center gap-2 bg-stone-50 hover:bg-emerald-50/60 border border-stone-200/80 hover:border-emerald-300 px-3.5 py-2 rounded-2xl cursor-pointer transition-all group shrink-0 shadow-2xs"
            title="Click to refresh location"
          >
            <MapPin size={16} className="text-emerald-600 shrink-0 group-hover:bounce" />
            <div className="text-left leading-tight">
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Deliver to</p>
              <p className="text-[11px] font-black text-slate-800 flex items-center gap-1 mt-0.5">
                <span className="truncate max-w-[120px]">{locationName}</span>
                {isFetchingLocation ? <Loader2 size={10} className="animate-spin text-emerald-600" /> : <ChevronDown size={10} className="text-stone-400" />}
              </p>
            </div>
          </button>

          {/* ── SEARCH BAR ── */}
          <div className="flex-1 max-w-xl mx-1 sm:mx-4">
            <div className="relative group">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none"
              />
              <input
                type="text"
                placeholder='Search "Fresh Milk", "Tomatoes", "Snacks"…'
                className="w-full pl-11 pr-12 py-2.5 sm:py-3 bg-stone-100/80 hover:bg-stone-100 focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-slate-900 outline-none border border-stone-200/80 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
                value={searchQuery}
                onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute inset-y-1.5 right-1.5 px-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
                title={isListening ? 'Listening…' : 'Voice search'}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>

          {/* Right Actions: Account, Cart & Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Account Menu / Login */}
            {session ? (
              <div className="relative hidden sm:block" ref={accountMenuRef}>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 h-11 px-4 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 rounded-2xl transition-all cursor-pointer btn-press group shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                    {customerProfile?.full_name?.[0] || displayName?.[0]?.toUpperCase() || <User size={12} />}
                  </div>
                  <span className="text-xs font-black text-slate-800 truncate max-w-[90px]">{displayName || 'Account'}</span>
                  <ChevronDown size={13} className={`text-stone-500 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-stone-100 py-3 z-50 overflow-hidden font-sans text-xs"
                    >
                      <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                        <p className="font-black text-slate-900 text-sm truncate">{customerProfile?.full_name || 'My Account'}</p>
                        <p className="text-stone-500 text-[11px] mt-0.5 truncate font-medium">{userPhone}</p>
                      </div>
                      <div className="py-1">
                        <button onClick={() => { setIsAccountMenuOpen(false); navigate('/account/orders'); }} className="w-full text-left px-5 py-2.5 text-slate-700 hover:bg-emerald-50/50 font-medium flex items-center gap-3 transition cursor-pointer">
                          <Package size={15} className="text-stone-400" /> My Orders
                        </button>
                        <button onClick={() => { setIsAccountMenuOpen(false); navigate('/account/orders'); }} className="w-full text-left px-5 py-2.5 text-slate-700 hover:bg-emerald-50/50 font-medium flex items-center gap-3 transition cursor-pointer">
                          <MapPin size={15} className="text-stone-400" /> Saved Addresses
                        </button>
                      </div>
                      <div className="border-t border-stone-100 pt-1 mt-1">
                        <button onClick={() => { setIsAccountMenuOpen(false); handleLogout(); }} className="w-full text-left px-5 py-2.5 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-3 transition cursor-pointer">
                          <LogOut size={15} /> Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/25 transition-all btn-press"
              >
                Login
              </Link>
            )}

            {/* Notification Bell */}
            {session && <NotificationBell session={session} size={18} />}

            {/* Cart Button */}
            <motion.button
              onClick={onOpenCart}
              animate={cartBounce ? { scale: [1, 1.18, 0.95, 1] } : {}}
              transition={{ duration: 0.35, type: 'spring', stiffness: 400, damping: 15 }}
              className="relative h-11 px-4 sm:px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer btn-press font-black text-xs"
            >
              <ShoppingCart size={18} />
              <span className="hidden md:inline">Cart</span>
              <AnimatePresence>
                {totalItemsCount > 0 && (
                  <motion.span
                    key={totalItemsCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                  >
                    {totalItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE SLIDEOUT MENU ── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-stone-200 overflow-hidden px-4 py-4 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Store Categories</p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => { setActiveCategory('All'); setIsMobileMenuOpen(false); }}
                    className={`p-2.5 rounded-xl font-bold text-xs border text-left flex items-center gap-2 ${
                      !activeCategory || activeCategory === 'All' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-stone-50 border-stone-200 text-stone-800'
                    }`}
                  >
                    <Sparkles size={14} /> All Categories
                  </button>
                  {parentCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setIsMobileMenuOpen(false); }}
                      className={`p-2.5 rounded-xl font-bold text-xs border text-left truncate ${
                        activeCategory === cat.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-stone-50 border-stone-200 text-stone-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {session ? (
                <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/account/orders'); }} className="w-full text-left py-2 font-bold text-stone-700 flex items-center gap-2">
                    <Package size={16} /> My Orders
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full text-left py-2 font-bold text-rose-600 flex items-center gap-2">
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-stone-100">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full py-3 bg-emerald-600 text-white text-center font-black rounded-xl">
                    Login / Sign Up
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}