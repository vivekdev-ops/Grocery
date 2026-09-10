// src/components/store/StoreHeader.jsx
import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Check, Package, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';

export default function StoreHeader({
  session, customerProfile, showSearch = true,
  searchQuery = '', setSearchQuery, totalItemsCount = 0, onOpenCart, onOpenProfile,
  sortBy = 'default', setSortBy, isCategorySelected = false, categories = [], selectedCategory, onSelectCategory
}) {
  const navigate = useNavigate();
  const [addressDisplay, setAddressDisplay] = useState('Fetching location...');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchUserAddresses(session.user.id);
    } else {
      fetchCurrentLocation();
    }
  }, [session, customerProfile]);

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

  const parentCategories = categories.filter(cat => !cat.parent_id);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md backdrop-blur-md">
      
      {/* Standard Marquee Banner */}
      <div className="bg-emerald-900/60 text-emerald-100 overflow-hidden py-1 px-3 text-[10px] sm:text-xs font-bold tracking-wider uppercase border-b border-emerald-500/20">
        <div className="whitespace-nowrap animate-marquee flex items-center justify-around">
          <span>⚡ Quick & Free Delivery in Harraiya</span>
          <span className="hidden sm:inline">⚡ Quick & Free Delivery in Harraiya</span>
          <span className="hidden md:inline">⚡ Quick & Free Delivery in Harraiya</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10 py-2.5 sm:py-3 space-y-2.5 sm:space-y-3">
        
        {/* Main Row: Brand, Search, and Notification */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo & Address Selector */}
          <div className="flex items-center gap-2.5 min-w-0 relative shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center cursor-pointer group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-inner border border-white/20 group-hover:scale-105 transition">
                KD
              </div>
            </button>
            
            <div className="min-w-0 relative">
              <h1 className="font-black text-white text-xs sm:text-sm tracking-tight truncate drop-shadow-sm leading-tight">KD Store</h1>
              
              <button
                onClick={() => session?.user && savedAddresses.length > 0 && setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="text-[10px] sm:text-xs text-emerald-100 font-medium truncate flex items-center gap-1 hover:text-white transition cursor-pointer text-left opacity-90 leading-tight mt-0.5"
              >
                <MapPin size={11} className="text-emerald-300 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-xs">{addressDisplay}</span>
                {session?.user && savedAddresses.length > 0 && <ChevronDown size={11} className="shrink-0 text-emerald-200" />}
              </button>

              {isAddressDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white text-stone-900 rounded-xl shadow-xl border border-stone-200/90 py-1.5 z-50 space-y-0.5">
                  <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
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
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition flex items-center justify-between group cursor-pointer text-xs"
                      >
                        <span className="font-bold text-stone-700 truncate pr-2">{addr.address || addr.street || addr.city}</span>
                        {addressDisplay.includes(addr.address || addr.street) && <Check size={14} className="text-emerald-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Central Search Bar */}
          {showSearch && (
            <div className="flex flex-1 max-w-md sm:max-w-xl mx-2 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                placeholder="Search groceries, vegetables..."
                className="w-full bg-white/95 text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm font-medium pl-10 pr-3 py-2 sm:py-2.5 rounded-xl shadow-inner outline-none focus:ring-2 focus:ring-emerald-300 transition"
              />
            </div>
          )}

          {/* Right Action Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell session={session} size={18} className="text-white hover:bg-white/20 p-2 rounded-xl transition" />
          </div>
        </div>

        {/* Parent Category Horizontal Strip Bar (Balanced spacing and standard font sizes) */}
        <div className="pt-1 pb-1 overflow-x-auto scrollbar-none flex items-center gap-3 sm:gap-5">
          <button
            onClick={() => onSelectCategory && onSelectCategory(null)}
            className={`flex flex-col items-center justify-center shrink-0 cursor-pointer group transition pb-1 border-b-2 ${
              !selectedCategory ? 'border-white text-white font-black' : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-105 transition shadow-2xs mb-1">
              <Package size={16} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight">All</span>
          </button>

          {parentCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id || selectedCategory === cat.name;
            const categoryImage = cat.image || cat.image_url || cat.icon;

            return (
              <button
                key={cat.id || cat.name}
                onClick={() => onSelectCategory && onSelectCategory(cat.id || cat.name)}
                className={`flex flex-col items-center justify-center shrink-0 cursor-pointer group transition pb-1 border-b-2 relative ${
                  isSelected ? 'border-white text-white font-black' : 'border-transparent text-emerald-100 hover:text-white'
                }`}
              >
                {cat.isNew && (
                  <span className="absolute -top-1 right-0 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-xs animate-pulse">
                    New
                  </span>
                )}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-105 transition shadow-2xs mb-1 overflow-hidden">
                  {categoryImage ? (
                    <img src={categoryImage} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </div>
                <span className="text-[11px] sm:text-xs font-bold tracking-tight truncate max-w-[70px]">{cat.name}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}