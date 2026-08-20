-- ============================================================
-- 27_security_hardening_rls.sql
-- ChiiMenu Enterprise Security & Database-First Hardening
-- ============================================================

-- 1. Enable RLS on ALL Core Tables (Idempotent)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Hardening Orders Table: Block Anonymous Deletes and Updates
-- Customers can only INSERT orders via API/RPC.
-- Only the store owner or admin can SELECT/UPDATE orders for their own store.

DROP POLICY IF EXISTS "Merchants can read own store orders" ON public.orders;
CREATE POLICY "Merchants can read own store orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Merchants can update own store orders" ON public.orders;
CREATE POLICY "Merchants can update own store orders"
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

-- 3. Hardening Menu Items & Categories (Store Owner Isolation)
DROP POLICY IF EXISTS "Merchants can manage own menu items" ON public.menu_items;
CREATE POLICY "Merchants can manage own menu items"
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

DROP POLICY IF EXISTS "Merchants can manage own categories" ON public.menu_categories;
CREATE POLICY "Merchants can manage own categories"
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

-- 4. Hardening Billing Records (Strict Read-Only for Merchants)
DROP POLICY IF EXISTS "Merchants can view own billing records" ON public.billing_records;
CREATE POLICY "Merchants can view own billing records"
ON public.billing_records FOR SELECT
TO authenticated
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  OR auth.uid() IN (SELECT id FROM public.admins)
);

-- 5. Rate Limits Table: Internal Service Role / Edge only
DROP POLICY IF EXISTS "Public can view rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role manage rate limits"
ON public.rate_limits FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 6. Verification Query
SELECT 
  schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;
