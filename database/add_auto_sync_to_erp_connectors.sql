-- Añade columna auto_sync a erp_connectors para habilitar/deshabilitar el auto-sync por conector
ALTER TABLE public.erp_connectors
  ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT true;

-- Asegura que filas existentes tengan true si la columna existía sin valor
UPDATE public.erp_connectors
SET auto_sync = COALESCE(auto_sync, true);

COMMENT ON COLUMN public.erp_connectors.auto_sync IS 'Habilita el scheduler horario para este conector (true=activo, false=desactivado)';