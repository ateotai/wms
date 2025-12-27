-- =====================================================
-- Script único: Setup de picking por lotes y relación con traspasos
-- Crea/actualiza: picking_batches, picking_batch_orders, picking_batch_items,
--                  y picking_batch_transfers, con sus índices y constraints.
-- Requisitos: Supabase Postgres con extensiones uuid-ossp y pgcrypto.
-- =====================================================

-- Asegurar extensiones necesarias (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usar esquema público explícitamente
SET search_path = public;

-- =====================================================
-- Tabla principal: picking_batches
-- =====================================================
CREATE TABLE IF NOT EXISTS picking_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
    assigned_to TEXT,
    zone TEXT,
    total_items INTEGER DEFAULT 0,
    picked_items INTEGER DEFAULT 0,
    estimated_time INTEGER DEFAULT 0,
    actual_time INTEGER,
    efficiency INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para picking_batches
CREATE INDEX IF NOT EXISTS idx_picking_batches_status ON picking_batches(status);
CREATE INDEX IF NOT EXISTS idx_picking_batches_created_at ON picking_batches(created_at DESC);

-- =====================================================
-- Relación lote-órdenes: picking_batch_orders
-- =====================================================
CREATE TABLE IF NOT EXISTS picking_batch_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES picking_batches(id) ON DELETE CASCADE,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_picking_batch_orders_batch ON picking_batch_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_orders_so ON picking_batch_orders(sales_order_id);

-- =====================================================
-- Migración de detalles: columnas extra y estados extendidos
-- =====================================================
ALTER TABLE IF EXISTS picking_batches
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS grouping_criterion TEXT CHECK (grouping_criterion IN ('sku','zone','customer'));

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

-- =====================================================
-- Ítems agregados por lote: picking_batch_items
-- =====================================================
CREATE TABLE IF NOT EXISTS picking_batch_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_picking_batch_items_batch ON picking_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_items_product ON picking_batch_items(product_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_items_sku ON picking_batch_items(sku);

-- =====================================================
-- Relación lote-traspasos: picking_batch_transfers
-- =====================================================
CREATE TABLE IF NOT EXISTS picking_batch_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES picking_batches(id) ON DELETE CASCADE,
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS picking_batch_transfers_batch_idx ON picking_batch_transfers (batch_id);
CREATE INDEX IF NOT EXISTS picking_batch_transfers_transfer_idx ON picking_batch_transfers (transfer_id);

COMMENT ON TABLE picking_batch_transfers IS 'Relación de lotes de picking con traspasos';

-- =====================================================
-- Fin del script
-- =====================================================