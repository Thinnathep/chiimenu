-- =========================================================
-- Step 1: ดู signature จริงของ admin_update_store_plan ทั้งหมด
-- รันก่อน เพื่อดูว่า DROP ต้องใช้ argument types อะไรบ้าง
-- =========================================================
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS argument_types,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'admin_update_store_plan';
