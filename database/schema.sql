-- =====================================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA WMS
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: profiles (Perfiles de usuario)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'operator', 'user')),
    department TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: warehouses (Almacenes)
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'México',
    manager_id UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: categories (Categorías de productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: suppliers (Proveedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'México',
    tax_id TEXT,
    payment_terms INTEGER DEFAULT 30, -- días
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: products (Productos)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    supplier_id UUID REFERENCES suppliers(id),
    unit_of_measure TEXT DEFAULT 'PCS' CHECK (unit_of_measure IN ('PCS', 'KG', 'LT', 'M', 'M2', 'M3')),
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 1000,
    reorder_point INTEGER DEFAULT 10,
    barcode TEXT,
    weight DECIMAL(8,3),
    dimensions JSONB, -- {length, width, height}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: locations (Ubicaciones dentro del almacén)
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT,
    zone TEXT, -- A, B, C, etc.
    aisle TEXT, -- 01, 02, 03, etc.
    rack TEXT, -- R01, R02, etc.
    shelf TEXT, -- S01, S02, etc.
    bin TEXT, -- B01, B02, etc.
    location_type TEXT DEFAULT 'storage' CHECK (location_type IN ('receiving', 'storage', 'picking', 'shipping', 'quarantine')),
    capacity INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(warehouse_id, code)
);

-- =====================================================
-- TABLA: inventory (Inventario)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- Cantidad reservada para órdenes
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    lot_number TEXT,
    expiry_date DATE,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    last_movement_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, location_id, lot_number)
);

-- =====================================================
-- TABLA: inventory_movements (Movimientos de inventario)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'COUNT')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('RECEIPT', 'SHIPMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CYCLE_COUNT')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_number TEXT, -- PO, SO, Transfer Order, etc.
    reference_type TEXT, -- 'purchase_order', 'sales_order', 'transfer_order', etc.
    lot_number TEXT,
    expiry_date DATE,
    reason TEXT,
    notes TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: purchase_orders (Órdenes de compra)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: purchase_order_items (Items de órdenes de compra)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: sales_orders (Órdenes de venta)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    so_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    warehouse_id UUID REFERENCES warehouses(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picking', 'packed', 'shipped', 'delivered', 'cancelled')),
    order_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    shipped_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    shipping_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: sales_order_items (Items de órdenes de venta)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    picked_quantity INTEGER DEFAULT 0,
    shipped_quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: transfers (Transferencias entre almacenes)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_number TEXT UNIQUE NOT NULL,
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_transit', 'received', 'cancelled')),
    transfer_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    received_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: transfer_items (Items de transferencias)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_id UUID REFERENCES transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    lot_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: cycle_counts (Conteos cíclicos)
-- =====================================================
CREATE TABLE IF NOT EXISTS cycle_counts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    count_number TEXT UNIQUE NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES locations(id),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    count_date DATE DEFAULT CURRENT_DATE,
    count_type TEXT DEFAULT 'cycle' CHECK (count_type IN ('cycle', 'full', 'spot')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    counted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: cycle_count_items (Items de conteos cíclicos)
-- =====================================================
CREATE TABLE IF NOT EXISTS cycle_count_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cycle_count_id UUID REFERENCES cycle_counts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES locations(id),
    system_quantity INTEGER NOT NULL,
    counted_quantity INTEGER,
    variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    lot_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: erp_connectors (Conectores ERP)
-- =====================================================
CREATE TABLE IF NOT EXISTS erp_connectors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SAP B1', 'Oracle ERP', 'Microsoft Dynamics', 'NetSuite', 'Odoo', 'Custom API')),
    endpoint TEXT NOT NULL,
    username TEXT,
    api_key TEXT,
    version TEXT DEFAULT '1.0',
    sync_interval INTEGER DEFAULT 60, -- minutos
    sync_type TEXT DEFAULT 'manual' CHECK (sync_type IN ('manual', 'automatic')),
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'syncing')),
    last_sync TIMESTAMP WITH TIME ZONE,
    next_sync TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    connection_settings JSONB DEFAULT '{}',
    inventory_mapping JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: erp_sync_logs (Logs de sincronización ERP)
-- =====================================================
CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connector_id UUID REFERENCES erp_connectors(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para erp_connectors
CREATE INDEX IF NOT EXISTS idx_erp_connectors_status ON erp_connectors(status);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_type ON erp_connectors(type);
CREATE INDEX IF NOT EXISTS idx_erp_connectors_active ON erp_connectors(is_active);

-- Índices para erp_sync_logs
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_connector ON erp_sync_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_status ON erp_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_date ON erp_sync_logs(started_at);

-- Índices para inventory
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lot ON inventory(lot_number);

-- Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_date ON sales_orders(order_date);