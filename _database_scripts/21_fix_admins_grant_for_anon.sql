-- ============================================================
-- Fix: Grant SELECT on public.admins to anon and service_role
-- ============================================================
-- Without this grant, any RLS policy that references the `admins` table
-- (such as on `stores` or `orders`) will fail with 42501 (permission denied for table admins)
-- whenever an unauthenticated visitor (customer ordering via QR code) queries the database.

GRANT SELECT ON public.admins TO anon, authenticated, service_role;
