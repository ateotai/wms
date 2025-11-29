-- =====================================================
-- Alinear tablas ERP con el frontend y el backend
-- Crea/ajusta public.erp_connectors y public.erp_sync_logs
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- =====================================================

BEGIN;

-- ===========================
-- Tabla: public.erp_connectors
-- ===========================
CREATE TABLE IF NOT EXISTS public.erp_connectors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  endpoint text NOT NULL,
  username text,
  password text,
  api_key text,
  version text DEFAULT '1.0',
  sync_interval integer DEFAULT 60,
  sync_type text DEFAULT 'manual',
  status text DEFAULT 'inactive', -- 'active' | 'inactive' | 'syncing' | 'error'
  last_sync timestamptz,
  next_sync timestamptz,
  records_processed integer DEFAULT 0,
  error_count integer DEFAULT 0,
  connection_settings jsonb DEFAULT '{}'::jsonb,
  inventory_mapping jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Columnas opcionales que el backend/UI pueden usar
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS auto_sync boolean DEFAULT true;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS last_sync timestamptz;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS records_processed integer DEFAULT 0;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0';
ALTER TABLE public.erp_connectors ADD COLUMN IF NOT EXISTS name text;

-- Índices
CREATE INDEX IF NOT EXISTS idx_erp_connectors_status ON public.erp_connectors(status);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_type ON public.erp_connectors(type);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_active ON public.erp_connectors(is_active);

-- =========================
-- Tabla: public.erp_sync_logs
-- =========================
CREATE TABLE IF NOT EXISTS public.erp_sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_id uuid REFERENCES public.erp_connectors(id) ON DELETE CASCADE,
  -- Tipos compatibles con el backend actual y posibles futuros
  sync_type text NOT NULL,
  status text NOT NULL, -- 'started' | 'completed' | 'failed' | 'cancelled' | otros
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  records_processed integer DEFAULT 0,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  total_records integer,
  error_message text,
  sync_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_connector ON public.erp_sync_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_date ON public.erp_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_status ON public.erp_sync_logs(status);

-- =========================
-- RLS (básico; ajusta según modelo de permisos)
-- =========================
ALTER TABLE public.erp_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Política de lectura de logs para dueños del conector
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='erp_sync_logs' AND policyname='read own logs'
  ) THEN
    CREATE POLICY "read own logs" ON public.erp_sync_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.erp_connectors c
          WHERE c.id = erp_sync_logs.connector_id
            AND c.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Política de inserción/actualización para servicio (si no tienes service_role, el backend puede tener bypass RLS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='erp_sync_logs' AND policyname='service insert logs'
  ) THEN
    CREATE POLICY "service insert logs" ON public.erp_sync_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='erp_sync_logs' AND policyname='service update logs'
  ) THEN
    CREATE POLICY "service update logs" ON public.erp_sync_logs FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

COMMIT;