// src/components/CollapsedAddressSelector.jsx
import { useState } from 'react';
import { MapPin, ChevronDown, Check, Plus } from 'lucide-react';

export default function CollapsedAddressSelector({ addresses, selectedAddressId, onSelectAddressId, onAddNewAddress }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find the selected address object, or fallback to default, or the first one
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId) || 
                          addresses.find(addr => addr.is_default) || 
                          addresses[0];

  const displayString = selectedAddress ? 
    `${selectedAddress.house_no || ''}, ${selectedAddress.ward_no_name || ''}, ${selectedAddress.city || ''} - ${selectedAddress.pincode || ''}` : 
    'No delivery address selected';

  if (!addresses || addresses.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">No saved addresses found.</span>
        <button onClick={onAddNewAddress} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
          <Plus size={14} /> Add Address
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden font-sans">
      
      {/* Collapsed Header View */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <MapPin size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 uppercase">Delivery Address</span>
              {selectedAddress?.title && (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.2 rounded uppercase">
                  {selectedAddress.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 font-medium">
              {displayString}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
          <span>{isExpanded ? 'Hide' : 'Change'}</span>
          <ChevronDown size={16} className={`transform transition duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded List View */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50/60 space-y-2 animate-fadeIn">
          <p className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-wider">Select Delivery Location</p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {addresses.map(addr => {
              const isSelected = (addr.id === selectedAddressId || (!selectedAddressId && addr.is_default));
              const addrString = `${addr.house_no || ''}, ${addr.ward_no_name || ''}, ${addr.city || ''} - ${addr.pincode || ''}`;

              return (
                <div 
                  key={addr.id}
                  onClick={() => {
                    onSelectAddressId(addr.id);
                    setIsExpanded(false);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className={isSelected ? 'text-emerald-600' : 'text-slate-400'} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                          {addr.title || 'Address'}
                        </span>
                        {addr.is_default && <span className="text-[9px] text-emerald-700 font-bold">Default</span>}
                      </div>
                      <p className={`text-xs font-medium line-clamp-1 mt-0.5 ${isSelected ? 'text-emerald-950 font-bold' : 'text-slate-700'}`}>
                        {addrString}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check size={16} className="text-emerald-600 shrink-0" />}
                </div>
              );
            })}
          </div>

          <button 
            onClick={onAddNewAddress}
            className="w-full mt-1 py-2.5 bg-white border border-dashed border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add New Address
          </button>
        </div>
      )}

    </div>
  );
}