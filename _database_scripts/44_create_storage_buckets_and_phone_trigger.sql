-- ==============================================================================
-- 44_create_storage_buckets_and_phone_trigger.sql
-- 1. Create 'chiimenu-images' Storage Bucket with RLS Policies
-- 2. Auto-confirm phone-registered accounts (@phone.chiimenu.com) in auth.users
-- ==============================================================================
--
-- How to apply this migration:
-- 1. Open Supabase Dashboard -> SQL Editor -> New Query
-- 2. Copy & paste the entire content of this script
-- 3. Click "Run"
--
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORAGE BUCKET: chiimenu-images
-- ------------------------------------------------------------------------------

-- Ensure bucket 'chiimenu-images' exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chiimenu-images',
  'chiimenu-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure public access to view images (for menus, food items, covers)
DROP POLICY IF EXISTS "Public can view chiimenu-images" ON storage.objects;
CREATE POLICY "Public can view chiimenu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chiimenu-images');

-- Allow authenticated users (merchants & admins) to upload images
DROP POLICY IF EXISTS "Authenticated users can upload chiimenu-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chiimenu-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chiimenu-images');

-- Allow authenticated users to update their uploaded images
DROP POLICY IF EXISTS "Authenticated users can update chiimenu-images" ON storage.objects;
CREATE POLICY "Authenticated users can update chiimenu-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chiimenu-images')
WITH CHECK (bucket_id = 'chiimenu-images');

-- Allow authenticated users to delete their images
DROP POLICY IF EXISTS "Authenticated users can delete chiimenu-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete chiimenu-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chiimenu-images');

-- Ensure storage grants
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
GRANT SELECT ON storage.objects TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 2. AUTO-CONFIRM PHONE-REGISTERED USERS (@phone.chiimenu.com)
-- ------------------------------------------------------------------------------
-- Users who register via phone number receive a synthetic email:
-- <phone>@phone.chiimenu.com (e.g. 0962386554@phone.chiimenu.com).
-- Because this email address does not have a real inbox, users cannot click
-- an email verification link. This trigger automatically confirms them upon creation.

CREATE OR REPLACE FUNCTION public.auto_confirm_phone_users()
RETURNS trigger AS $$
BEGIN
  IF lower(new.email) LIKE '%@phone.chiimenu.com' THEN
    new.email_confirmed_at := COALESCE(new.email_confirmed_at, now());
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create BEFORE INSERT OR UPDATE trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_phone_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_phone_auto_confirm
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_phone_users();

-- Update any existing unconfirmed phone accounts so merchants can login immediately
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE 
  lower(email) LIKE '%@phone.chiimenu.com' 
  AND email_confirmed_at IS NULL;

