-- ============================================================
-- MIGRATION: Notification System
-- Creates: notifications table, fcm_tokens table, RLS policies
-- ============================================================

-- 1. FCM device tokens — one per device per user
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin','shopkeeper','delivery','customer')),
  platform    text NOT NULL DEFAULT 'android',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY "fcm_tokens_self" ON public.fcm_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. In-app notifications — persisted per recipient
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('admin','shopkeeper','delivery','customer')),
  title        text NOT NULL,
  body         text NOT NULL,
  type         text NOT NULL,          -- e.g. 'order_placed','order_status','agent_assigned'
  order_id     uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Allow the service_role (Edge Function) to INSERT notifications for any user
CREATE POLICY "notifications_service_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);


-- 3. Helper: update fcm_tokens.updated_at on upsert
CREATE OR REPLACE FUNCTION public.set_fcm_token_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fcm_token_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_fcm_token_updated_at();
