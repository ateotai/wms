-- =====================================================
-- SCRIPT PARA CREAR TABLAS DE INVENTARIO EN SUPABASE
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
    role TEXT DEFAULT 'user',
    department TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eliminar restricción existente si existe y crear una nueva
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'manager', 'operator', 'user', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'viewer', 'VIEWER'));

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
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

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

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para las tablas (usar DROP IF EXISTS para evitar errores de duplicación)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir todo para usuarios autenticados)
-- Usar DROP POLICY IF EXISTS para evitar errores de duplicación
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON profiles;
CREATE POLICY "Enable all operations for authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON warehouses;
CREATE POLICY "Enable all operations for authenticated users" ON warehouses FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON categories;
CREATE POLICY "Enable all operations for authenticated users" ON categories FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON suppliers;
CREATE POLICY "Enable all operations for authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON products;
CREATE POLICY "Enable all operations for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON locations;
CREATE POLICY "Enable all operations for authenticated users" ON locations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON inventory;
CREATE POLICY "Enable all operations for authenticated users" ON inventory FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON inventory_movements;
CREATE POLICY "Enable all operations for authenticated users" ON inventory_movements FOR ALL USING (auth.role() = 'authenticated');