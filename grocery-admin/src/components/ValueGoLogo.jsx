// src/components/ValueGoLogo.jsx
export default function ValueGoLogo({ className = "w-11 h-11" }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer group select-none">
      {/* Icon Graphic */}
      <div className={`relative ${className} bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition transform`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      
      {/* Brand Text */}
      <div className="flex flex-col">
        <span className="text-lg sm:text-xl font-black tracking-tight text-stone-900 leading-tight">
          Value<span className="text-emerald-600">go</span>
        </span>
        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full w-max flex items-center gap-1 mt-0.5 border border-emerald-200/60 shadow-2xs">
          ⚡ 10 MINS SUPERFAST DELIVERY
        </span>
      </div>
    </div>
  );
}