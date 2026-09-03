/**
 * useNotifications.js
 *
 * Fetches in-app notifications and subscribes to new ones in real-time.
 * Falls back to polling every 10s if Realtime subscription fails.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const PAGE_SIZE = 30;

export function useNotifications(session) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const channelRef  = useRef(null);
  const pollRef     = useRef(null);

  const userId = session?.user?.id;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.warn('[useNotifications] fetch error:', error.message, error.code);
    } else if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
    setLoading(false);
  }, [userId]);

  // ── Realtime + polling fallback ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // 1. Try Realtime subscription
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new;
          setNotifications(prev => [n, ...prev].slice(0, PAGE_SIZE));
          setUnreadCount(prev => prev + 1);
          window.dispatchEvent(new CustomEvent('inAppNotification', { detail: n }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime is working — no need for polling
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime failed — start polling every 8 seconds as fallback
          console.warn('[useNotifications] Realtime unavailable, falling back to polling');
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchNotifications, 8000);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [userId, fetchNotifications]);

  // ── Mark single read ──────────────────────────────────────────────────────
  const markRead = useCallback(async (notifId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
      .eq('user_id', userId);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [userId]);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
