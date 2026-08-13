ALTER TABLE public.usage_logs DROP CONSTRAINT IF EXISTS usage_logs_qr_code_id_fkey;

ALTER TABLE public.usage_logs ADD CONSTRAINT usage_logs_qr_code_id_fkey 
FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON DELETE CASCADE;
