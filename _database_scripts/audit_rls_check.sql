-- ============================================================
-- ChiiMenu RLS Audit Script
-- รัน Script นี้ใน Supabase SQL Editor เพื่อตรวจสอบความปลอดภัย
-- ============================================================

-- 1. ตรวจทุกตารางว่าเปิด RLS แล้วหรือยัง
--    ✅ ที่ต้องการ: rls_enabled = true สำหรับทุกตารางที่มีข้อมูลสำคัญ
SELECT 
  relname AS "ตาราง",
  CASE WHEN relrowsecurity THEN '✅ เปิด RLS' ELSE '❌ ปิด RLS (เสี่ยง!)' END AS "สถานะ RLS"
FROM pg_class
WHERE relnamespace = 'public'::regnamespace 
  AND relkind = 'r'
ORDER BY relname;

-- ============================================================

-- 2. ตรวจ Ghost Policy (กฎที่เปิดให้ทุกคนเข้าได้โดยไม่มีเงื่อนไข)
--    ✅ ที่ต้องการ: ผลลัพธ์ว่างเปล่า (ไม่มีแถวใดเลย)
SELECT 
  tablename AS "ตาราง",
  policyname AS "ชื่อ Policy",
  cmd AS "คำสั่ง",
  qual AS "เงื่อนไข"
FROM pg_policies
WHERE schemaname = 'public' 
  AND qual = 'true'   -- "true" หมายความว่าเปิดให้ทุกคนเข้าได้ = อันตราย
ORDER BY tablename;

-- ============================================================

-- 3. แสดง RLS Policies ทั้งหมดของระบบ
SELECT 
  tablename AS "ตาราง",
  policyname AS "ชื่อ Policy",
  cmd AS "คำสั่ง (SELECT/INSERT/etc)",
  roles AS "สำหรับ Role",
  LEFT(qual, 80) AS "เงื่อนไข (ย่อ)"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ============================================================

-- 4. ตรวจ Functions ที่ใช้ SECURITY DEFINER
--    ⚠️  SECURITY DEFINER functions รันด้วยสิทธิ์ของ creator (ทรงพลังมาก)
--    ต้องแน่ใจว่าทุก function มีการตรวจสิทธิ์ภายในตัวเอง
SELECT 
  routine_name AS "ชื่อ Function",
  security_type AS "Security Type"
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================

-- 5. ตรวจ billing_records — ดูว่ามีข้อมูลจริงไหม
SELECT 
  s.name AS "ร้านค้า",
  br.receipt_number AS "เลขใบเสร็จ",
  br.package_name AS "แพ็กเกจ",
  br.amount AS "จำนวนเงิน (บาท)",
  br.created_at AS "วันที่ชำระ"
FROM public.billing_records br
JOIN public.stores s ON s.id = br.store_id
ORDER BY br.created_at DESC
LIMIT 20;

-- ============================================================

-- 6. ตรวจร้านค้าที่ใกล้หมดอายุหรือหมดแล้ว
SELECT 
  name AS "ชื่อร้าน",
  plan_status AS "สถานะ",
  trial_ends_at AS "วันหมดอายุ",
  ROUND(EXTRACT(EPOCH FROM (trial_ends_at - NOW())) / 86400) AS "วันที่เหลือ",
  CASE 
    WHEN trial_ends_at < NOW() THEN '🔴 หมดแล้ว'
    WHEN trial_ends_at < NOW() + INTERVAL '7 days' THEN '🟡 ใกล้หมด'
    ELSE '✅ ปกติ'
  END AS "แจ้งเตือน"
FROM public.stores
ORDER BY trial_ends_at ASC;
