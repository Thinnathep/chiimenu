-- =============================================
-- ChiiMenu MVP Storage Schema (Day 3)
-- =============================================

-- 1. สร้าง Bucket สำหรับรูปภาพ (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chiimenu-images', 'chiimenu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. อนุญาตให้ทุกคน (Public) ดูรูปได้
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chiimenu-images');

-- 3. อนุญาตให้ Authenticated Users (Merchant) อัปโหลดรูปได้
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'chiimenu-images' AND 
  auth.role() = 'authenticated'
);

-- 4. อนุญาตให้ Owner ลบ/แก้ไข รูปตัวเองได้
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chiimenu-images' AND 
  owner = auth.uid()
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chiimenu-images' AND 
  owner = auth.uid()
);
