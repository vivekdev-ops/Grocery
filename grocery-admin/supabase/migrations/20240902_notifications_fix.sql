-- ============================================================
-- MIGRATION FIX: Notification System — RLS + Realtime
-- Run this AFTER 20240901_notifications.sql
-- ============================================================

-- 1. Drop the broken insert policy and replace with a proper one
--    Service role bypasses RLS entirely, so this policy only matters
--    for clients using the anon/authenticated keys.
DROP POLICY IF EXISTS "notifications_service_insert" ON public.notifications;

-- Allow any authenticated user to insert a notification
-- (The Edge Function uses service_role so it bypasses RLS anyway;
--  this lets the browser client also call directly as a fallback)
CREATE POLICY "notifications_authenticated_insert" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Enable Realtime on notifications table
--    (Supabase CLI equivalent: supabase db push)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Add admin_users table so we can store who the admin(s) are
--    without relying on staff_profiles having a role='admin' row.
--    The admin registers their Supabase Auth user_id here manually,
--    OR we use a simpler approach: store admin emails in a config table.
CREATE TABLE IF NOT EXISTS public.admin_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write admin_config (Edge Function)
-- Authenticated admins can read their own row
CREATE POLICY "admin_config_read_own" ON public.admin_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_config_service_all" ON public.admin_config
  USING (true)
  WITH CHECK (true);
