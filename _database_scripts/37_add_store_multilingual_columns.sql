-- =========================================================================
-- ChiiMenu Migration 37: Add Multi-Language Columns to Stores Table
-- Adds English and Chinese columns for store description and address
-- =========================================================================

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS description_zh text,
ADD COLUMN IF NOT EXISTS address_en text,
ADD COLUMN IF NOT EXISTS address_zh text;

-- Add comments for documentation
COMMENT ON COLUMN public.stores.description_en IS 'Store description in English for international tourists';
COMMENT ON COLUMN public.stores.description_zh IS 'Store description in Simplified Chinese for international tourists';
COMMENT ON COLUMN public.stores.address_en IS 'Store address in English';
COMMENT ON COLUMN public.stores.address_zh IS 'Store address in Chinese';

-- Seed default translations for ChiiMenu demo store
UPDATE public.stores
SET 
  description_en = '3-Language digital menu management (Thai, English, Chinese) with instant table-side QR code ordering.',
  description_zh = '支持中/英/泰三语智能数字菜单管理系统，扫码即享便捷点餐体验。',
  address_en = 'Chiang Rai, Thailand',
  address_zh = '泰国 清莱'
WHERE slug = 'chiimenu-cr' OR name = 'ChiiMenu';
