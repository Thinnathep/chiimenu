-- ==============================================================================
-- 31_revoke_public_functions_grant.sql
-- ChiiMenu Master RPC Hardening: Revoke Default PUBLIC Execution Privilege
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVOKE DEFAULT "PUBLIC" & "ANON" EXECUTE FROM ALL FUNCTIONS IN SCHEMA public
-- ------------------------------------------------------------------------------
-- By default in PostgreSQL, every function is granted EXECUTE to PUBLIC.
-- This command strips all default public access from every routine in the public schema.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;


-- ------------------------------------------------------------------------------
-- 2. EXPLICITLY GRANT FUNCTION PRIVILEGES TO INTENDED ROLES ONLY
-- ------------------------------------------------------------------------------

-- A. submit_customer_order: Locked 100% to Nitro Backend Server (Service Role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'submit_customer_order') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) TO service_role;';
  END IF;
END $$;

-- B. get_merchant_analytics: Authenticated Merchants & Super Admins (Protected by internal auth.uid() owner check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_merchant_analytics') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_merchant_analytics(UUID, TEXT) TO authenticated, service_role;';
  END IF;
END $$;

-- C. admin_update_store_plan: Authenticated Super Admins & Service Role (Protected by internal admins table check)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_signature 
    FROM pg_proc 
    WHERE proname = 'admin_update_store_plan'
  ) LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_signature || ' TO authenticated, service_role;';
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- 3. FINAL ROUTINE PRIVILEGES VERIFICATION QUERY
-- ------------------------------------------------------------------------------
SELECT 
  routine_name AS "Function Name",
  grantee AS "Grantee Role",
  privilege_type AS "Privilege",
  CASE 
    WHEN grantee IN ('anon', 'PUBLIC') THEN '⚠️ EXPOSED TO PUBLIC/ANON'
    ELSE '🔒 Secure (Service Role / Auth Only)'
  END AS "Security Status"
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name IN ('submit_customer_order', 'get_merchant_analytics', 'admin_update_store_plan')
ORDER BY routine_name, grantee;
