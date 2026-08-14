-- 1. Add promotion tracking to stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS has_used_first_time_promo boolean DEFAULT false;

-- 2. Add discount tracking to billing_records
ALTER TABLE public.billing_records
ADD COLUMN IF NOT EXISTS original_amount numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric,
ADD COLUMN IF NOT EXISTS promotion_code text;

-- 3. We also need to update the admin_update_store_plan function to handle the new fields
-- First drop all versions of the function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, integer, numeric, text, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, integer, numeric, text, text, text, text, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, varchar, timestamptz, varchar, jsonb);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, timestamptz, text, jsonb, numeric, text, integer, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.admin_update_store_plan(uuid, text, integer, numeric, text, text, text, text, text, numeric, numeric, numeric, numeric, text);

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
AS $$
DECLARE
    v_receipt_no TEXT;
    v_has_used_promo BOOLEAN;
    v_expected_amount NUMERIC;
    v_standard_amount NUMERIC;
    v_first_time_amount NUMERIC;
BEGIN
    -- 1. Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can update store plans';
    END IF;

    -- 2. Promotion Validation & Price Calculation (Atomic)
    IF p_package_name IS NOT NULL AND p_package_days IS NOT NULL THEN
        -- Get current store promo state
        SELECT has_used_first_time_promo INTO v_has_used_promo
        FROM public.stores
        WHERE id = p_store_id;

        IF v_has_used_promo IS NULL THEN
            RAISE EXCEPTION 'Store not found';
        END IF;

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

    -- 3. Update store (Will abort and rollback if validation failed)
    UPDATE public.stores
    SET 
        plan_status = p_plan_status,
        trial_ends_at = p_trial_ends_at,
        has_used_first_time_promo = CASE 
            WHEN p_promotion_code = 'FIRST_TIME_50' THEN true 
            ELSE has_used_first_time_promo 
        END
    WHERE id = p_store_id;

    -- 4. Create billing record
    IF p_amount IS NOT NULL AND p_package_name IS NOT NULL AND p_package_days IS NOT NULL THEN
        v_receipt_no := public.generate_receipt_number();
        
        INSERT INTO public.billing_records (
            store_id, receipt_number, package_name, package_days, amount, 
            payment_method, plan_start_at, plan_end_at, note, created_by,
            original_amount, discount_amount, promotion_code
        ) VALUES (
            p_store_id, v_receipt_no, p_package_name, p_package_days, p_amount, 
            'bank_transfer', now(), p_trial_ends_at, p_note, auth.uid(),
            p_original_amount, p_discount_amount, p_promotion_code
        );
    END IF;

    -- 5. Log the admin action
    INSERT INTO public.admin_action_logs (
        admin_id, action, target_store_id, details
    ) VALUES (
        auth.uid(),
        p_action,
        p_store_id,
        p_details || jsonb_build_object(
            'package_name', p_package_name,
            'package_days', p_package_days,
            'amount', p_amount,
            'promotion_code', p_promotion_code
        )
    );
END;
$$;
