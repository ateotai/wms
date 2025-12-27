ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS api_key text;
