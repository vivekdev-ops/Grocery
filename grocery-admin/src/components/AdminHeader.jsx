// src/components/AdminHeader.jsx
import { LogOut, ShieldCheck } from 'lucide-react';
import ValueGoLogo from './ValueGoLogo';

export default function AdminHeader({ userEmail, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-2xs">
      <ValueGoLogo />

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-200">
          <ShieldCheck size={14} className="text-emerald-600" /> Admin Portal
        </div>

        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-900">{userEmail}</p>
          <p className="text-[10px] text-slate-400 font-medium">Authorized Hub</p>
        </div>

        <button 
          onClick={onLogout}
          className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition duration-200 border border-slate-200"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}