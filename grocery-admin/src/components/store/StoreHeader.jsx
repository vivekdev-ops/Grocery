// src/components/store/StoreHeader.jsx
import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Check, Package, Sparkles, Flame, Apple, Baby, Headphones, Sparkle, Home as HomeIcon, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';
import logoImg from '../../assets/logo.png';

export default function StoreHeader({
  session, customerProfile, showSearch = true,
  searchQuery = '', setSearchQuery, totalItemsCount = 0, onOpenCart, onOpenProfile,
  sortBy = 'default', setSortBy, categories = [], activeCategory, setActiveCategory
}) {
  const navigate = useNavigate();
  const [addressDisplay, setAddressDisplay] = useState('Fetching location...');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (session?.user) {
      fetchUserAddresses(session.user.id);
    } else {
      fetchCurrentLocation();
    }
  }, [session, customerProfile]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchUserAddresses = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        setSavedAddresses(data);
        const defaultAddr = data.find(addr => addr.is_default) || data[0];
        setAddressDisplay(`${defaultAddr.address || defaultAddr.street || 'Selected Address'}`);
      } else if (customerProfile?.address) {
        setAddressDisplay(`${customerProfile.address}`);
      } else {
        setAddressDisplay('Add Address in Profile');
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) {
              const shortAddr = data.display_name.split(',').slice(0, 3).join(',');
              setAddressDisplay(`${shortAddr}`);
            } else {
              setAddressDisplay(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
            }
          } catch {
            setAddressDisplay('Current Location (GPS Active)');
          }
        },
        () => {
          setAddressDisplay('Select Location');
        },
        { timeout: 10000 }
      );
    } else {
      setAddressDisplay('Select Location');
    }
  };

  const handleSelectAddress = (addr) => {
    const fullText = addr.address || addr.street || `${addr.city}, ${addr.pincode}`;
    setAddressDisplay(`${fullText}`);
    setIsAddressDropdownOpen(false);
  };

  const activeCategories = (categories || []).filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_id);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 shadow-md backdrop-blur-md transition-all duration-300">
      
      {/* Top Brand & Delivery Banner */}
      <div className={`transition-all duration-300 ${
        !isScrolled ? 'max-h-32 opacity-100 pt-3.5 pb-2.5 border-b border-orange-800/30' : 'max-h-0 opacity-0 py-0 border-none overflow-hidden'
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 text-white">
          
          {/* Logo & Delivery Location Picker */}
          <div className="flex items-center gap-3 min-w-0 relative shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white text-orange-700 flex items-center justify-center font-black text-sm shadow-sm border border-orange-300 group-hover:scale-105 transition overflow-hidden p-1">
                <img src={logoImg} alt="KD Store Logo" className="w-full h-full object-contain" />
              </div>
            </button>
            
            <div className="min-w-0 relative z-50">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-xs tracking-wider uppercase bg-orange-800/50 px-2 py-0.5 rounded-md border border-orange-500/40 flex items-center gap-1 shadow-2xs">
                  <Zap size={10} className="text-amber-300 fill-amber-300" /> KD Store
                </span>
              </div>
              
              <button
                onClick={() => session?.user && savedAddresses.length > 0 && setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="text-[11px] text-amber-100 font-medium truncate flex items-center gap-1 hover:text-white transition cursor-pointer text-left leading-tight mt-1"
              >
                <MapPin size={12} className="text-amber-300 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-xs">
                  <strong className="font-bold text-white">Delivering to:</strong> {addressDisplay}
                </span>
                {session?.user && savedAddresses.length > 0 && <ChevronDown size={11} className="shrink-0 text-amber-200" />}
              </button>

              {isAddressDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 bg-white text-stone-900 rounded-2xl shadow-2xl border border-stone-200/90 py-2 z-[9999] space-y-0.5">
                  <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Select Address</span>
                    <button 
                      onClick={() => { setIsAddressDropdownOpen(false); navigate('/account/address'); }}
                      className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5 px-1">
                    {savedAddresses.map((addr, idx) => (
                      <button
                        key={addr.id || idx}
                        onClick={() => handleSelectAddress(addr)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 transition flex items-center justify-between group cursor-pointer text-xs"
                      >
                        <span className="font-bold text-stone-700 truncate pr-2">{addr.address || addr.street || addr.city}</span>
                        {addressDisplay.includes(addr.address || addr.street) && <Check size={12} className="text-orange-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell session={session} size={18} className="text-orange-700 hover:bg-amber-100 p-2.5 rounded-2xl transition shadow-2xs border border-orange-300 bg-white" />
          </div>
        </div>
      </div>

      {/* Dark Orange Category Strip Background Container */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 sm:px-8 pt-3 pb-3.5 rounded-b-[2.5rem] shadow-md border-t border-orange-500/30 max-w-[1600px] mx-auto space-y-3 relative z-30">
        
        {/* Search Bar & Notification Bell Header wrapper when scrolled */}
        <div className="flex items-center gap-3 w-full">
          {showSearch && (
            <div className="flex flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                placeholder="Search groceries, vegetables..."
                className="w-full bg-white text-stone-900 placeholder:text-stone-400 text-xs font-medium pl-10 pr-4 py-2.5 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-amber-300 transition border border-orange-300/60"
              />
            </div>
          )}
          
          {/* Notification bell visible even when scrolled */}
          {isScrolled && (
            <div className="shrink-0">
              <NotificationBell session={session} size={18} className="text-orange-700 hover:bg-amber-100 p-2.5 rounded-2xl transition border border-orange-300 bg-white shadow-xs" />
            </div>
          )}
        </div>

        <div className="overflow-x-auto scrollbar-none flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setActiveCategory && setActiveCategory('All')}
            className={`flex shrink-0 cursor-pointer group transition relative items-center text-center ${
              !isScrolled 
                ? 'flex-col w-18 text-white font-bold' 
                : 'px-4 py-1.5 rounded-full border text-xs font-bold ' + (activeCategory === 'All' ? 'bg-white text-orange-900 border-white shadow-sm' : 'bg-orange-800/60 text-white border-orange-500/50 hover:bg-orange-800')
            } ${activeCategory === 'All' && !isScrolled ? 'text-white font-black' : ''}`}
          >
            {!isScrolled && (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition shadow-2xs mb-1 mx-auto border ${
                activeCategory === 'All' ? 'bg-white border-white text-orange-700 shadow-xs' : 'bg-orange-700/60 border-orange-500/40 text-white'
              }`}>
                <Package size={20} className={activeCategory === 'All' ? 'text-orange-700' : 'text-white'} />
              </div>
            )}
            <span className="text-xs tracking-tight leading-tight line-clamp-1 w-full">All</span>
            {activeCategory === 'All' && !isScrolled && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-amber-300 rounded-t-full" />
            )}
          </button>

          {parentCategories.map((cat, index) => {
            const isSelected = activeCategory === cat.id || activeCategory === cat.name;
            const catImage = cat.image_url;

            const fallbackIcons = [Apple, Flame, Baby, Headphones, Sparkles, HomeIcon, Sparkle];
            const FallbackIconComponent = fallbackIcons[index % fallbackIcons.length];

            return (
              <button
                key={cat.id || cat.name}
                onClick={() => setActiveCategory && setActiveCategory(cat.id)}
                className={`flex shrink-0 cursor-pointer group transition relative items-center text-center ${
                  !isScrolled 
                    ? 'flex-col w-18 text-white font-bold' 
                    : 'px-4 py-1.5 rounded-full border text-xs font-bold ' + (isSelected ? 'bg-white text-orange-900 border-white shadow-sm' : 'bg-orange-800/60 text-white border-orange-500/50 hover:bg-orange-800')
                } ${isSelected && !isScrolled ? 'text-white font-black' : ''}`}
              >
                {!isScrolled && (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition shadow-2xs mb-1 overflow-hidden p-1 mx-auto border ${
                    isSelected ? 'bg-white border-white text-orange-700 shadow-xs' : 'bg-orange-700/60 border-orange-500/40 text-white'
                  }`}>
                    {catImage ? (
                      <img src={catImage} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <FallbackIconComponent size={20} className={isSelected ? 'text-orange-700' : 'text-white'} />
                    )}
                  </div>
                )}
                <span className="text-xs tracking-tight leading-tight line-clamp-1 w-full">{cat.name}</span>
                {isSelected && !isScrolled && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-amber-300 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </header>
  );
}