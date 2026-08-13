-- 1. Add phone column to profiles (for the merchant's personal phone)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone character varying;

-- 2. Add phone column to stores (for the store's contact phone)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone character varying;

-- Note: We don't drop the email column because merchants who sign up with email will still use it.
-- The login.vue and register.vue now handle sending the correct data to Supabase.
-- But we can update the register flow to explicitly save the phone number if they use one.
