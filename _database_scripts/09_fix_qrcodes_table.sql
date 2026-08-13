ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS table_identifier text;

-- อนุญาตให้เจ้าของร้านจัดการ QR Code ของร้านตัวเองได้ (สร้าง/อ่าน/แก้ไข/ลบ)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant QR Access" ON public.qr_codes;
CREATE POLICY "Merchant QR Access" 
ON public.qr_codes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = qr_codes.store_id 
    AND stores.owner_id = auth.uid()
  )
);
