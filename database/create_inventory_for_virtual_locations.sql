-- =====================================================
-- CREAR INVENTARIO (cantidad 0) EN UBICACIONES VIRTUALES POR PRODUCTO
-- =====================================================
-- Este script vincula cada producto activo con su ubicación virtual
-- (creada por create_virtual_locations_for_products.sql) insertando
-- una fila en inventory con quantity = 0 y lot_number = 'VIRT'.
--
-- Resultado: la UI podrá mostrar el código de ubicación aunque el stock sea 0.
-- Idempotente: ON CONFLICT(product_id, warehouse_id, location_id, lot_number) DO NOTHING.

BEGIN;

-- 1) Seleccionar primer warehouse activo
WITH wh AS (
  SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
),
-- 2) Productos activos
prods AS (
  SELECT id, sku, name FROM products WHERE is_active = true
),
-- 3) Resolver ubicación virtual esperada por producto
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
-- 4) Encontrar location_id real por código y warehouse
locs AS (
  SELECT vl.product_id, l.id AS location_id, w.id AS warehouse_id
  FROM virt_locations vl
  CROSS JOIN wh w
  JOIN locations l ON l.warehouse_id = w.id AND l.code = vl.virt_code
)
-- 5) Insertar inventario (cantidad 0) para vincular producto→ubicación
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

-- 6) Reporte rápido
WITH wh AS (
  SELECT id FROM warehouses WHERE is_active = true ORDER BY created_at LIMIT 1
)
SELECT 'Inventario virtual vinculado (filas en inventory con lot=VIRT):' AS info,
       COUNT(*) AS total
FROM inventory i
JOIN wh ON i.warehouse_id = wh.id
WHERE i.lot_number = 'VIRT';

COMMIT;