-- ลบ Policy เก่าที่มีปัญหาออกก่อน
DROP POLICY IF EXISTS "Merchants can read their own orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update their own orders" ON public.orders;

-- สร้าง Policy ใหม่ด้วยวิธี EXISTS ซึ่งเสถียรและเป็นมาตรฐานที่สุด
CREATE POLICY "Merchant Order Access" 
ON public.orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = orders.store_id 
    AND stores.owner_id = auth.uid()
  )
);
