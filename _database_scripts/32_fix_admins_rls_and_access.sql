-- ==============================================================================
-- 32_fix_admins_rls_and_access.sql
-- ChiiMenu Admin Access & RLS Recursion Fix
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX RECURSIVE RLS POLICY ON admins TABLE
-- ------------------------------------------------------------------------------
-- Previous policy had a self-recursive subquery: USING (auth.uid() IN (SELECT id FROM admins))
-- This caused RLS evaluation loop/empty result on client queries.
-- Fix: Allow authenticated users to check if THEIR OWN ID exists in admins table directly.

ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admins;

CREATE POLICY "Users can check own admin status"
ON public.admins FOR SELECT
TO authenticated
USING (id = auth.uid());

GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;


-- ------------------------------------------------------------------------------
-- 2. ENSURE ADMIN USERS ARE INSERTED INTO public.admins
-- ------------------------------------------------------------------------------
-- Automatically register any user who has role = 'admin' in profiles table:
INSERT INTO public.admins (id)
SELECT id FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- If you know your admin email, you can also run:
-- INSERT INTO public.admins (id)
-- SELECT id FROM auth.users WHERE email = 'your_admin_email@example.com'
-- ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 3. VERIFY ADMINS TABLE & POLICY
-- ------------------------------------------------------------------------------
SELECT 
  a.id AS "Admin User ID",
  u.email AS "Admin Email",
  p.role AS "Profile Role",
  a.created_at AS "Admin Added At"
FROM public.admins a
LEFT JOIN auth.users u ON a.id = u.id
LEFT JOIN public.profiles p ON a.id = p.id;
