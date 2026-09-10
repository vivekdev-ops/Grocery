// src/components/store/StoreHeader.jsx
import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../NotificationBell';

export default function StoreHeader({
  session, customerProfile, showSearch = true,
  searchQuery = '', setSearchQuery, totalItemsCount = 0, onOpenCart, onOpenProfile,
  sortBy = 'default', setSortBy, isCategorySelected = false
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

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl backdrop-blur-md">
      
      {/* Marquee Banner */}
      <div className="bg-emerald-800/80 text-emerald-100 overflow-hidden py-1.5 px-4 text-xs font-black tracking-wider uppercase border-b border-emerald-500/30">
        <div className="whitespace-nowrap animate-marquee flex items-center justify-around">
          <span>⚡ Quick and Free Delivery in Harraiya</span>
          <span className="hidden sm:inline">⚡ Quick and Free Delivery in Harraiya</span>
          <span className="hidden md:inline">⚡ Quick and Free Delivery in Harraiya</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-3.5 space-y-3">
        
        {/* Top Main Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Interactive Address Selector */}
          <div className="flex items-center gap-3 min-w-0 relative">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 cursor-pointer group shrink-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-black shadow-inner border border-white/20 group-hover:scale-105 transition">
                KD
              </div>
            </button>
            
            <div className="min-w-0 relative">
              <h1 className="font-black text-white text-xs sm:text-sm tracking-tight truncate drop-shadow-sm">KD Store Quick Commerce</h1>
              
              {/* Address Dropdown Toggle */}
              <button
                onClick={() => session?.user && savedAddresses.length > 0 && setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="text-[11px] text-emerald-100 font-bold truncate flex items-center gap-1 mt-0.5 hover:text-white transition cursor-pointer text-left opacity-90"
              >
                <MapPin size={12} className="text-emerald-300 shrink-0" />
                <span className="truncate">{addressDisplay}</span>
                {session?.user && savedAddresses.length > 0 && <ChevronDown size={12} className="shrink-0 text-emerald-200" />}
              </button>

              {/* Popup Saved Addresses Dropdown for Logged-In Users */}
              {isAddressDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-stone-900 rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 space-y-1">
                  <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Select Delivery Address</span>
                    <button 
                      onClick={() => { setIsAddressDropdownOpen(false); navigate('/account/address'); }}
                      className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 px-1">
                    {savedAddresses.map((addr, idx) => (
                      <button
                        key={addr.id || idx}
                        onClick={() => handleSelectAddress(addr)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 transition flex items-center justify-between group cursor-pointer text-xs"
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

          {/* Right Action Icons (Wishlist, Cart, Profile removed as requested) */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell session={session} size={18} className="text-white hover:bg-white/20 p-2.5 rounded-xl transition" />
          </div>
        </div>

      </div>
    </header>
  );
}