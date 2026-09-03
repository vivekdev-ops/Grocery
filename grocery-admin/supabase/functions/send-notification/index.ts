/**
 * Supabase Edge Function: send-notification
 *
 * Receives a notification payload, writes it to the `notifications` table
 * (for the in-app bell), then fetches all FCM tokens for the recipient and
 * sends an FCM v1 push notification via Google's HTTP API.
 *
 * Required env vars (set in Supabase Dashboard → Functions → Secrets):
 *   SUPABASE_URL           — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS for inserts)
 *   FCM_PROJECT_ID         — Firebase project ID (e.g. "grocery-f907f")
 *   FCM_SERVICE_ACCOUNT_JSON — full service account JSON as a string
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── CORS headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientUserId, recipientRole, title, body, type, orderId } = await req.json();

    if (!recipientUserId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Insert in-app notification row ────────────────────────────────────────
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: recipientUserId,
      role: recipientRole,
      title,
      body,
      type,
      order_id: orderId || null,
    });

    if (dbError) console.error('DB insert error:', dbError.message);

    // 2. Fetch all FCM tokens for this user ────────────────────────────────────
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', recipientUserId);

    if (!tokens || tokens.length === 0) {
      // No device tokens — in-app notification already saved, that's fine
      return new Response(JSON.stringify({ success: true, pushed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get FCM OAuth2 access token ───────────────────────────────────────────
    const accessToken = await getFcmAccessToken();

    // 4. Send push to each device token ───────────────────────────────────────
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

    const pushResults = await Promise.allSettled(
      tokens.map(({ token }) =>
        fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: {
                type,
                orderId: orderId || '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channel_id: 'kdstore_orders',
                },
              },
            },
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errText = await res.text();
            // Remove stale tokens (UNREGISTERED / INVALID_ARGUMENT)
            if (errText.includes('UNREGISTERED') || errText.includes('INVALID_ARGUMENT')) {
              await supabase.from('fcm_tokens').delete().eq('token', token);
            }
            throw new Error(errText);
          }
          return res.json();
        })
      )
    );

    const pushed = pushResults.filter(r => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ success: true, pushed, total: tokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-notification error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── FCM OAuth2 helper ────────────────────────────────────────────────────────
/**
 * Generates a short-lived Bearer token for the FCM v1 API using the
 * service account JSON stored in FCM_SERVICE_ACCOUNT_JSON.
 * Uses the `jsonwebtoken`-compatible approach with Deno's crypto API.
 */
async function getFcmAccessToken(): Promise<string> {
  const sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${header}.${payload}`;
  const privateKeyPem = sa.private_key;

  // Import the private key
  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get FCM access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
