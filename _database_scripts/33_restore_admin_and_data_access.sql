-- ==============================================================================
-- 33_restore_admin_and_data_access.sql
-- ChiiMenu Master Admin Helper & Data Access Restoration
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE SECURITY DEFINER is_admin() FUNCTION
-- ------------------------------------------------------------------------------
-- Why: Prevents RLS subquery recursion across all tables.
-- Bypasses RLS internally to check both public.admins table and public.profiles.role = 'admin'
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    EXISTS (SELECT 1 FROM public.admins WHERE id = COALESCE(user_id, auth.uid()))
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = COALESCE(user_id, auth.uid()) AND role = 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;


-- ------------------------------------------------------------------------------
-- 2. INSERT CURRENT ADMIN USER INTO public.admins
-- ------------------------------------------------------------------------------
-- Add all users with role = 'admin' in profiles into public.admins
INSERT INTO public.admins (id)
SELECT id FROM public.profiles WHERE role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- If you have a specific admin email, auto-insert from auth.users:
INSERT INTO public.admins (id)
SELECT id FROM auth.users 
WHERE email = current_user OR id IN (SELECT id FROM public.profiles WHERE role = 'admin')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 3. UPDATE RLS ON admins TABLE (Clean & Non-Recursive)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admins;

CREATE POLICY "Users can check own admin status"
ON public.admins FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;


-- ------------------------------------------------------------------------------
-- 4. UPDATE RLS ON stores TABLE (Seamless Merchant & Admin Access)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Merchants and Admins can view own store" ON public.stores;
DROP POLICY IF EXISTS "Merchants and Admins can update store" ON public.stores;

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
-- 5. UPDATE RLS ON orders TABLE
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Merchants and Admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants and Admins can update orders" ON public.orders;

CREATE POLICY "Merchants and Admins can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Merchants and Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR public.is_admin()
);


-- ------------------------------------------------------------------------------
-- 6. VERIFY ALL ADMIN USERS & STORES
-- ------------------------------------------------------------------------------
SELECT 
  s.id AS "Store ID",
  s.name AS "Store Name",
  s.slug AS "Slug",
  s.line_user_id AS "LINE Connected ID",
  s.owner_id AS "Owner ID",
  p.full_name AS "Owner Name",
  p.role AS "Owner Role"
FROM public.stores s
LEFT JOIN public.profiles p ON s.owner_id = p.id;
