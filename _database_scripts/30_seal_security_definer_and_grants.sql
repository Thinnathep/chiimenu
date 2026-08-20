-- ==============================================================================
-- 30_seal_security_definer_and_grants.sql
-- ChiiMenu Master Security Sealing: Revoke Table Grants & Seal RPCs
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CRITICAL: REVOKE ALL PRIVILEGES ON submit_customer_order RPC FROM PUBLIC & ANON
-- ------------------------------------------------------------------------------
-- Goal: Block attackers from calling POST /rest/v1/rpc/submit_customer_order 
-- with anon key to bypass Nitro Server rate limit & anti-tampering.
REVOKE EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) FROM authenticated;

-- Only service_role (Nitro Backend Server) is allowed to execute this RPC
GRANT EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) TO service_role;


-- ------------------------------------------------------------------------------
-- 2. CRITICAL: SEAL TABLE-LEVEL PERMISSIONS (GRANTS) ON orders TABLE
-- ------------------------------------------------------------------------------
-- Goal: Strip any residual INSERT/UPDATE/DELETE grants on orders from anon/public.
REVOKE ALL ON public.orders FROM PUBLIC;
REVOKE ALL ON public.orders FROM anon;

-- Merchants only need SELECT & UPDATE (RLS will filter to their own store)
GRANT SELECT, UPDATE ON public.orders TO authenticated;

-- Nitro backend has full access via service_role
GRANT ALL ON public.orders TO service_role;


-- ------------------------------------------------------------------------------
-- 3. SEAL RATE_LIMITS TABLE PERMISSIONS
-- ------------------------------------------------------------------------------
-- Completely deny any direct client-side interaction with rate_limits
REVOKE ALL ON public.rate_limits FROM PUBLIC;
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;
GRANT ALL ON public.rate_limits TO service_role;


-- ------------------------------------------------------------------------------
-- 4. SEAL SENSITIVE ADMIN & BILLING TABLES
-- ------------------------------------------------------------------------------
-- Strip anon from sensitive tables
REVOKE ALL ON public.billing_records FROM PUBLIC, anon;
GRANT SELECT ON public.billing_records TO authenticated;
GRANT ALL ON public.billing_records TO service_role;

REVOKE ALL ON public.profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

REVOKE ALL ON public.admins FROM PUBLIC, anon;
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;

REVOKE ALL ON public.admin_action_logs FROM PUBLIC, anon;
GRANT ALL ON public.admin_action_logs TO authenticated;
GRANT ALL ON public.admin_action_logs TO service_role;

REVOKE ALL ON public.admin_access_logs FROM PUBLIC, anon;
GRANT SELECT ON public.admin_access_logs TO authenticated;
GRANT ALL ON public.admin_access_logs TO service_role;


-- ------------------------------------------------------------------------------
-- 5. VERIFY ROUTINE & TABLE PRIVILEGES AUDIT QUERY
-- ------------------------------------------------------------------------------
-- A. Verify that NO anon or public grants exist on sensitive functions:
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

-- B. Verify Table Grants on orders & rate_limits:
SELECT 
  table_name AS "Table",
  grantee AS "Grantee Role",
  string_agg(privilege_type, ', ') AS "Privileges",
  CASE 
    WHEN grantee = 'anon' AND table_name IN ('orders', 'rate_limits', 'billing_records', 'profiles', 'admins') THEN '⚠️ ANONYMOUS ACCESS'
    ELSE '🔒 Guarded'
  END AS "Security Status"
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('orders', 'rate_limits', 'billing_records', 'profiles', 'admins')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
