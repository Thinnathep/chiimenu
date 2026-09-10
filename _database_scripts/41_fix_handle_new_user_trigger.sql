-- Migration 41: Fix handle_new_user() trigger to capture full_name and phone from metadata
-- Problem: The existing trigger (script 16) inserts full_name='' and ignores phone.
-- register.vue sends { full_name, phone } in options.data when calling auth.signUp().
-- This migration updates the function to read those values from raw_user_meta_data.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

-- Drop old function (CASCADE also drops the trigger that references it)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate function with full_name and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    'merchant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
