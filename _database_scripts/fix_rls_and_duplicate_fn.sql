-- ============================================================
-- ChiiMenu RLS Fix Script
-- แก้ไข 3 ปัญหาที่พบจากการ Audit
-- ⚠️ อ่านทำความเข้าใจก่อนรัน — บอสต้องรันเองใน Supabase SQL Editor
-- ============================================================

-- ==========================================================
-- FIX 1: แก้ Hardcoded Email → ใช้ admins table แทน
-- (แก้ใน admin_action_logs, orders, stores)
-- ==========================================================

-- 1A. admin_action_logs — ลบ email-based policy, ใช้ admins table
DROP POLICY IF EXISTS "Admins can manage logs" ON public.admin_action_logs;
CREATE POLICY "Admins can manage logs"
ON public.admin_action_logs FOR ALL
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 1B. orders — ลบ email-based admin policy
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 1C. stores — ลบ email-based admin policies
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
CREATE POLICY "Admins can view all stores"
ON public.stores FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update all stores" ON public.stores;
CREATE POLICY "Admins can update all stores"
ON public.stores FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ==========================================================
-- FIX 2: ลบ Duplicate customization_options policies
-- (มี 2 policy ที่ทำหน้าที่เดียวกัน)
-- ==========================================================

DROP POLICY IF EXISTS "Public can view customization options" ON public.customization_options;
-- เก็บแค่ "Public can view custom options" ไว้อันเดียว

DROP POLICY IF EXISTS "Public can view customization groups" ON public.customization_groups;
-- เก็บแค่ "Public can view custom groups" ไว้อันเดียว

-- ==========================================================
-- FIX 3: ลบ Duplicate admin_update_store_plan function
-- (มี 2 ตัว ทำให้เรียกไม่ได้โดยไม่ระบุ signature)
-- ==========================================================

-- ลบทุก overload ก่อน แล้วสร้างใหม่ครั้งเดียว
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, varchar, timestamptz, varchar, jsonb);

-- สร้างใหม่ version เดียว (version ล่าสุดที่มี billing support)
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

  IF p_action = 'deduct_custom' AND (p_note IS NULL OR trim(p_note) = '') THEN
    RAISE EXCEPTION 'Validation Error: note is required for deduct_custom action';
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

-- ==========================================================
-- ตรวจสอบว่าแก้ถูกต้อง
-- ==========================================================

-- ควรเหลือแค่ 1 ตัว
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'admin_update_store_plan';

-- ควรไม่มี email hardcode แล้ว
SELECT tablename, policyname, LEFT(qual, 100) as condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND qual LIKE '%gmail%';
