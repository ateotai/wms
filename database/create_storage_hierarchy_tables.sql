-- =====================================================
-- TABLAS JERÁRQUICAS: AISLES, RACKS, SHELVES, BINS
-- Jerarquía: Warehouse → Zone → Aisle → Rack → Shelf → Bin (Posición)
-- =====================================================

-- Requisitos: ejecutar previamente database/functions.sql (update_updated_at_column)
-- y tener creada la tabla zones (ver database/create_zones_table.sql)

-- =============================
-- TABLA: aisles (Pasillos)
-- =============================
CREATE TABLE IF NOT EXISTS aisles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    dimensions JSONB DEFAULT '{}'::jsonb,
    coordinates JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (warehouse_id, zone_id, code)
);

DROP TRIGGER IF EXISTS update_aisles_updated_at ON aisles;
CREATE TRIGGER update_aisles_updated_at
    BEFORE UPDATE ON aisles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE aisles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aisles_all_operations ON aisles;
CREATE POLICY aisles_all_operations ON aisles
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política opcional para desarrollo
DROP POLICY IF EXISTS aisles_dev_anon_all ON aisles;
CREATE POLICY aisles_dev_anon_all ON aisles
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_aisles_warehouse ON aisles(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_aisles_zone ON aisles(zone_id);
CREATE INDEX IF NOT EXISTS idx_aisles_code ON aisles(code);
CREATE INDEX IF NOT EXISTS idx_aisles_active ON aisles(is_active);

-- =============================
-- TABLA: racks (Racks)
-- =============================
CREATE TABLE IF NOT EXISTS racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    aisle_id UUID NOT NULL REFERENCES aisles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (warehouse_id, aisle_id, code)
);

DROP TRIGGER IF EXISTS update_racks_updated_at ON racks;
CREATE TRIGGER update_racks_updated_at
    BEFORE UPDATE ON racks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE racks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS racks_all_operations ON racks;
CREATE POLICY racks_all_operations ON racks
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política opcional para desarrollo
DROP POLICY IF EXISTS racks_dev_anon_all ON racks;
CREATE POLICY racks_dev_anon_all ON racks
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_racks_warehouse ON racks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_racks_zone ON racks(zone_id);
CREATE INDEX IF NOT EXISTS idx_racks_aisle ON racks(aisle_id);
CREATE INDEX IF NOT EXISTS idx_racks_code ON racks(code);
CREATE INDEX IF NOT EXISTS idx_racks_active ON racks(is_active);

-- =============================
-- TABLA: shelves (Niveles)
-- =============================
CREATE TABLE IF NOT EXISTS shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Ej. S01
    name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (rack_id, code)
);

DROP TRIGGER IF EXISTS update_shelves_updated_at ON shelves;
CREATE TRIGGER update_shelves_updated_at
    BEFORE UPDATE ON shelves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shelves_all_operations ON shelves;
CREATE POLICY shelves_all_operations ON shelves
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política opcional para desarrollo
DROP POLICY IF EXISTS shelves_dev_anon_all ON shelves;
CREATE POLICY shelves_dev_anon_all ON shelves
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shelves_warehouse ON shelves(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shelves_rack ON shelves(rack_id);
CREATE INDEX IF NOT EXISTS idx_shelves_code ON shelves(code);
CREATE INDEX IF NOT EXISTS idx_shelves_active ON shelves(is_active);

-- =============================
-- TABLA: bins (Posiciones)
-- =============================
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Ej. B01
    name TEXT,
    capacity INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (shelf_id, code)
);

DROP TRIGGER IF EXISTS update_bins_updated_at ON bins;
CREATE TRIGGER update_bins_updated_at
    BEFORE UPDATE ON bins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bins_all_operations ON bins;
CREATE POLICY bins_all_operations ON bins
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política opcional para desarrollo
DROP POLICY IF EXISTS bins_dev_anon_all ON bins;
CREATE POLICY bins_dev_anon_all ON bins
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bins_warehouse ON bins(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_bins_shelf ON bins(shelf_id);
CREATE INDEX IF NOT EXISTS idx_bins_code ON bins(code);
CREATE INDEX IF NOT EXISTS idx_bins_active ON bins(is_active);

-- Mensaje de confirmación
SELECT 'Tablas jerárquicas (aisles, racks, shelves, bins) listas' AS mensaje;