-- ==========================================
-- SCRIPT แก้อาการ RLS Violation แบบถาวร 100%
-- สำหรับโปรเจกต์ ChiiMenu (แบบเคลียร์ของเก่าให้หมดก่อนสร้างใหม่)
-- ==========================================

-- 1. STORES
DROP POLICY IF EXISTS "Owner can manage own store" ON stores;
DROP POLICY IF EXISTS "Owner can view own store" ON stores;
DROP POLICY IF EXISTS "Owner can insert store" ON stores;
DROP POLICY IF EXISTS "Owner can update store" ON stores;
DROP POLICY IF EXISTS "Owner can delete store" ON stores;
CREATE POLICY "Owner can insert store" ON stores FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update store" ON stores FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete store" ON stores FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Owner can view own store" ON stores FOR SELECT USING (owner_id = auth.uid());

-- 2. MENU CATEGORIES
DROP POLICY IF EXISTS "Owner can manage categories" ON menu_categories;
DROP POLICY IF EXISTS "Owner can insert category" ON menu_categories;
DROP POLICY IF EXISTS "Owner can update category" ON menu_categories;
DROP POLICY IF EXISTS "Owner can delete category" ON menu_categories;
DROP POLICY IF EXISTS "Owner can view category" ON menu_categories;
CREATE POLICY "Owner can insert category" ON menu_categories FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can update category" ON menu_categories FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can delete category" ON menu_categories FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can view category" ON menu_categories FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 3. MENU ITEMS
DROP POLICY IF EXISTS "Owner can manage items" ON menu_items;
DROP POLICY IF EXISTS "Owner can insert item" ON menu_items;
DROP POLICY IF EXISTS "Owner can update item" ON menu_items;
DROP POLICY IF EXISTS "Owner can delete item" ON menu_items;
DROP POLICY IF EXISTS "Owner can view item" ON menu_items;
CREATE POLICY "Owner can insert item" ON menu_items FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can update item" ON menu_items FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can delete item" ON menu_items FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can view item" ON menu_items FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 4. MENU ITEM ALLERGENS
DROP POLICY IF EXISTS "Owner can manage item allergens" ON menu_item_allergens;
DROP POLICY IF EXISTS "Owner can insert item allergen" ON menu_item_allergens;
DROP POLICY IF EXISTS "Owner can update item allergen" ON menu_item_allergens;
DROP POLICY IF EXISTS "Owner can delete item allergen" ON menu_item_allergens;
DROP POLICY IF EXISTS "Owner can view item allergen" ON menu_item_allergens;
CREATE POLICY "Owner can insert item allergen" ON menu_item_allergens FOR INSERT WITH CHECK (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can update item allergen" ON menu_item_allergens FOR UPDATE USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can delete item allergen" ON menu_item_allergens FOR DELETE USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can view item allergen" ON menu_item_allergens FOR SELECT USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));

-- 5. CUSTOMIZATION GROUPS
DROP POLICY IF EXISTS "Owner can manage custom groups" ON customization_groups;
DROP POLICY IF EXISTS "Owner can insert custom group" ON customization_groups;
DROP POLICY IF EXISTS "Owner can update custom group" ON customization_groups;
DROP POLICY IF EXISTS "Owner can delete custom group" ON customization_groups;
DROP POLICY IF EXISTS "Owner can view custom group" ON customization_groups;
CREATE POLICY "Owner can insert custom group" ON customization_groups FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can update custom group" ON customization_groups FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can delete custom group" ON customization_groups FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can view custom group" ON customization_groups FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 6. CUSTOMIZATION OPTIONS
DROP POLICY IF EXISTS "Owner can manage custom options" ON customization_options;
DROP POLICY IF EXISTS "Owner can insert custom option" ON customization_options;
DROP POLICY IF EXISTS "Owner can update custom option" ON customization_options;
DROP POLICY IF EXISTS "Owner can delete custom option" ON customization_options;
DROP POLICY IF EXISTS "Owner can view custom option" ON customization_options;
CREATE POLICY "Owner can insert custom option" ON customization_options FOR INSERT WITH CHECK (group_id IN (SELECT id FROM customization_groups WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can update custom option" ON customization_options FOR UPDATE USING (group_id IN (SELECT id FROM customization_groups WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can delete custom option" ON customization_options FOR DELETE USING (group_id IN (SELECT id FROM customization_groups WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can view custom option" ON customization_options FOR SELECT USING (group_id IN (SELECT id FROM customization_groups WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));

-- 7. MENU ITEM CUSTOMIZATIONS
DROP POLICY IF EXISTS "Owner can manage item customizations" ON menu_item_customizations;
DROP POLICY IF EXISTS "Owner can insert item custom" ON menu_item_customizations;
DROP POLICY IF EXISTS "Owner can update item custom" ON menu_item_customizations;
DROP POLICY IF EXISTS "Owner can delete item custom" ON menu_item_customizations;
DROP POLICY IF EXISTS "Owner can view item custom" ON menu_item_customizations;
CREATE POLICY "Owner can insert item custom" ON menu_item_customizations FOR INSERT WITH CHECK (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can update item custom" ON menu_item_customizations FOR UPDATE USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can delete item custom" ON menu_item_customizations FOR DELETE USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Owner can view item custom" ON menu_item_customizations FOR SELECT USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));

-- 8. QR CODES
DROP POLICY IF EXISTS "Owner can manage QR" ON qr_codes;
DROP POLICY IF EXISTS "Owner can insert QR" ON qr_codes;
DROP POLICY IF EXISTS "Owner can update QR" ON qr_codes;
DROP POLICY IF EXISTS "Owner can delete QR" ON qr_codes;
DROP POLICY IF EXISTS "Owner can view QR" ON qr_codes;
CREATE POLICY "Owner can insert QR" ON qr_codes FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can update QR" ON qr_codes FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can delete QR" ON qr_codes FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can view QR" ON qr_codes FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
