-- ==========================================
-- SCRIPT เพิ่มสิทธิ์ให้นักท่องเที่ยว (Public) 
-- สำหรับโปรเจกต์ ChiiMenu
-- ==========================================

-- อนุญาตให้นักท่องเที่ยวบันทึกสถิติการเข้าชมได้ (usage_logs)
DROP POLICY IF EXISTS "Public can insert usage logs" ON usage_logs;
CREATE POLICY "Public can insert usage logs" ON usage_logs FOR INSERT TO public WITH CHECK (true);

-- ตรวจสอบให้แน่ใจว่านักท่องเที่ยวสามารถดึงข้อมูลเมนูไปแสดงได้
DROP POLICY IF EXISTS "Public can view active stores" ON stores;
CREATE POLICY "Public can view active stores" ON stores FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active categories" ON menu_categories;
CREATE POLICY "Public can view active categories" ON menu_categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active items" ON menu_items;
CREATE POLICY "Public can view active items" ON menu_items FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Public can view item allergens" ON menu_item_allergens;
CREATE POLICY "Public can view item allergens" ON menu_item_allergens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view item customizations" ON menu_item_customizations;
CREATE POLICY "Public can view item customizations" ON menu_item_customizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view customization groups" ON customization_groups;
CREATE POLICY "Public can view customization groups" ON customization_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view customization options" ON customization_options;
CREATE POLICY "Public can view customization options" ON customization_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view allergens" ON allergens;
CREATE POLICY "Public can view allergens" ON allergens FOR SELECT USING (true);
