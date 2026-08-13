GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;

-- เปิด RLS กลับมาทำงานตามปกติ
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
