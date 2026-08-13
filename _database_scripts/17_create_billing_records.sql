-- ==========================================
-- Migration: 17_create_billing_records.sql
-- ==========================================

-- 1. Create table
CREATE TABLE public.billing_records (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id         UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  receipt_number   TEXT NOT NULL UNIQUE,
  package_name     TEXT NOT NULL,
  package_days     INTEGER NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  payment_method   TEXT NOT NULL DEFAULT 'bank_transfer',
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan_start_at    TIMESTAMPTZ NOT NULL,
  plan_end_at      TIMESTAMPTZ NOT NULL,
  note             TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.billing_records IS 'เก็บประวัติการชำระเงินของร้านค้าแต่ละร้าน';
COMMENT ON COLUMN public.billing_records.receipt_number IS 'เลขใบเสร็จ format: CR-YYYYMMDD-XXXX';
COMMENT ON COLUMN public.billing_records.package_days IS 'จำนวนวันที่ได้รับ: 14, 30, หรือ 365';
COMMENT ON COLUMN public.billing_records.amount IS 'ราคาที่ชำระจริง (บาท) รวม VAT แล้ว';

-- 2. Enable RLS
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_read_own_billing"
ON public.billing_records FOR SELECT
USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "admin_read_all_billing"
ON public.billing_records FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.admins));

-- 3. Create receipt number function
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today TEXT := TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'YYYYMMDD');
  v_prefix TEXT := 'CR-' || v_today || '-';
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM public.billing_records
  WHERE receipt_number LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- 4. Update RPC
-- Drop the existing versions (trying both text and varchar to be safe)
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, varchar, timestamptz, varchar, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb);

CREATE OR REPLACE FUNCTION public.admin_update_store_plan(
  p_store_id      UUID,
  p_plan_status   TEXT,
  p_trial_ends_at TIMESTAMPTZ,
  p_action        TEXT,
  p_details       JSONB,
  p_amount        NUMERIC DEFAULT NULL,
  p_package_name  TEXT DEFAULT NULL,
  p_package_days  INTEGER DEFAULT NULL,
  p_note          TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_start TIMESTAMPTZ;
  v_receipt_no TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.stores
  SET
    plan_status   = p_plan_status,
    trial_ends_at = p_trial_ends_at,
    updated_at    = NOW()
  WHERE id = p_store_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_store_id, details)
  VALUES (auth.uid(), p_action, p_store_id, p_details);

  IF p_amount IS NOT NULL AND p_package_name IS NOT NULL AND p_package_days IS NOT NULL THEN
    v_receipt_no := public.generate_receipt_number();

    INSERT INTO public.billing_records (
      store_id, receipt_number, package_name, package_days,
      amount, payment_method, paid_at,
      plan_start_at, plan_end_at, note, created_by
    ) VALUES (
      p_store_id, v_receipt_no, p_package_name, p_package_days,
      p_amount, 'bank_transfer', NOW(),
      NOW(), p_trial_ends_at, p_note, auth.uid()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text) TO authenticated;
