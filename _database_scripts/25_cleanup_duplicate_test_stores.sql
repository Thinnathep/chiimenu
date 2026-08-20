-- ============================================================
-- ChiiMenu: ลบร้านค้าทดสอบ 3 ร้านที่ซ้ำซ้อน
-- 1. เอสเพรสโซ่ GG (eb965285-2fd9-4f4e-bce3-991863effb6f)
-- 2. ลุงชัย ข้าวมันไก่ (e81c6be2-1115-4fe0-9caf-7fa910a42102)
-- 3. กะเพราตาเหลือก (7020c282-60fe-473f-b8b8-8b273bd839c7)
-- ============================================================

-- 1. ลบข้อมูลใน admin_action_logs ที่เกี่ยวกับร้านเหล่านี้โดยตรง
DELETE FROM public.admin_action_logs 
WHERE target_store_id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 2. ลบ logs ที่สร้างโดยบัญชีเบอร์โทรนี้
DELETE FROM public.admin_action_logs 
WHERE admin_id = 'bdecd338-f0de-42bc-b0f3-a90146accb16';

-- 3. ลบคำสั่งซื้อ (orders)
DELETE FROM public.orders 
WHERE store_id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 4. ลบสารก่อภูมิแพ้ของเมนู (menu_item_allergens)
DELETE FROM public.menu_item_allergens 
WHERE menu_item_id IN (
  SELECT id FROM public.menu_items 
  WHERE store_id IN (
    'eb965285-2fd9-4f4e-bce3-991863effb6f',
    'e81c6be2-1115-4fe0-9caf-7fa910a42102',
    '7020c282-60fe-473f-b8b8-8b273bd839c7'
  )
);

-- 5. ลบตัวเลือกเสริมของเมนู (customization_options & groups)
DELETE FROM public.customization_options 
WHERE group_id IN (
  SELECT id FROM public.customization_groups 
  WHERE store_id IN (
    'eb965285-2fd9-4f4e-bce3-991863effb6f',
    'e81c6be2-1115-4fe0-9caf-7fa910a42102',
    '7020c282-60fe-473f-b8b8-8b273bd839c7'
  )
);

DELETE FROM public.customization_groups 
WHERE store_id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 6. ลบรายการอาหาร (menu_items)
DELETE FROM public.menu_items 
WHERE store_id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 7. ลบหมวดหมู่อาหาร (menu_categories)
DELETE FROM public.menu_categories 
WHERE store_id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 8. ลบร้านค้าออกจากตาราง stores
DELETE FROM public.stores 
WHERE id IN (
  'eb965285-2fd9-4f4e-bce3-991863effb6f',
  'e81c6be2-1115-4fe0-9caf-7fa910a42102',
  '7020c282-60fe-473f-b8b8-8b273bd839c7'
);

-- 9. ลบบัญชีผู้ใช้เบอร์ 0962386554 ที่ไม่ได้ใช้งาน
DELETE FROM public.profiles WHERE id = 'bdecd338-f0de-42bc-b0f3-a90146accb16';
DELETE FROM auth.users WHERE id = 'bdecd338-f0de-42bc-b0f3-a90146accb16';
