// src/components/ValueGoLogo.jsx
import { Zap } from 'lucide-react';

export default function ValueGoLogo() {
  return (
    <div className="flex items-center gap-2.5 cursor-pointer group">
      <div className="w-11 h-11 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition duration-300">
        <Zap size={22} className="fill-white" />
      </div>
      <div>
        <h1 className="font-black text-xl tracking-tight text-slate-900 leading-none">Value<span className="text-emerald-600">Go</span></h1>
        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">10-Mins Delivery</p>
      </div>
    </div>
  );
}