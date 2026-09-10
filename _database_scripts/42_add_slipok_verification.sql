-- ========================================================
-- Migration: 42_add_slipok_verification.sql
-- Description: Add SlipOK verification columns & indexes to billing_records
-- ========================================================

-- 1. Add slip verification columns to public.billing_records
ALTER TABLE public.billing_records 
  ADD COLUMN IF NOT EXISTS slip_trans_ref TEXT,
  ADD COLUMN IF NOT EXISTS slip_url TEXT,
  ADD COLUMN IF NOT EXISTS slip_data JSONB;

-- 2. Add Unique Index on slip_trans_ref to strictly prevent duplicate slips (Anti-Replay Attack)
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_records_slip_trans_ref 
  ON public.billing_records (slip_trans_ref) 
  WHERE slip_trans_ref IS NOT NULL;

-- 3. Add Index on store_id and created_at for billing history performance
CREATE INDEX IF NOT EXISTS idx_billing_records_store_created 
  ON public.billing_records (store_id, created_at DESC);

-- 4. Audit comments
COMMENT ON COLUMN public.billing_records.slip_trans_ref IS 'Bank transaction reference from slip (unique per payment to prevent replay attacks)';
COMMENT ON COLUMN public.billing_records.slip_url IS 'Public/Storage URL of verified bank slip';
COMMENT ON COLUMN public.billing_records.slip_data IS 'Raw payload from SlipOK verification API for audit inspection';
