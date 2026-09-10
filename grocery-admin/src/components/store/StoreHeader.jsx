// src/components/store/StoreHeader.jsx
import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Check, Package, Sparkles, Flame, Apple, Baby, Headphones, Sparkle, Home as HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';
import logoImg from '../../assets/logo.png'; // Update this path if you place your logo file elsewhere in your src directory

export default function StoreHeader({
  session, customerProfile, showSearch = true,
  searchQuery = '', setSearchQuery, totalItemsCount = 0, onOpenCart, onOpenProfile,
  sortBy = 'default', setSortBy, categories = [], activeCategory, setActiveCategory
}) {
  const navigate = useNavigate();
  const [addressDisplay, setAddressDisplay] = useState('Fetching location...');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
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
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolledUp(true); // Scrolling down -> hide the top brand/address section
      } else {
        setIsScrolledUp(false); // Scrolling up -> show it back
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
        setAddressDisplay(`Delivering to : ${defaultAddr.address || defaultAddr.street || 'Selected Address'}`);
      } else if (customerProfile?.address) {
        setAddressDisplay(`Delivering to : ${customerProfile.address}`);
      } else {
        setAddressDisplay('Delivering to : Add Address in Profile');
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
              setAddressDisplay(`Delivering to : ${shortAddr}`);
            } else {
              setAddressDisplay(`Delivering to : Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
            }
          } catch {
            setAddressDisplay('Delivering to : Current Location (GPS Active)');
          }
        },
        () => {
          setAddressDisplay('Delivering to : Select Location');
        },
        { timeout: 10000 }
      );
    } else {
      setAddressDisplay('Delivering to : Select Location');
    }
  };

  const handleSelectAddress = (addr) => {
    const fullText = addr.address || addr.street || `${addr.city}, ${addr.pincode}`;
    setAddressDisplay(`Delivering to : ${fullText}`);
    setIsAddressDropdownOpen(false);
  };

  const activeCategories = (categories || []).filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_id);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md backdrop-blur-md transition-all duration-300">
      
      {/* Marquee Banner */}
      <div className="bg-emerald-900/60 text-emerald-100 overflow-hidden py-1 px-3 text-[10px] font-bold tracking-wider uppercase border-b border-emerald-500/20">
        <div className="whitespace-nowrap animate-marquee flex items-center justify-around">
          <span>⚡ Quick & Free Delivery in Harraiya</span>
          <span className="hidden sm:inline">⚡ Quick & Free Delivery in Harraiya</span>
          <span className="hidden md:inline">⚡ Quick & Free Delivery in Harraiya</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-10 py-2.5 space-y-2.5">
        
        {/* Main Row: Brand, Search, and Notification (Collapses/Hides on Scroll Down) */}
        <div className={`flex items-center justify-between gap-3 transition-all duration-300 overflow-hidden ${isScrolledUp ? 'max-h-0 opacity-0 py-0 m-0 pointer-events-none' : 'max-h-24 opacity-100'}`}>
          
          {/* Logo & Address Selector */}
          <div className="flex items-center gap-2 min-w-0 relative shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-black text-xs shadow-inner border border-white/20 group-hover:scale-105 transition overflow-hidden p-0.5">
                <img src={logoImg} alt="KD Store Logo" className="w-full h-full object-contain" />
              </div>
            </button>
            
            <div className="min-w-0 relative">
              <h1 className="font-black text-white text-xs tracking-tight truncate drop-shadow-sm leading-tight">KD Store</h1>
              
              <button
                onClick={() => session?.user && savedAddresses.length > 0 && setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="text-[10.5px] text-emerald-100 font-medium truncate flex items-center gap-1 hover:text-white transition cursor-pointer text-left opacity-90 leading-tight"
              >
                <MapPin size={10} className="text-emerald-300 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-xs">{addressDisplay}</span>
                {session?.user && savedAddresses.length > 0 && <ChevronDown size={10} className="shrink-0 text-emerald-200" />}
              </button>

              {isAddressDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white text-stone-900 rounded-2xl shadow-xl border border-stone-200/90 py-1.5 z-50 space-y-0.5">
                  <div className="px-2.5 py-1.5 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Select Address</span>
                    <button 
                      onClick={() => { setIsAddressDropdownOpen(false); navigate('/account/address'); }}
                      className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5 px-1">
                    {savedAddresses.map((addr, idx) => (
                      <button
                        key={addr.id || idx}
                        onClick={() => handleSelectAddress(addr)}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 transition flex items-center justify-between group cursor-pointer text-xs"
                      >
                        <span className="font-bold text-stone-700 truncate pr-2">{addr.address || addr.street || addr.city}</span>
                        {addressDisplay.includes(addr.address || addr.street) && <Check size={12} className="text-emerald-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Central Search Bar */}
          {showSearch && (
            <div className="flex flex-1 max-w-sm sm:max-w-md mx-3 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                placeholder="Search groceries, vegetables..."
                className="w-full bg-white/95 text-stone-900 placeholder:text-stone-400 text-xs font-medium pl-9 pr-3.5 py-2 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>
          )}

          {/* Right Action Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell session={session} size={16} className="text-white hover:bg-white/20 p-2 rounded-xl transition" />
          </div>
        </div>

        {/* Seamless Integrated Category Strip */}
        <div className="pt-2 pb-1.5 overflow-x-auto scrollbar-none flex items-start gap-6 border-t border-emerald-500/20 mt-1">
          <button
            onClick={() => setActiveCategory && setActiveCategory('All')}
            className={`flex flex-col items-center justify-center shrink-0 cursor-pointer group transition pb-2 border-b-2 relative w-18 text-center ${
              activeCategory === 'All' ? 'border-white text-white font-black' : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center group-hover:scale-105 transition shadow-sm mb-1 mx-auto">
              <Package size={20} className="text-white" />
            </div>
            <span className="text-xs font-black tracking-tight leading-tight line-clamp-2 w-full">All</span>
            {activeCategory === 'All' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-1 bg-white rounded-t-full" />
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
                className={`flex flex-col items-center justify-center shrink-0 cursor-pointer group transition pb-2 border-b-2 relative w-18 text-center ${
                  isSelected ? 'border-white text-white font-black' : 'border-transparent text-emerald-100 hover:text-white'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center group-hover:scale-105 transition shadow-sm mb-1 overflow-hidden p-1 mx-auto">
                  {catImage ? (
                    <img src={catImage} alt={cat.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <FallbackIconComponent size={20} className="text-white" />
                  )}
                </div>
                <span className="text-xs font-black tracking-tight leading-tight line-clamp-2 w-full">{cat.name}</span>
                {isSelected && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-1 bg-white rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}