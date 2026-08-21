-- =========================================================================
-- ChiiMenu Migration 36: Update Menu Photos with Curated Authentic Thai Food Images
-- Execute in Supabase SQL Editor to instantly refresh all dish photos
-- =========================================================================

-- 1. ข้าวซอยไก่เชียงราย
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ข้าวซอยไก่เชียงรายสูตรโบราณ';

-- 2. ต้มยำกุ้งแม่น้ำ
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน';

-- 3. ผัดไทยกุ้งสดห่อไข่
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้';

-- 4. ข้าวเหนียวมะม่วง
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด';

-- 5. แกงเขียวหวานไก่
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'แกงเขียวหวานไก่ยอดมะพร้าว';

-- 6. มัสมั่นเนื้อตุ๋น
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'มัสมั่นเนื้อตุ๋นเครื่องเทศอยุธยา';

-- 7. ผัดกะเพราไก่สับ
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ผัดกะเพราไก่สับพริกแห้งโบราณ';

-- 8. ข้าวผัดปูก้อน
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ข้าวผัดปูก้อนกะทะเหล็กหอมกลิ่นควัน';

-- 9. สะเต๊ะไก่นุ่ม
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'สะเต๊ะไก่นุ่มน้ำจิ้มถั่วสูตรเข้มข้น (6 ไม้)';

-- 10. ส้มตำไทยไข่เค็ม
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ส้มตำไทยไข่เค็มถั่วลิสงคั่ว';

-- 11. ไส้อั่วสมุนไพรเชียงราย
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ไส้อั่วสมุนไพรเชียงรายแท้เสิร์ฟพร้อมผักสด';

-- 12. ยำวุ้นเส้นซีฟู้ด
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ยำวุ้นเส้นซีฟู้ดรวมมิตรรสจัด';

-- 13. หมูปิ้งนมสด
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'หมูปิ้งนมสดกะทิโบราณ (4 ไม้)';

-- 14. ชาไทยส้มดอยเชียงราย
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ชาไทยส้มดอยเชียงรายนมสดแท้';

-- 15. น้ำมะพร้าวน้ำหอม
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'น้ำมะพร้าวน้ำหอมลูกสดเย็นเจี๊ยบ';

-- 16. ทับทิมกรอบชาววัง
UPDATE public.menu_items
SET photo_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80'
WHERE name_th = 'ทับทิมกรอบชาววังน้ำกะทิอบควันเทียน';
