-- =====================================================
-- Migración: ampliar picking_batches y crear picking_batch_items
-- - Añade prioridad y criterio de agrupación
-- - Extiende estados para incluir 'cancelled'
-- - Crea tabla de ítems agregados por lote
-- =====================================================

-- Prioridad y criterio de agrupación
ALTER TABLE IF EXISTS picking_batches
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS grouping_criterion TEXT CHECK (grouping_criterion IN ('sku','zone','customer'));

-- Ampliar constraint de estado para incluir 'cancelled'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'picking_batches_status_check'
  ) THEN
    ALTER TABLE picking_batches DROP CONSTRAINT picking_batches_status_check;
  END IF;
  ALTER TABLE picking_batches
    ADD CONSTRAINT picking_batches_status_check CHECK (status IN ('pending','in_progress','completed','cancelled'));
END $$;

-- Tabla de ítems por lote
CREATE TABLE IF NOT EXISTS picking_batch_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id UUID REFERENCES picking_batches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT,
  description TEXT,
  total_quantity INTEGER NOT NULL,
  unit_of_measure TEXT,
  source_location_id UUID REFERENCES locations(id),
  expiry_date DATE,
  picked_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_picking_batch_items_batch ON picking_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_items_product ON picking_batch_items(product_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_items_sku ON picking_batch_items(sku);