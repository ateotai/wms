-- =====================================================
-- TABLAS: picking_batches y picking_batch_orders
-- Persistencia para picking por lotes y relación con órdenes
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de lotes
CREATE TABLE IF NOT EXISTS picking_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Relación lote-órdenes
CREATE TABLE IF NOT EXISTS picking_batch_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_id UUID REFERENCES picking_batches(id) ON DELETE CASCADE,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_picking_batches_status ON picking_batches(status);
CREATE INDEX IF NOT EXISTS idx_picking_batches_created_at ON picking_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_picking_batch_orders_batch ON picking_batch_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_picking_batch_orders_so ON picking_batch_orders(sales_order_id);