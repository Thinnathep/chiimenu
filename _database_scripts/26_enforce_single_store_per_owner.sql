-- ============================================================
-- ChiiMenu: Enforce 1 Store Per Owner (Database-First Enforcement)
-- ป้องกันการสร้างร้านค้าซ้ำซ้อนภายใต้บัญชีเดียวกันระดับฐานข้อมูล 100%
-- ============================================================

-- 1. สร้าง Unique Index บังคับให้ 1 owner_id มีร้านค้าได้เพียง 1 ร้าน
CREATE UNIQUE INDEX IF NOT EXISTS stores_owner_id_unique 
ON public.stores (owner_id);

-- 2. สร้าง Function & Trigger ตรวจสอบป้องกันการ INSERT ร้านซ้ำ
CREATE OR REPLACE FUNCTION public.check_single_store_per_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.stores 
    WHERE owner_id = NEW.owner_id 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'This account already owns a store. Cannot create multiple stores under the same account.'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_store_per_owner ON public.stores;

CREATE TRIGGER trg_check_single_store_per_owner
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_store_per_owner();
