// src/components/store/StoreHeader.jsx
import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, MapPin, ChevronDown, Loader2, Zap, Heart, Mic, MicOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function StoreHeader({ session, customerProfile, searchQuery, setSearchQuery, totalItemsCount, onOpenProfile, onOpenCart }) {
  const [locationName, setLocationName] = useState('Detecting location...');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const handleProfileClick = () => {
    if (session) {
      onOpenProfile();
    } else {
      navigate('/login');
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationName('New Delhi, India');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          
          if (data && data.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || 'Current Location';
            const state = data.address.state || '';
            setLocationName(`${area}, ${state}`);
          } else {
            setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setLocationName('New Delhi, India');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.warn('Geolocation permission denied or error:', error.message);
        setLocationName('New Delhi, India');
        setIsFetchingLocation(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setSearchQuery(speechToText);
    };

    recognition.start();
  };

  const displayName = customerProfile?.full_name ? customerProfile.full_name.split(' ')[0] : session?.user?.email?.split('@')[0];
  const avatarUrl = customerProfile?.avatar_url;

  return (
    <>
      {/* Top Banner / Delivery Ticker */}
      <div className="bg-emerald-900 text-emerald-100 text-[11px] font-black py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-2 uppercase">
        <Zap size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
        <span>Lightning Fast Delivery in 10 Minutes • Order Now!</span>
      </div>

      {/* Main Frosted Glass Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-emerald-100 shadow-xs transition-all font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand Name: KD Store */}
          <div className="flex items-center gap-4">
            <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer flex items-center gap-2.5">
              <div className="w-10 h-10 bg-emerald-700 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">
                KD
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-black text-slate-900 tracking-wide leading-none">KD Store</h1>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Quick Commerce</p>
              </div>
            </div>

            {/* Clickable Geolocation Widget */}
            <div 
              onClick={fetchCurrentLocation}
              className="hidden md:flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 rounded-2xl cursor-pointer hover:bg-emerald-100/50 transition"
              title="Click to refresh current location"
            >
              <MapPin size={16} className="text-emerald-700 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Current Location</p>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <span className="truncate max-w-[160px]">{locationName}</span>
                  {isFetchingLocation ? <Loader2 size={12} className="animate-spin text-emerald-600 shrink-0" /> : <ChevronDown size={12} className="text-slate-500 shrink-0" />}
                </p>
              </div>
            </div>
          </div>

          {/* Central Search Bar with Voice Input */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition" size={18} />
              <input 
                type="text" 
                placeholder='Search "Fresh Milk", "Organic Tomatoes", "Snacks"...' 
                className="w-full pl-11 pr-12 py-3 bg-emerald-50/40 focus:bg-white rounded-2xl text-sm font-medium text-slate-900 outline-none border-2 border-emerald-200/80 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 transition shadow-2xs"
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="button"
                onClick={startVoiceSearch}
                className={`absolute inset-y-1.5 right-1.5 px-3 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
                title={isListening ? "Listening... Speak now" : "Search by voice"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {session ? (
              <button 
                onClick={handleProfileClick}
                className="h-11 px-3.5 bg-emerald-50/75 hover:bg-emerald-100 text-slate-800 rounded-2xl transition duration-200 flex items-center gap-2.5 border border-emerald-200 active:scale-95 shadow-2xs cursor-pointer"
                title="My Profile"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center shrink-0 border border-emerald-300">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={14} className="text-emerald-800" />
                  )}
                </div>
                <span className="text-xs font-black truncate max-w-[100px] hidden sm:inline">{displayName}</span>
              </button>
            ) : (
              <Link to="/login" className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition duration-200 shadow-sm active:scale-95">
                Login
              </Link>
            )}

            <button 
              onClick={onOpenCart}
              className="h-11 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl flex items-center gap-2.5 shadow-lg shadow-emerald-600/25 transition duration-200 transform active:scale-95 relative font-black text-xs cursor-pointer"
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

        {/* Mobile Search & Location Row */}
        <div className="px-4 pb-3 md:hidden space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-emerald-50/70 px-3 py-1.5 rounded-xl border border-emerald-200" onClick={fetchCurrentLocation}>
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={14} className="text-emerald-700 shrink-0" />
              <span className="truncate">{locationName}</span>
            </span>
            {isFetchingLocation ? <Loader2 size={12} className="animate-spin text-emerald-600 shrink-0" /> : <span className="text-[10px] text-emerald-700 uppercase font-black underline">Detect</span>}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search groceries, essentials..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-emerald-50/50 border border-emerald-200 pl-11 pr-12 py-2.5 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
            />
            <button 
              type="button"
              onClick={startVoiceSearch}
              className={`absolute inset-y-1.5 right-1.5 px-2.5 rounded-xl flex items-center justify-center transition cursor-pointer ${
                isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
              title={isListening ? "Listening... Speak now" : "Search by voice"}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Native-Style Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 px-6 py-2.5 md:hidden flex justify-between items-center shadow-2xl font-sans">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="flex flex-col items-center gap-0.5 text-[10px] font-black uppercase text-emerald-700 cursor-pointer"
        >
          <Zap size={20} className="fill-emerald-700" />
          <span>Shop</span>
        </button>

        <button 
          onClick={onOpenCart} 
          className="flex flex-col items-center gap-0.5 text-[10px] font-black uppercase text-slate-400 relative cursor-pointer"
        >
          <ShoppingCart size={20} />
          <span>Cart</span>
          {totalItemsCount > 0 && <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
        </button>

        <button 
          onClick={handleProfileClick} 
          className="flex flex-col items-center gap-0.5 text-[10px] font-black uppercase text-slate-400 cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-200 flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User size={12} />}
          </div>
          <span>Account</span>
        </button>
      </div>
    </>
  );
}