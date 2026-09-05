// src/components/store/StoreHeader.jsx
import { useState, useEffect, useRef } from 'react';
import { Search, User, ShoppingCart, MapPin, ChevronDown, Loader2, Zap, Mic, MicOff, Home, Heart, Package, Gift, HelpCircle, Shield, LogOut, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';

export default function StoreHeader({
  session, customerProfile, searchQuery, setSearchQuery,
  totalItemsCount, onOpenProfile, onOpenCart, showSearch = true
}) {
  const [locationName, setLocationName] = useState('Detecting location...');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prevCount, setPrevCount] = useState(totalItemsCount);
  const [cartBounce, setCartBounce] = useState(false);
  
  // Account dropdown state
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => { fetchCurrentLocation(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect scroll for header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bounce cart badge when count increases
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
    if (!SR) { alert('Voice search is not supported in this browser. Please use Chrome or Safari.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e) => setSearchQuery(e.results[0][0].transcript);
    rec.start();
  };

  const displayName = customerProfile?.full_name
    ? customerProfile.full_name.split(' ')[0]
    : session?.user?.email?.split('@')[0];
  const userPhone = customerProfile?.phone || session?.user?.email || '8955782853';

  return (
    <>
      {/* ── DELIVERY TICKER ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 text-brand-100 py-1.5">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex items-center gap-3 px-6 text-[10px] font-black uppercase tracking-widest shrink-0">
              <Zap size={11} className="text-amber-400 fill-amber-400" />
              Sab Kuch Milega
              <span className="w-1 h-1 rounded-full bg-brand-500 inline-block" />
              Free Delivery on Orders above ₹500
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className={`bg-white/92 backdrop-blur-lg sticky top-0 z-40 border-b border-stone-100 font-sans transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-stone-200/40' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

          {/* Logo & Mobile Username */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 shrink-0 group btn-press cursor-pointer"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shadow-brand-500/30 group-hover:scale-105 transition-transform">
                KD
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-xs font-black text-stone-900 tracking-wide">KD Store</p>
                <p className="text-[9px] text-brand-600 font-bold mt-0.5">Quick Commerce</p>
              </div>
            </button>

            {session && (
              <div className="sm:hidden flex flex-col leading-tight">
                <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Hello,</span>
                <span className="text-xs font-black text-stone-800 truncate max-w-[110px]">
                  {displayName || 'User'}
                </span>
              </div>
            )}
          </div>

          {/* Location widget — desktop */}
          <button
            onClick={fetchCurrentLocation}
            className="hidden md:flex items-center gap-2 bg-stone-50 hover:bg-brand-50 border border-stone-200 hover:border-brand-300 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 group shrink-0"
            title="Click to refresh location"
          >
            <MapPin size={14} className="text-brand-600 shrink-0 group-hover:animate-bounce" />
            <div className="text-left">
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none">Deliver to</p>
              <p className="text-[11px] font-black text-stone-800 flex items-center gap-1 mt-0.5">
                <span className="truncate max-w-[130px]">{locationName}</span>
                {isFetchingLocation
                  ? <Loader2 size={11} className="animate-spin text-brand-500 shrink-0" />
                  : <ChevronDown size={11} className="text-stone-400 shrink-0" />}
              </p>
            </div>
          </button>

          {/* Search bar — desktop ONLY */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <div className="relative group">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-600 transition-colors pointer-events-none"
              />
              <input
                type="text"
                placeholder='Search "Fresh Milk", "Tomatoes", "Snacks"…'
                className="w-full pl-10 pr-12 py-2.5 bg-stone-50 focus:bg-white rounded-xl text-xs font-medium text-stone-900 outline-none border border-stone-200 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 transition-all shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute inset-y-1 right-1 px-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-stone-400 hover:text-brand-600 hover:bg-brand-50'
                }`}
                title={isListening ? 'Listening…' : 'Voice search'}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 relative">
            {/* Account Dropdown Trigger Button */}
            {session ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 h-9 px-3.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all duration-200 cursor-pointer btn-press group shadow-2xs"
                  title="Account Menu"
                >
                  <span className="text-xs font-black text-stone-800">Account</span>
                  <ChevronDown size={13} className={`text-stone-500 transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Account Dropdown Menu */}
                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-stone-100 py-3 z-50 overflow-hidden font-sans text-xs"
                    >
                      {/* User Identity Header */}
                      <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                        <p className="font-black text-stone-900 text-sm">
                          {customerProfile?.full_name || 'My Account'}
                        </p>
                        <p className="text-stone-500 text-[11px] mt-0.5 truncate font-medium">{userPhone}</p>
                      </div>

                      {/* Menu Options */}
                      <div className="py-1">
                        <button
                          onClick={() => { setIsAccountMenuOpen(false); navigate('/account/orders'); }}
                          className="w-full text-left px-5 py-2.5 text-stone-700 hover:bg-stone-50 font-medium flex items-center gap-3 transition cursor-pointer"
                        >
                          <Package size={15} className="text-stone-400" /> My Orders
                        </button>
                        <button
                          onClick={() => { setIsAccountMenuOpen(false); navigate('/account/orders'); }}
                          className="w-full text-left px-5 py-2.5 text-stone-700 hover:bg-stone-50 font-medium flex items-center gap-3 transition cursor-pointer"
                        >
                          <MapPin size={15} className="text-stone-400" /> Saved Addresses
                        </button>
                        <button
                          onClick={() => { setIsAccountMenuOpen(false); alert('E-Gift Cards feature coming soon!'); }}
                          className="w-full text-left px-5 py-2.5 text-stone-700 hover:bg-stone-50 font-medium flex items-center gap-3 transition cursor-pointer"
                        >
                          <Gift size={15} className="text-stone-400" /> E-Gift Cards
                        </button>
                        <button
                          onClick={() => { setIsAccountMenuOpen(false); alert('FAQ section'); }}
                          className="w-full text-left px-5 py-2.5 text-stone-700 hover:bg-stone-50 font-medium flex items-center gap-3 transition cursor-pointer"
                        >
                          <HelpCircle size={15} className="text-stone-400" /> FAQ's
                        </button>
                      </div>

                      {/* Logout option */}
                      <div className="border-t border-stone-100 pt-1 mt-1">
                        <button
                          onClick={() => { setIsAccountMenuOpen(false); handleLogout(); }}
                          className="w-full text-left px-5 py-2.5 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-3 transition cursor-pointer"
                        >
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
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl text-[11px] font-black shadow-md shadow-brand-500/25 transition-all btn-press"
              >
                Login
              </Link>
            )}

            {/* Notification Bell */}
            {session && <NotificationBell session={session} size={16} />}

            {/* Cart button */}
            <motion.button
              onClick={onOpenCart}
              animate={cartBounce ? { scale: [1, 1.18, 0.95, 1] } : {}}
              transition={{ duration: 0.35, type: 'spring', stiffness: 400, damping: 15 }}
              className="relative h-9 px-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl flex items-center gap-2 shadow-md shadow-brand-500/25 transition-colors cursor-pointer btn-press font-black text-[11px]"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              <AnimatePresence>
                {totalItemsCount > 0 && (
                  <motion.span
                    key={totalItemsCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow"
                  >
                    {totalItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && setSearchQuery && (
          <div className="px-4 pb-3 md:hidden">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search groceries, essentials…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 pl-10 pr-11 py-2 rounded-xl text-xs font-medium text-stone-900 outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute inset-y-1 right-1 px-2.5 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-stone-400 hover:text-brand-600'
                }`}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}