-- ==========================================
-- Migration: 18_compliance_and_realtime.sql
-- ==========================================

-- 1. VAT & Tax compliance for billing_records
ALTER TABLE public.billing_records 
  ADD COLUMN company_name TEXT,
  ADD COLUMN company_address TEXT,
  ADD COLUMN tax_id TEXT,
  ADD COLUMN net_amount NUMERIC(10,2),
  ADD COLUMN vat_amount NUMERIC(10,2);

COMMENT ON COLUMN public.billing_records.company_name IS 'ชื่อบริษัท/นิติบุคคล สำหรับออกใบกำกับภาษี';
COMMENT ON COLUMN public.billing_records.tax_id IS 'เลขประจำตัวผู้เสียภาษี 13 หลัก';

-- 2. API Rate Limiting Table (to replace in-memory Map)
CREATE TABLE public.rate_limits (
  ip TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  reset_at BIGINT NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies needed. Only accessible via Service Role key in the backend.

-- 3. Enforce expired store blocking at DB level for menu_items
-- First, ensure RLS is enabled
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public to read if store is active AND not expired
CREATE POLICY "public_read_active_menus"
ON public.menu_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id
      AND s.is_active = true
      AND (s.plan_status = 'active' OR s.trial_ends_at > NOW())
  )
);

-- Allow merchants to manage their own menus (regardless of status, they need to see them to manage)
CREATE POLICY "merchant_manage_own_menus"
ON public.menu_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id
      AND s.owner_id = auth.uid()
  )
);

-- 4. Enable Supabase Realtime for orders
-- Supabase realtime publication must exist, but typically we add tables to it.
-- We use a DO block to safely add the table if it's not already there.
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
  END
  $$;
COMMIT;
