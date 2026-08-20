-- ==============================================================================
-- 29_finalize_rls_perfection.sql
-- ChiiMenu 100% Zero-Ghost-Policy & Final RLS Perfection Script
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN & TIGHTEN: menu_item_allergens
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.menu_item_allergens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view item allergens" ON public.menu_item_allergens;
DROP POLICY IF EXISTS "Owner can view item allergen" ON public.menu_item_allergens;
DROP POLICY IF EXISTS "Owner can insert item allergen" ON public.menu_item_allergens;
DROP POLICY IF EXISTS "Owner can update item allergen" ON public.menu_item_allergens;
DROP POLICY IF EXISTS "Owner can delete item allergen" ON public.menu_item_allergens;
DROP POLICY IF EXISTS "Admins can manage all menu item allergens" ON public.menu_item_allergens;

-- Public can view allergens only for active menu items in active stores
CREATE POLICY "Public can view active item allergens"
ON public.menu_item_allergens FOR SELECT
TO anon, authenticated
USING (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE is_available = true 
    AND store_id IN (SELECT id FROM public.stores WHERE is_active = true)
  )
);

-- Merchants and Admins can manage item allergens for their own store items
CREATE POLICY "Merchants and Admins can manage item allergens"
ON public.menu_item_allergens FOR ALL
TO authenticated
USING (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  )
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  )
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 2. HARDEN & TIGHTEN: menu_item_customizations
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.menu_item_customizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view item customizations" ON public.menu_item_customizations;
DROP POLICY IF EXISTS "Owner can view item custom" ON public.menu_item_customizations;
DROP POLICY IF EXISTS "Owner can insert item custom" ON public.menu_item_customizations;
DROP POLICY IF EXISTS "Owner can update item custom" ON public.menu_item_customizations;
DROP POLICY IF EXISTS "Owner can delete item custom" ON public.menu_item_customizations;
DROP POLICY IF EXISTS "Admins can manage all menu item customizations" ON public.menu_item_customizations;

-- Public can view customizations only for active menu items in active stores
CREATE POLICY "Public can view active item customizations"
ON public.menu_item_customizations FOR SELECT
TO anon, authenticated
USING (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE is_available = true 
    AND store_id IN (SELECT id FROM public.stores WHERE is_active = true)
  )
);

-- Merchants and Admins can manage item customizations for their own store items
CREATE POLICY "Merchants and Admins can manage item customizations"
ON public.menu_item_customizations FOR ALL
TO authenticated
USING (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  )
  OR auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
  menu_item_id IN (
    SELECT id FROM public.menu_items 
    WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  )
  OR auth.uid() IN (SELECT id FROM public.admins)
);


-- ------------------------------------------------------------------------------
-- 3. HARDEN & CONSOLIDATE: qr_codes
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view QR" ON public.qr_codes;
DROP POLICY IF EXISTS "Merchant QR Access" ON public.qr_codes;
DROP POLICY IF EXISTS "Admins can manage all qr codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Owner can view QR" ON public.qr_codes;
DROP POLICY IF EXISTS "Owner can insert QR" ON public.qr_codes;
DROP POLICY IF EXISTS "Owner can update QR" ON public.qr_codes;
DROP POLICY IF EXISTS "Owner can delete QR" ON public.qr_codes;

-- Public can only view active QR codes for active stores
CREATE POLICY "Public can view active qr codes"
ON public.qr_codes FOR SELECT
TO anon, authenticated
USING (
  is_active = true 
  AND store_id IN (SELECT id FROM public.stores WHERE is_active = true)
);

-- Merchants and Admins can manage QR codes for their own store
CREATE POLICY "Merchants and Admins can manage qr codes"
ON public.qr_codes FOR ALL
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
-- 4. MASTER SECURITY AUDIT QUERY (Zero-Ghost Guarantee)
-- ------------------------------------------------------------------------------
SELECT 
  tablename AS "Table",
  policyname AS "Policy Name",
  cmd AS "Command",
  roles AS "Roles",
  CASE 
    WHEN tablename = 'allergens' AND cmd = 'SELECT' THEN '📖 Public Reference Dictionary'
    WHEN qual = 'true' OR with_check = 'true' THEN '⚠️ GHOST POLICY (UNRESTRICTED)'
    WHEN qual IS NULL AND with_check IS NULL THEN '⚠️ EMPTY CONDITIONS'
    ELSE '🔒 Guarded'
  END AS "Security Status",
  COALESCE(LEFT(qual, 75), '-') AS "USING Condition",
  COALESCE(LEFT(with_check, 75), '-') AS "WITH CHECK Condition"
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;
