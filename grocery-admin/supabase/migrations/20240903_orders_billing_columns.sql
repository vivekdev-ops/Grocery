-- Add discount_amount and delivery_fee columns to orders table
-- These are needed so InvoiceModal can show accurate billing breakdowns

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee    numeric(10,2) NOT NULL DEFAULT 0;
