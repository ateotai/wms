-- =====================================================
-- TABLA Y POLÍTICAS: ZONES (ZONAS DE ALMACÉN)
-- =====================================================

-- Crea la tabla de zonas para permitir guardado/edición real desde la UI
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('receiving','storage','picking','packing','shipping','cross_dock')),
    description TEXT,
    capacity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    temperature_controlled BOOLEAN DEFAULT FALSE,
    temperature_min NUMERIC,
    temperature_max NUMERIC,
    dimensions JSONB DEFAULT '{}'::jsonb,
    coordinates JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (warehouse_id, code)
);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
    BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: acceso total para usuarios autenticados (ajustar según necesidad)
DROP POLICY IF EXISTS zones_all_operations ON zones;
CREATE POLICY zones_all_operations ON zones
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política opcional para desarrollo: permitir operaciones a role anon
DROP POLICY IF EXISTS zones_dev_anon_all ON zones;
CREATE POLICY zones_dev_anon_all ON zones
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_zones_warehouse ON zones(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_zones_code ON zones(code);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);

-- Mensaje de confirmación
SELECT 'Tabla y políticas de ZONES listas' as mensaje;