-- ==============================================================================
-- 39_protect_profiles_role_escalation.sql
-- ChiiMenu Master Security Hardening:
-- 1. [Protect Profiles Role Escalation]: Trigger to block non-admins from self-assigning admin role
-- 2. [Enforce 12-Param admin_update_store_plan]: Clean up obsolete overloads and guarantee 12-parameter RPC
-- ==============================================================================

-- ==============================================================================
-- 0. SHARED HELPERS (Guaranteed Definition & Search Path Hardening)
-- ==============================================================================

-- Ensure is_admin() exists and is protected with SET search_path = public
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    EXISTS (SELECT 1 FROM public.admins WHERE id = COALESCE(user_id, auth.uid()))
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(user_id, auth.uid()) AND role = 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- Ensure generate_receipt_number() exists for billing generation
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.generate_receipt_number() TO authenticated, service_role;


-- ==============================================================================
-- 1. PREVENT PROFILES ROLE ESCALATION TRIGGER
-- ==============================================================================
-- Goal: Prevent unauthorized privilege escalation where an authenticated user 
-- updates their own profile row to role = 'admin', which would cause public.is_admin()
-- to return true and compromise the entire system.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  -- 1. If role is unchanged, allow immediately (safe for NULLs and benign updates like merchant/profile.vue)
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- 2. Allow PostgreSQL superusers, supabase admin, or backend service_role (e.g. migrations / SQL editor)
  IF (current_user IN ('postgres', 'supabase_admin', 'service_role'))
     OR (coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 3. Allow if caller is an authorized admin
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 4. Otherwise block regular users from escalating their own role
  RAISE EXCEPTION 'ไม่อนุญาตให้แก้ไขสิทธิ์ role ด้วยตนเอง';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_escalation();

GRANT EXECUTE ON FUNCTION public.prevent_role_escalation() TO authenticated, service_role;


-- ==============================================================================
-- 2. CLEAN UP & ENFORCE 12-PARAMETER admin_update_store_plan RPC
-- ==============================================================================
-- Goal: Ensure no duplicate signatures or obsolete 9-parameter overloads exist
-- that cause PostgREST ambiguity errors ("Could not choose a best candidate function")
-- or signature mismatch errors when called from app/pages/admin/stores.vue.

-- A. Drop all prior variations/overloads dynamically to avoid conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_signature 
    FROM pg_proc 
    WHERE proname = 'admin_update_store_plan'
      AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE;';
  END LOOP;
END $$;

-- Also explicitly drop known historical signatures for safety
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, varchar, timestamptz, varchar, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, integer, numeric, text, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, integer, numeric, text, text, text, text, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text, numeric, numeric, text);

-- B. Create the canonical 12-parameter stored procedure (with promotion support & validation)
CREATE OR REPLACE FUNCTION public.admin_update_store_plan(
  p_store_id        UUID,
  p_plan_status     TEXT,
  p_trial_ends_at   TIMESTAMPTZ,
  p_action          TEXT,
  p_details         JSONB,
  p_amount          NUMERIC DEFAULT NULL,
  p_package_name    TEXT DEFAULT NULL,
  p_package_days    INTEGER DEFAULT NULL,
  p_note            TEXT DEFAULT NULL,
  p_original_amount NUMERIC DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT NULL,
  p_promotion_code  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_receipt_no TEXT;
    v_has_used_promo BOOLEAN;
    v_expected_amount NUMERIC;
    v_standard_amount NUMERIC;
    v_first_time_amount NUMERIC;
BEGIN
    -- 1. Check if user is admin (or database superuser / service role)
    IF NOT (
      public.is_admin() 
      OR current_user IN ('postgres', 'supabase_admin', 'service_role') 
      OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can update store plans';
    END IF;

    -- 2. Validate that target store exists upfront (handles NULL has_used_first_time_promo safely)
    SELECT COALESCE(has_used_first_time_promo, false) INTO v_has_used_promo
    FROM public.stores
    WHERE id = p_store_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Store not found';
    END IF;

    -- 3. Validation for deduct_custom action
    IF p_action = 'deduct_custom' AND (p_note IS NULL OR trim(p_note) = '') THEN
        RAISE EXCEPTION 'Validation Error: note is required for deduct_custom action';
    END IF;

    -- 4. Promotion Validation & Price Calculation (Atomic)
    IF p_package_name IS NOT NULL AND p_package_days IS NOT NULL THEN
        -- Determine base prices authoritatively
        IF p_package_days = 14 THEN
            v_standard_amount := 149;
            v_first_time_amount := 75;
        ELSIF p_package_days = 30 THEN
            v_standard_amount := 259;
            v_first_time_amount := 129;
        ELSIF p_package_days = 365 THEN
            v_standard_amount := 2590;
            v_first_time_amount := 1295;
        ELSE
            -- Custom/unknown package logic
            v_standard_amount := p_amount; 
            v_first_time_amount := p_amount;
        END IF;

        -- Process Promotion Code Rules
        IF p_promotion_code = 'FIRST_TIME_50' THEN
            -- Reject if already used
            IF v_has_used_promo = true THEN
                RAISE EXCEPTION 'Promotion FIRST_TIME_50 already consumed for this store.';
            END IF;
            
            v_expected_amount := v_first_time_amount;
            
            -- Reject client amount mismatches
            IF p_amount IS NOT NULL AND p_amount != v_expected_amount THEN
                RAISE EXCEPTION 'Amount mismatch. Expected %, but received %', v_expected_amount, p_amount;
            END IF;
            
        ELSIF p_promotion_code IS NOT NULL AND p_promotion_code != '' THEN
            -- Invalid promotion code
            RAISE EXCEPTION 'Invalid promotion code: %', p_promotion_code;
        ELSE
            -- No promotion code, must be standard price
            v_expected_amount := v_standard_amount;
            
            -- Reject client amount mismatches for standard packages
            IF p_amount IS NOT NULL AND p_amount != v_expected_amount AND p_package_days IN (14, 30, 365) THEN
                RAISE EXCEPTION 'Amount mismatch for standard price. Expected %, but received %', v_expected_amount, p_amount;
            END IF;
        END IF;
    END IF;

    -- 5. Update store (Heals any NULL in has_used_first_time_promo to boolean)
    UPDATE public.stores
    SET 
        plan_status = p_plan_status,
        trial_ends_at = p_trial_ends_at,
        updated_at = now(),
        has_used_first_time_promo = CASE 
            WHEN p_promotion_code = 'FIRST_TIME_50' THEN true 
            ELSE COALESCE(has_used_first_time_promo, false) 
        END
    WHERE id = p_store_id;

    -- Resolve admin ID for audit logging (supports direct SQL execution and authenticated RPC)
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.admins WHERE id IN (SELECT id FROM auth.users) LIMIT 1;
        IF v_admin_id IS NULL THEN
            SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' AND id IN (SELECT id FROM auth.users) LIMIT 1;
        END IF;
    END IF;

    -- 6. Create billing record
    IF p_amount IS NOT NULL AND p_package_name IS NOT NULL AND p_package_days IS NOT NULL THEN
        v_receipt_no := public.generate_receipt_number();
        
        INSERT INTO public.billing_records (
            store_id, receipt_number, package_name, package_days, amount, 
            payment_method, paid_at, plan_start_at, plan_end_at, note, created_by,
            original_amount, discount_amount, promotion_code
        ) VALUES (
            p_store_id, v_receipt_no, p_package_name, p_package_days, p_amount, 
            'bank_transfer', now(), now(), p_trial_ends_at, p_note, v_admin_id,
            p_original_amount, p_discount_amount, p_promotion_code
        );
    END IF;

    -- 7. Log the admin action
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.admin_action_logs (
            admin_id, action, target_store_id, details
        ) VALUES (
            v_admin_id,
            p_action,
            p_store_id,
            COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
                'package_name', p_package_name,
                'package_days', p_package_days,
                'amount', p_amount,
                'promotion_code', p_promotion_code
            )
        );
    END IF;
END;
$$;

-- C. Enforce function execution permissions
REVOKE EXECUTE ON FUNCTION public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text, numeric, numeric, text) TO authenticated, service_role;


-- ==============================================================================
-- 3. VERIFICATION QUERIES (Audit after execution)
-- ==============================================================================
-- Check triggers on profiles
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'profiles'
  AND trigger_name = 'tr_prevent_role_escalation';

-- Check routine signatures for admin_update_store_plan (must be exactly 1 row with 12 params)
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS argument_types,
  p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'admin_update_store_plan';
