-- Grant permissions for authenticated users to query the admins table.
-- Without this, PostgREST will throw a 403 Forbidden before RLS is even checked.

GRANT SELECT ON public.admins TO authenticated;
