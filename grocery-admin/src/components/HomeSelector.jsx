// src/components/HomeSelector.jsx
import { Link } from 'react-router-dom';
import { LayoutDashboard, Store, Truck, ShoppingBasket, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const portals = [
  {
    to: '/admin',
    label: 'Admin Portal',
    desc: 'Manage inventory, orders, staff & analytics',
    icon: LayoutDashboard,
    gradient: 'from-brand-600 to-brand-800',
    glow: 'shadow-brand-500/30',
    ring: 'group-hover:ring-brand-400',
    bg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    hoverBg: 'group-hover:bg-brand-100',
    accent: '#059669',
  },
  {
    to: '/shopkeeper',
    label: 'Shopkeeper App',
    desc: 'Manage your products & view your orders',
    icon: Store,
    gradient: 'from-violet-600 to-purple-800',
    glow: 'shadow-violet-500/30',
    ring: 'group-hover:ring-violet-400',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    hoverBg: 'group-hover:bg-violet-100',
    accent: '#7c3aed',
  },
  {
    to: '/delivery',
    label: 'Delivery App',
    desc: 'View & update your assigned deliveries',
    icon: Truck,
    gradient: 'from-sky-600 to-blue-800',
    glow: 'shadow-sky-500/30',
    ring: 'group-hover:ring-sky-400',
    bg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    hoverBg: 'group-hover:bg-sky-100',
    accent: '#0284c7',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function HomeSelector() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 font-sans overflow-hidden bg-gradient-to-br from-stone-50 via-white to-brand-50/40">

      {/* Ambient background blobs */}
      <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-brand-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-400/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-sky-400/8 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Floating decorative ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute top-12 right-12 w-24 h-24 rounded-full border-2 border-dashed border-brand-200/60 pointer-events-none hidden md:block"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-16 left-16 w-16 h-16 rounded-full border-2 border-dashed border-violet-200/60 pointer-events-none hidden md:block"
      />

      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-2 flex items-center gap-3"
      >
        <div className="w-11 h-11 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 animate-glow-pulse">
          <ShoppingBasket size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-none">Harraiya Super Market</h1>
          <p className="text-[11px] text-brand-600 font-bold mt-0.5 flex items-center gap-1">
            <Sparkles size={10} /> Quick Commerce Platform
          </p>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm text-stone-400 mb-10 font-medium"
      >
        Select your portal to continue
      </motion.p>

      {/* Portal cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col sm:flex-row gap-5 flex-wrap justify-center max-w-3xl w-full"
      >
        {portals.map((p) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.to} variants={cardVariant} className="flex-1 min-w-[200px] max-w-[220px] mx-auto sm:mx-0">
              <Link
                to={p.to}
                className={`group relative bg-white/80 backdrop-blur-sm p-7 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center gap-4 text-center ring-2 ring-transparent ${p.ring} transition-all duration-300 hover:shadow-xl ${p.glow} hover:-translate-y-1 hover:border-transparent block`}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r ${p.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className={`w-16 h-16 ${p.bg} ${p.hoverBg} rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg`}>
                  <Icon size={30} className={p.iconColor} />
                </div>

                <div>
                  <h2 className="text-sm font-black text-stone-800 group-hover:text-stone-900">{p.label}</h2>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{p.desc}</p>
                </div>

                <div className={`flex items-center gap-1 text-xs font-black ${p.iconColor} opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0`}>
                  Enter <ArrowRight size={13} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <Link
          to="/"
          className="mt-10 text-xs text-stone-400 hover:text-brand-600 transition-colors flex items-center gap-1.5 font-medium group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Back to Customer Storefront
        </Link>
      </motion.div>
    </div>
  );
}
