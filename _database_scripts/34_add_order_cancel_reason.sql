-- Migration 34: Add cancel_reason and cancelled_at columns to orders table
-- Allows merchants to track cancellation reasons for business analytics

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancel_reason text,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

COMMENT ON COLUMN public.orders.cancel_reason IS 'Reason for order cancellation (e.g. Customer cancelled, Out of stock, Duplicate order)';
COMMENT ON COLUMN public.orders.cancelled_at IS 'Timestamp when order was cancelled';
