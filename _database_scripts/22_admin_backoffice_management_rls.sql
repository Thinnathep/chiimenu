-- ============================================================
-- ChiiMenu Migration: 22_admin_backoffice_management_rls.sql
-- Grant Super Admins full permissions to manage Store Menus,
-- Categories, Customizations, and QR Codes for Back-Office Setup
-- ============================================================

-- 1. Menu Categories: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;
CREATE POLICY "Admins can manage all menu categories"
ON public.menu_categories FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 2. Menu Items: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
CREATE POLICY "Admins can manage all menu items"
ON public.menu_items FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 3. Customization Groups: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all customization groups" ON public.customization_groups;
CREATE POLICY "Admins can manage all customization groups"
ON public.customization_groups FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 4. Customization Options: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all customization options" ON public.customization_options;
CREATE POLICY "Admins can manage all customization options"
ON public.customization_options FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 5. Menu Item Customizations Join Table: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all menu item customizations" ON public.menu_item_customizations;
CREATE POLICY "Admins can manage all menu item customizations"
ON public.menu_item_customizations FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 6. Menu Item Allergens Join Table: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all menu item allergens" ON public.menu_item_allergens;
CREATE POLICY "Admins can manage all menu item allergens"
ON public.menu_item_allergens FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 7. QR Codes: Allow Admins full management
DROP POLICY IF EXISTS "Admins can manage all qr codes" ON public.qr_codes;
CREATE POLICY "Admins can manage all qr codes"
ON public.qr_codes FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 8. Storage Buckets: Allow Admins to upload to chiimenu-images and store_assets
-- (Checked via Supabase storage policies if exists)
