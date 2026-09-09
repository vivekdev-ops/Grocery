// src/components/CollapsedAddressSelector.jsx
import React, { useState } from 'react';
import { MapPin, ChevronDown, Plus, MoreVertical, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CollapsedAddressSelector({
  addresses = [],
  selectedAddressId,
  onSelectAddressId,
  onAddNewAddress
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const selectedAddress = safeAddresses.find((a) => a.id === selectedAddressId) || safeAddresses[0];

  return (
    <>
      {/* Trigger Card showing current address with a Change button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100">
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 text-xs">
                Delivering to {selectedAddress?.title || 'Home'}
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-medium truncate max-w-[200px] mt-0.5">
              {selectedAddress?.address || 'Select delivery address'}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-emerald-500 font-black text-xs hover:underline cursor-pointer shrink-0"
        >
          Change
        </button>
      </div>

      {/* Select an Address Bottom Sheet Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end justify-center z-[9999] font-sans">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              className="bg-white rounded-t-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 max-h-[85vh] relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto" />

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h3 className="font-black text-slate-900 text-base">Select an Address</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Address Cards List */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto scrollbar-none">
                {safeAddresses.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-6">No saved addresses found.</p>
                ) : (
                  safeAddresses.map((addr) => {
                    const isSelected = addr.id === selectedAddressId;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          onSelectAddressId(addr.id);
                          setIsModalOpen(false);
                        }}
                        className={`p-4 rounded-3xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected 
                            ? 'border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10' 
                            : 'border-stone-200/80 bg-white hover:border-stone-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="pt-0.5 shrink-0">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300 bg-transparent'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{addr.title}</h4>
                            <p className="text-stone-500 text-[11px] font-medium leading-relaxed mt-0.5">{addr.address}</p>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer shrink-0"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Address Button */}
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  if (onAddNewAddress) onAddNewAddress();
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <Plus size={18} className="stroke-[3]" /> Add New Address
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}