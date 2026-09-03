/**
 * NotificationBell.jsx
 *
 * A reusable bell icon button with:
 *  - Animated red badge showing unread count
 *  - Dropdown panel listing notifications (newest first)
 *  - Click to mark individual notification as read
 *  - "Mark all read" action
 *  - Closes on outside click
 *
 * Props:
 *   session  — Supabase session object
 *   size     — icon size in px (default 16)
 *   className — extra wrapper classes
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Package, Truck, ShoppingCart, CheckCircle2, X, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../hooks/useNotifications';

// ── Icon map by notification type ─────────────────────────────────────────
const TYPE_ICONS = {
  order_placed:    { Icon: ShoppingCart, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  order_status:    { Icon: Package,      bg: 'bg-sky-100',     color: 'text-sky-600'     },
  agent_assigned:  { Icon: Truck,        bg: 'bg-violet-100',  color: 'text-violet-600'  },
  delivery_update: { Icon: Truck,        bg: 'bg-amber-100',   color: 'text-amber-600'   },
  order_available: { Icon: Package,      bg: 'bg-brand-100',   color: 'text-brand-600'   },
  default:         { Icon: Bell,         bg: 'bg-stone-100',   color: 'text-stone-500'   },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ session, size = 16, className = '' }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(session);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => setOpen(o => !o);

  const handleClickNotif = (notif) => {
    if (!notif.is_read) markRead(notif.id);
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  if (!session) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={size} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white leading-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-[200] overflow-hidden"
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-stone-500" />
                <span className="text-xs font-black text-stone-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="text-[10px] text-brand-600 hover:text-brand-800 font-bold transition cursor-pointer px-1"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                  <BellOff size={28} className="text-stone-300" />
                  <p className="text-xs font-bold text-stone-400">No notifications yet</p>
                  <p className="text-[10px] text-stone-300">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {notifications.map((notif) => {
                    const { Icon, bg, color } = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleClickNotif(notif)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer
                          ${notif.is_read ? 'bg-white hover:bg-stone-50' : 'bg-brand-50/40 hover:bg-brand-50'}`}
                      >
                        {/* Icon bubble */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={14} className={color} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[11px] font-bold text-stone-900 leading-snug ${!notif.is_read ? 'font-black' : ''}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[10px] text-stone-500 mt-0.5 leading-snug line-clamp-2">
                            {notif.body}
                          </p>
                          <p className="text-[9px] text-stone-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
