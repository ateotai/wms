-- =====================================================
-- Migración: añadir columna de estado a picking_batch_items
-- - Crea columna status para reflejar el estado de picking
-- - Valores sugeridos: 'picking_pending', 'picking_confirmed', 'cancelled'
-- =====================================================

ALTER TABLE IF EXISTS picking_batch_items
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'picking_pending';

-- Opcional: constraint de valores permitidos si aún no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'picking_batch_items_status_check'
  ) THEN
    ALTER TABLE picking_batch_items
      ADD CONSTRAINT picking_batch_items_status_check CHECK (status IN ('picking_pending','picking_confirmed','cancelled'));
  END IF;
END $$;