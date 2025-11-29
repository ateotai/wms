-- =====================================================
-- Bootstrap: asegurar almacén activo, crear ubicaciones virtuales y vincular inventario
-- =====================================================
-- Este script idempotente:
-- 1) Asegura que exista un almacén activo (crea 'WH-001' si no hay ninguno).
-- 2) Crea ubicaciones virtuales por producto:
--    - Con SKU: code = 'VIRT-<SKU>'
--    - Sin SKU: code = 'VIRT-PROD-<product_id>'
--    location_type = 'quarantine', capacity = 0.
-- 3) Vincula inventario cantidad 0 en dichas ubicaciones con lot_number = 'VIRT'.
-- 4) Reporta conteos resultantes.

BEGIN;

-- 0) Asegurar que exista al menos un warehouse activo
DO $$
DECLARE
  v_wh_id uuid;
BEGIN
  SELECT id INTO v_wh_id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1;
  IF v_wh_id IS NULL THEN
    INSERT INTO warehouses (id, name, code, is_active)
    VALUES (gen_random_uuid(), 'Almacén Principal', 'WH-001', true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- 1) Insertar ubicaciones para productos con SKU
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
  ('VIRT-' || p.sku),
  ('Ubicación virtual para ' || COALESCE(NULLIF(p.name, ''), p.sku)),
  'V', '00', 'VIRT', '00', '00',
  'quarantine', 0, true
FROM products p
CROSS JOIN wh
WHERE p.is_active = true AND COALESCE(TRIM(p.sku),'') <> ''
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- 2) Insertar ubicaciones para productos SIN SKU (fallback por id)
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

-- 3) Vincular inventario (cantidad 0) en ubicaciones virtuales
WITH wh AS (
  SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
),
prods AS (
  SELECT id, sku, name FROM products WHERE is_active = true
),
virt_locations AS (
  SELECT
    p.id AS product_id,
    COALESCE(NULLIF(TRIM(p.sku), ''), NULL) AS sku,
    CASE
      WHEN COALESCE(NULLIF(TRIM(p.sku), ''), NULL) IS NOT NULL THEN ('VIRT-' || TRIM(p.sku))
      ELSE ('VIRT-PROD-' || p.id::text)
    END AS virt_code
  FROM prods p
),
locs AS (
  SELECT vl.product_id, l.id AS location_id, w.id AS warehouse_id
  FROM virt_locations vl
  CROSS JOIN wh w
  JOIN locations l ON l.warehouse_id = w.id AND l.code = vl.virt_code
)
INSERT INTO inventory (
  product_id, warehouse_id, location_id,
  quantity, reserved_quantity, lot_number
)
SELECT
  locs.product_id,
  locs.warehouse_id,
  locs.location_id,
  0 AS quantity,
  0 AS reserved_quantity,
  'VIRT' AS lot_number
FROM locs
ON CONFLICT (product_id, warehouse_id, location_id, lot_number) DO NOTHING;

-- 4) Reportes
WITH wh AS (
  SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
SELECT 'Ubicaciones virtuales (VIRT-*)' AS info,
       COUNT(*) AS total
FROM locations l
JOIN wh ON l.warehouse_id = wh.id
WHERE l.code LIKE 'VIRT-%';

WITH wh AS (
  SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
SELECT 'Inventario virtual (lot=VIRT)' AS info,
       COUNT(*) AS total
FROM inventory i
JOIN wh ON i.warehouse_id = wh.id
WHERE i.lot_number = 'VIRT';

COMMIT;

-- =====================================================
-- Nota: si no existen productos activos, los contadores quedarán en 0.
--       Ejecuta primero la carga de datos de ejemplo si es necesario.
-- =====================================================