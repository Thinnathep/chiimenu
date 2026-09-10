-- ==============================================================================
-- 43_fix_anon_menu_access_rls.sql
-- Fix Anonymous Customer Menu Access & RLS Permission Denied Bug
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CRITICAL: GRANT SELECT ON public.admins TO anon
-- ------------------------------------------------------------------------------
-- Explanation:
-- When an unauthenticated tourist scans a QR code, Supabase executes as role `anon`.
-- When querying `stores` or `menu_items`, PostgreSQL evaluates RLS policies.
-- If any policy contains subqueries referencing `public.admins`, PostgreSQL requires
-- table-level SELECT privilege on `public.admins`.
-- Because `public.admins` has RLS enabled (only authenticated admins can view rows),
-- `anon` will safely see 0 rows, but PostgreSQL will NOT throw error 42501.
GRANT SELECT ON public.admins TO anon, authenticated, service_role;

-- Ensure RLS on public.admins is secure and non-recursive
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admins;

CREATE POLICY "Users can check own admin status"
ON public.admins FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());


-- ------------------------------------------------------------------------------
-- 2. FIX RLS ON stores TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or unrestricted policies
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can update all stores" ON public.stores;
DROP POLICY IF EXISTS "Merchants and Admins can view own store" ON public.stores;
DROP POLICY IF EXISTS "Merchants and Admins can update store" ON public.stores;

-- Public can view active stores
CREATE POLICY "Public can view active stores"
ON public.stores FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Merchants and Admins can view their own stores or all stores
CREATE POLICY "Merchants and Admins can view own store"
ON public.stores FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY "Merchants and Admins can update store"
ON public.stores FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_admin()
);


-- ------------------------------------------------------------------------------
-- 3. FIX RLS ON qr_codes TABLE
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.qr_codes TO anon, authenticated, service_role;
ALTER TABLE IF EXISTS public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Public can view qr codes" ON public.qr_codes;

CREATE POLICY "Public can view active qr_codes"
ON public.qr_codes FOR SELECT
TO anon, authenticated
USING (is_active = true);


-- ------------------------------------------------------------------------------
-- 4. FIX RLS ON menu_categories TABLE
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.menu_categories TO anon, authenticated, service_role;
ALTER TABLE IF EXISTS public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON public.menu_categories;

CREATE POLICY "Public can view active categories"
ON public.menu_categories FOR SELECT
TO anon, authenticated
USING (is_active = true);


-- ------------------------------------------------------------------------------
-- 5. FIX RLS ON menu_items TABLE
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.menu_items TO anon, authenticated, service_role;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can view available items" ON public.menu_items;

CREATE POLICY "Public can view available menu items"
ON public.menu_items FOR SELECT
TO anon, authenticated
USING (is_available = true);


-- ------------------------------------------------------------------------------
-- 6. FIX RLS ON allergens & menu_item_allergens TABLES
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.allergens TO anon, authenticated, service_role;
GRANT SELECT ON public.menu_item_allergens TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_item_allergens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view allergens" ON public.allergens;
CREATE POLICY "Public can view allergens"
ON public.allergens FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view menu allergens" ON public.menu_item_allergens;
CREATE POLICY "Public can view menu allergens"
ON public.menu_item_allergens FOR SELECT
TO anon, authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 7. FIX RLS ON customization_groups & customization_options TABLES
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.customization_groups TO anon, authenticated, service_role;
GRANT SELECT ON public.customization_options TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customization_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view custom groups" ON public.customization_groups;
CREATE POLICY "Public can view custom groups"
ON public.customization_groups FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view custom options" ON public.customization_options;
CREATE POLICY "Public can view custom options"
ON public.customization_options FOR SELECT
TO anon, authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 8. RESTORE DISH AVAILABILITY & EXTEND EXPIRED STORES
-- ------------------------------------------------------------------------------
-- Ensure all menu items are marked available for ordering
UPDATE public.menu_items 
SET is_available = true 
WHERE is_available = false;

-- Extend trial for active stores that have expired
UPDATE public.stores 
SET trial_ends_at = NOW() + INTERVAL '365 days'
WHERE trial_ends_at < NOW();
