-- ==============================================================================
-- 28_audit_and_harden_rls_matrix.sql
-- ChiiMenu Master RLS Security Hardening & Zero-Trust Architecture
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX CRITICAL VULNERABILITY: rate_limits Table
-- ------------------------------------------------------------------------------
-- Goal: Deny ALL direct client access (anon & authenticated).
-- Only Service Role (Backend Nitro Engine) can access this table via bypassrls.
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Public can view rate limits" ON public.rate_limits;
-- (No policies created for rate_limits = Default Deny All for public/authenticated)


-- ------------------------------------------------------------------------------
-- 2. ZERO-TRUST HARDENING: orders Table
-- ------------------------------------------------------------------------------
-- Business Integrity & Anti-Fraud Architecture:
-- • NO DIRECT CLIENT INSERT: Block direct Supabase REST API inserts from anon/authenticated.
--   Every order MUST pass through Nitro Server API (/api/order/submit) with Service Role,
--   ensuring IP rate limiting, anti-tampering DB price validation, and XSS sanitization.
-- • Merchants & Admins: SELECT & UPDATE ONLY on their own store orders.
-- • DELETE: DENIED FOR EVERYONE (Audit trail preservation).
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant Order Access" ON public.orders;
DROP POLICY IF EXISTS "Merchants can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants can read own store orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update own store orders" ON public.orders;

-- Policy A: Store Owner can SELECT their own store orders
CREATE POLICY "Merchants and Admins can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);

-- Policy B: Store Owner can UPDATE their own store orders (e.g. status)
CREATE POLICY "Merchants and Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);
-- (No INSERT policy for anon/authenticated = Direct REST API insert blocked. Handled securely by Nitro Server Service Role)


-- ------------------------------------------------------------------------------
-- 3. HARDEN & CONSOLIDATE: stores Table
-- ------------------------------------------------------------------------------
-- Matrix:
-- • Public/Anon: SELECT ONLY active stores (for tourist menu display)
-- • Merchant: SELECT, INSERT, UPDATE, DELETE ONLY on their own store (owner_id = auth.uid())
-- • Admin: SELECT & UPDATE all stores
ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Enable select for users based on owner_id" ON public.stores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.stores;
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON public.stores;
DROP POLICY IF EXISTS "Enable delete for users based on owner_id" ON public.stores;
DROP POLICY IF EXISTS "Owner can view own store" ON public.stores;
DROP POLICY IF EXISTS "Owner can insert own store" ON public.stores;
DROP POLICY IF EXISTS "Owner can update own store" ON public.stores;
DROP POLICY IF EXISTS "Owner can delete own store" ON public.stores;
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can update all stores" ON public.stores;

CREATE POLICY "Public can view active stores"
ON public.stores FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Merchants and Admins can view own store"
ON public.stores FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR auth.uid() IN (SELECT id FROM public.admins)
);

CREATE POLICY "Merchants can insert own store"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Merchants and Admins can update store"
ON public.stores FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  owner_id = auth.uid()
  OR auth.uid() IN (SELECT id FROM public.admins)
);

CREATE POLICY "Merchants can delete own store"
ON public.stores FOR DELETE
TO authenticated
USING (owner_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 4. HARDEN & CONSOLIDATE: menu_items Table
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_menus" ON public.menu_items;
DROP POLICY IF EXISTS "Public can view available items" ON public.menu_items;
DROP POLICY IF EXISTS "Owner can view item" ON public.menu_items;
DROP POLICY IF EXISTS "Owner can insert item" ON public.menu_items;
DROP POLICY IF EXISTS "Owner can update item" ON public.menu_items;
DROP POLICY IF EXISTS "Owner can delete item" ON public.menu_items;
DROP POLICY IF EXISTS "merchant_manage_own_menus" ON public.menu_items;
DROP POLICY IF EXISTS "Merchants can manage own menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;

CREATE POLICY "Public can view available menu items"
ON public.menu_items FOR SELECT
TO anon, authenticated
USING (
  is_available = true 
  AND store_id IN (SELECT id FROM public.stores WHERE is_active = true)
);

CREATE POLICY "Merchants and Admins can manage menu items"
ON public.menu_items FOR ALL
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 5. HARDEN & CONSOLIDATE: menu_categories Table
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owner can view category" ON public.menu_categories;
DROP POLICY IF EXISTS "Owner can insert category" ON public.menu_categories;
DROP POLICY IF EXISTS "Owner can update category" ON public.menu_categories;
DROP POLICY IF EXISTS "Owner can delete category" ON public.menu_categories;
DROP POLICY IF EXISTS "Merchants can manage own categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;

CREATE POLICY "Public can view active categories"
ON public.menu_categories FOR SELECT
TO anon, authenticated
USING (
  is_active = true 
  AND store_id IN (SELECT id FROM public.stores WHERE is_active = true)
);

CREATE POLICY "Merchants and Admins can manage categories"
ON public.menu_categories FOR ALL
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 6. HARDEN & CONSOLIDATE: customization_groups & options
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customization_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view custom groups" ON public.customization_groups;
DROP POLICY IF EXISTS "Owner can view custom group" ON public.customization_groups;
DROP POLICY IF EXISTS "Owner can insert custom group" ON public.customization_groups;
DROP POLICY IF EXISTS "Owner can update custom group" ON public.customization_groups;
DROP POLICY IF EXISTS "Owner can delete custom group" ON public.customization_groups;
DROP POLICY IF EXISTS "Admins can manage all customization groups" ON public.customization_groups;

CREATE POLICY "Public can view custom groups"
ON public.customization_groups FOR SELECT
TO anon, authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE is_active = true)
);

CREATE POLICY "Merchants and Admins can manage custom groups"
ON public.customization_groups FOR ALL
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);

-- Options
DROP POLICY IF EXISTS "Public can view custom options" ON public.customization_options;
DROP POLICY IF EXISTS "Owner can view custom option" ON public.customization_options;
DROP POLICY IF EXISTS "Owner can insert custom option" ON public.customization_options;
DROP POLICY IF EXISTS "Owner can update custom option" ON public.customization_options;
DROP POLICY IF EXISTS "Owner can delete custom option" ON public.customization_options;
DROP POLICY IF EXISTS "Admins can manage all customization options" ON public.customization_options;

CREATE POLICY "Public can view custom options"
ON public.customization_options FOR SELECT
TO anon, authenticated
USING (
  group_id IN (SELECT id FROM public.customization_groups WHERE store_id IN (SELECT id FROM public.stores WHERE is_active = true))
);

CREATE POLICY "Merchants and Admins can manage custom options"
ON public.customization_options FOR ALL
TO authenticated
USING (
  group_id IN (SELECT id FROM public.customization_groups WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  group_id IN (SELECT id FROM public.customization_groups WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 7. HARDEN & CONSOLIDATE: billing_records Table
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.billing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_read_own_billing" ON public.billing_records;
DROP POLICY IF EXISTS "admin_read_all_billing" ON public.billing_records;
DROP POLICY IF EXISTS "Merchants can view own billing records" ON public.billing_records;

CREATE POLICY "Merchants and Admins can view billing records"
ON public.billing_records FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 8. HARDEN & CONSOLIDATE: profiles Table
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR auth.uid() IN (SELECT id FROM public.admins)
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());


-- ------------------------------------------------------------------------------
-- 9. HARDEN & CONSOLIDATE: admins and admin_action_logs Tables
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins"
ON public.admins FOR SELECT
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.admins));

DROP POLICY IF EXISTS "Admins can manage logs" ON public.admin_action_logs;
DROP POLICY IF EXISTS "Admins can insert logs or unauthorized_attempts" ON public.admin_action_logs;
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_action_logs;

CREATE POLICY "Admins can view and manage action logs"
ON public.admin_action_logs FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT id FROM public.admins))
WITH CHECK (auth.uid() IN (SELECT id FROM public.admins));


-- ------------------------------------------------------------------------------
-- 10. COMPREHENSIVE RLS AUDIT VERIFICATION QUERY (CHECKS BOTH USING & WITH CHECK)
-- ------------------------------------------------------------------------------
-- Inspects both qual (USING) and with_check expressions to guarantee zero ghost policies:
SELECT 
  tablename AS "Table",
  policyname AS "Policy Name",
  cmd AS "Command",
  roles AS "Roles",
  CASE 
    WHEN qual = 'true' OR with_check = 'true' THEN '⚠️ GHOST POLICY (UNRESTRICTED)'
    WHEN qual IS NULL AND with_check IS NULL THEN '⚠️ EMPTY CONDITIONS'
    ELSE '🔒 Guarded'
  END AS "Security Status",
  COALESCE(LEFT(qual, 80), '-') AS "USING Condition",
  COALESCE(LEFT(with_check, 80), '-') AS "WITH CHECK Condition"
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;
