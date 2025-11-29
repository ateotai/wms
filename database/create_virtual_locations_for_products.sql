-- =====================================================
-- CREAR UBICACIONES VIRTUALES POR PRODUCTO (para pruebas)
-- =====================================================
-- Este script crea, por cada producto activo, una ubicación "virtual"
-- en el primer almacén activo encontrado. No afecta disponibilidad
-- porque se usa location_type = 'quarantine' y capacity = 0.
--
-- Estructura de ubicación:
--   code:  VIRT-<SKU>
--   name:  Ubicación virtual para <SKU>
--   zone:  'V', rack: 'VIRT', aisle/shelf/bin: '00'
--
-- Idempotente: usa ON CONFLICT (warehouse_id, code) DO NOTHING.

BEGIN;

-- 1) Seleccionar primer warehouse activo
WITH wh AS (
    SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
-- 2a) Insertar ubicaciones para productos con SKU
INSERT INTO locations (
    warehouse_id, code, name,
    zone, aisle, rack, shelf, bin,
    location_type, capacity, is_active
)
SELECT
    wh.id,
    ('VIRT-' || p.sku),
    ('Ubicación virtual para ' || COALESCE(NULLIF(p.name, ''), p.sku)),
    'V', '00', 'VIRT', '00', '00',
    'quarantine', 0, true
FROM products p
CROSS JOIN wh
WHERE p.is_active = true AND COALESCE(TRIM(p.sku),'') <> ''
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- 2b) Insertar ubicaciones para productos SIN SKU (fallback por id)
WITH wh AS (
    SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
INSERT INTO locations (
    warehouse_id, code, name,
    zone, aisle, rack, shelf, bin,
    location_type, capacity, is_active
)
SELECT
    wh.id,
    ('VIRT-PROD-' || p.id::text),
    ('Ubicación virtual para ' || COALESCE(NULLIF(p.name, ''), p.id::text)),
    'V', '00', 'VIRT', '00', '00',
    'quarantine', 0, true
FROM products p
CROSS JOIN wh
WHERE p.is_active = true AND (p.sku IS NULL OR TRIM(p.sku) = '')
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- 3) Reporte rápido
WITH wh AS (
    SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
SELECT 'Ubicaciones virtuales creadas (o existentes):' AS info,
       COUNT(*) AS total
FROM locations l
JOIN wh ON l.warehouse_id = wh.id
WHERE l.code LIKE 'VIRT-%';

COMMIT;

-- =====================================================
-- LIMPIEZA (opcional): borrar las ubicaciones virtuales
-- =====================================================
-- DELETE FROM locations WHERE code LIKE 'VIRT-%';