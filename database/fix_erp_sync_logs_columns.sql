ALTER TABLE public.erp_sync_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.erp_sync_logs ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
