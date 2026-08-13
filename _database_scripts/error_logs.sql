-- 1. Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    context JSONB
);

-- 2. RLS for error_logs table
-- We want this table to be append-only by the service role (via API) 
-- and readable only by admins. We will enable RLS and create an admin read policy.
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view error_logs" ON public.error_logs;
CREATE POLICY "Admins can view error_logs" ON public.error_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

-- Note: The Nuxt Server API uses the Service Role key to insert logs, 
-- which bypasses RLS automatically, so no INSERT policy is required for public/authenticated users.
