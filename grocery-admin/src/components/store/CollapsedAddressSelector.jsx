// src/components/CollapsedAddressSelector.jsx
import { useState } from 'react';
import { MapPin, ChevronDown, Check, Plus } from 'lucide-react';

export default function CollapsedAddressSelector({ addresses, selectedAddressId, onSelectAddressId, onAddNewAddress }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId) || 
                          addresses.find(addr => addr.is_default) || 
                          addresses[0];

  const displayString = selectedAddress ? 
    `${selectedAddress.house_no || ''}, ${selectedAddress.ward_no_name || ''}, ${selectedAddress.city || ''} - ${selectedAddress.pincode || ''}` : 
    'No delivery address selected';

  if (!addresses || addresses.length === 0) {
    return (
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-slate-200">
        <span className="text-xs text-slate-400 font-medium">No saved addresses found.</span>
        <button onClick={onAddNewAddress} className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md shadow-emerald-500/20">
          <Plus size={14} /> Add Address
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-sans">
      
      {/* Collapsed Header View */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/60">
            <MapPin size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Delivery Address</span>
              {selectedAddress?.title && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                  {selectedAddress.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-medium">
              {displayString}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
          <span>{isExpanded ? 'Hide' : 'Change'}</span>
          <ChevronDown size={16} className={`transform transition duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded List View */}
      {isExpanded && (
        <div className="border-t border-slate-800 p-3 bg-slate-950/70 space-y-2 animate-fadeIn">
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
                    isSelected ? 'bg-emerald-950/50 border-emerald-600/60 shadow-lg shadow-emerald-950' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin size={14} className={isSelected ? 'text-emerald-400' : 'text-slate-500'} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                          {addr.title || 'Address'}
                        </span>
                        {addr.is_default && <span className="text-[9px] text-emerald-400 font-bold">Default</span>}
                      </div>
                      <p className={`text-xs font-medium line-clamp-1 mt-1 ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {addrString}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check size={16} className="text-emerald-400 shrink-0" />}
                </div>
              );
            })}
          </div>

          <button 
            onClick={onAddNewAddress}
            className="w-full mt-1 py-2.5 bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add New Address
          </button>
        </div>
      )}

    </div>
  );
}