/**
 * notifications.js
 *
 * Two-layer notification system:
 *   Layer 1 (always works): Direct Supabase INSERT into `notifications` table
 *                           → powers the real-time in-app bell immediately
 *   Layer 2 (when deployed): Edge Function `send-notification`
 *                           → also fires FCM push to Android devices
 *
 * This dual approach means in-app bell works even before the Edge Function
 * is deployed or when FCM setup is incomplete.
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabaseClient';

// ─── DIRECT DB WRITE (Layer 1 — always works) ─────────────────────────────

/**
 * Writes a notification row directly to Supabase.
 * This is the primary mechanism for in-app bell notifications.
 * Works as long as the `notifications` table exists and RLS allows it.
 */
async function insertNotification({ recipientUserId, recipientRole, title, body, type, orderId }) {
  if (!recipientUserId) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: recipientUserId,
    role: recipientRole,
    title,
    body,
    type,
    order_id: orderId || null,
  });
  if (error) {
    // Silently log — don't throw, notifications are non-critical
    console.warn('[Notification] DB insert failed:', error.message, error.code);
  }
}

// ─── EDGE FUNCTION CALL (Layer 2 — FCM push, optional) ────────────────────

/**
 * Calls the Edge Function to additionally send FCM push notifications.
 * Fails silently if the function isn't deployed or FCM isn't configured.
 */
async function triggerEdgeFunction({ recipientUserId, recipientRole, title, body, type, orderId }) {
  try {
    // Remove trailing slash from URL if present (common .env issue)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ recipientUserId, recipientRole, title, body, type, orderId: orderId || null }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('[Notification] Edge function returned:', res.status, text);
    }
  } catch (err) {
    // Edge function not deployed yet — that's okay, Layer 1 already wrote the row
    console.warn('[Notification] Edge function unreachable (FCM push skipped):', err.message);
  }
}

// ─── MAIN sendNotification ─────────────────────────────────────────────────

/**
 * Sends an in-app notification (direct DB write) and optionally fires
 * an FCM push via the Edge Function.
 */
export async function sendNotification({ recipientUserId, recipientRole, title, body, type, orderId }) {
  if (!recipientUserId) return;

  // Layer 1: direct DB insert — this is what the bell listens to via Realtime
  await insertNotification({ recipientUserId, recipientRole, title, body, type, orderId });

  // Layer 2: fire-and-forget Edge Function for FCM push
  triggerEdgeFunction({ recipientUserId, recipientRole, title, body, type, orderId });
}

// ─── FCM TOKEN REGISTRATION ────────────────────────────────────────────────

/**
 * Registers the device for push notifications and persists the FCM token.
 * Only runs on native Android/iOS — skips silently in web browsers.
 */
export async function registerPushToken(userId, role) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted:', permResult.receive);
      return;
    }

    await PushNotifications.register();

    await new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        await saveFcmToken(userId, token.value, role);
        resolve();
      });
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err);
        resolve();
      });
    });

    // Foreground push handler
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      window.dispatchEvent(new CustomEvent('pushNotificationReceived', { detail: notification }));
    });

    // Tap handler (background/killed app)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      window.dispatchEvent(new CustomEvent('pushNotificationTapped', { detail: action }));
    });
  } catch (err) {
    console.error('[Push] registerPushToken error:', err);
  }
}

async function saveFcmToken(userId, token, role) {
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert(
      { user_id: userId, token, role, platform: 'android', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  if (error) console.error('[Push] saveFcmToken error:', error.message);
}

// ─── ADMIN USER ID LOOKUP ──────────────────────────────────────────────────

/**
 * Gets admin user IDs. Strategy (in order):
 *  1. Check admin_config table (most reliable)
 *  2. Fall back to staff_profiles where role = 'admin' or role = 'manager'
 *  3. If still empty, the admin is the currently authenticated session user
 *     (works when admin is placing test orders from the same browser)
 */
async function getAdminUserIds() {
  // Try admin_config table first
  const { data: configData } = await supabase
    .from('admin_config')
    .select('user_id');

  if (configData && configData.length > 0) {
    return configData.map(r => r.user_id).filter(Boolean);
  }

  // Fall back to staff_profiles with admin/manager roles
  const { data: staffData } = await supabase
    .from('staff_profiles')
    .select('user_id')
    .in('role', ['admin', 'manager', 'owner']);

  if (staffData && staffData.length > 0) {
    return staffData.map(r => r.user_id).filter(Boolean);
  }

  // Last resort: get the current session user (admin testing in their own browser)
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ? [session.user.id] : [];
}

async function getDeliveryAgentUserIds() {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('user_id')
    .in('role', ['delivery', 'delivery_man', 'delivery_boy', 'delivery_partner']);
  if (error || !data) return [];
  return data.map(r => r.user_id).filter(Boolean);
}

// ─── SELF-REGISTER ADMIN ──────────────────────────────────────────────────

/**
 * Call this once from AdminLayout after session is available.
 * Registers the current logged-in user as an admin in admin_config.
 */
export async function registerAdminUser(userId) {
  if (!userId) return;
  await supabase
    .from('admin_config')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
}

// ─── EVENT NOTIFICATION HELPERS ───────────────────────────────────────────

export async function notifyAdminOrderPlaced(order) {
  const adminIds = await getAdminUserIds();
  if (!adminIds.length) { console.warn('[Notification] No admin IDs found'); return; }
  await Promise.all(
    adminIds.map(id =>
      sendNotification({
        recipientUserId: id,
        recipientRole: 'admin',
        title: '🛒 New Order Placed',
        body: `Order #${order.id.slice(0, 8)} — ₹${Number(order.total_amount || 0).toFixed(0)} from ${order.customer_email || 'customer'}`,
        type: 'order_placed',
        orderId: order.id,
      })
    )
  );
}

export async function notifyShopkeeperOrderPlaced(order, shopkeeperUserIds) {
  if (!shopkeeperUserIds?.length) return;
  await Promise.all(
    shopkeeperUserIds.map(id =>
      sendNotification({
        recipientUserId: id,
        recipientRole: 'shopkeeper',
        title: '🛍️ New Order for Your Products',
        body: `Order #${order.id.slice(0, 8)} — ₹${Number(order.total_amount || 0).toFixed(0)} needs your attention.`,
        type: 'order_placed',
        orderId: order.id,
      })
    )
  );
}

export async function notifyCustomerOrderStatus(order, newStatus, remark) {
  if (!order?.customer_id) return;

  const statusMessages = {
    processing:       { title: '✅ Order Confirmed',           body: 'Your order is being prepared by the store.' },
    accepted:         { title: '🚴 Delivery Partner Assigned', body: 'A delivery partner has accepted your order.' },
    pickup:           { title: '📦 Rider at Store',            body: 'Your delivery partner has reached the store.' },
    out_for_delivery: { title: '🚀 Out for Delivery',          body: 'Your order is on the way! Get ready.' },
    delivered:        { title: '🎉 Order Delivered',           body: 'Your order has been delivered. Enjoy!' },
    cancelled:        { title: '❌ Order Cancelled',           body: remark ? `Cancelled: ${remark}` : 'Your order has been cancelled.' },
    shipped:          { title: '📮 Order Shipped',             body: 'Your order is on its way to you.' },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return;

  await sendNotification({
    recipientUserId: order.customer_id,
    recipientRole: 'customer',
    title: msg.title,
    body: `${msg.body} (Order #${order.id.slice(0, 8)})`,
    type: 'order_status',
    orderId: order.id,
  });
}

export async function notifyDeliveryAgentAssigned(order, agentUserId) {
  if (!agentUserId) return;
  await sendNotification({
    recipientUserId: agentUserId,
    recipientRole: 'delivery',
    title: '📋 New Delivery Assignment',
    body: `Order #${order.id.slice(0, 8)} — ₹${Number(order.total_amount || 0).toFixed(0)} to ${order.delivery_address || 'customer address'}`,
    type: 'agent_assigned',
    orderId: order.id,
  });
}

export async function notifyDeliveryAgentsNewOrder(order) {
  const agentIds = await getDeliveryAgentUserIds();
  if (!agentIds.length) return;
  await Promise.all(
    agentIds.map(id =>
      sendNotification({
        recipientUserId: id,
        recipientRole: 'delivery',
        title: '🟢 New Order Available',
        body: `Order #${order.id.slice(0, 8)} — ₹${Number(order.total_amount || 0).toFixed(0)} is ready for pickup.`,
        type: 'order_available',
        orderId: order.id,
      })
    )
  );
}

export async function notifyAdminDeliveryUpdate(order, newStatus, agentName) {
  const adminIds = await getAdminUserIds();
  if (!adminIds.length) return;

  const statusLabels = {
    accepted:         `accepted by ${agentName || 'a rider'}`,
    pickup:           `rider reached store`,
    out_for_delivery: `out for delivery by ${agentName || 'rider'}`,
    delivered:        `delivered ✓`,
  };
  const label = statusLabels[newStatus] || newStatus;

  await Promise.all(
    adminIds.map(id =>
      sendNotification({
        recipientUserId: id,
        recipientRole: 'admin',
        title: '🔔 Delivery Update',
        body: `Order #${order.id.slice(0, 8)} — ${label}`,
        type: 'delivery_update',
        orderId: order.id,
      })
    )
  );
}
