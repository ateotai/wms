-- Asigna una ubicación aleatoria (storage/picking) a todos los productos activos
-- y crea registros de inventario con cantidad 0 cuando no existan.
-- Ejecuta este script en el SQL Editor de Supabase.

BEGIN;

-- 1) Seleccionar el primer almacén activo como predeterminado
WITH wh AS (
  SELECT id
  FROM public.warehouses
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1
),
-- 2) Crear ubicaciones por defecto si no existen (10 storage + 10 picking)
ins_storage AS (
  INSERT INTO public.locations (warehouse_id, code, name, location_type, is_active)
  SELECT (SELECT id FROM wh),
         'STO-' || LPAD(gs::text, 3, '0'),
         'Storage ' || gs,
         'storage',
         true
  FROM generate_series(1, 10) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE warehouse_id = (SELECT id FROM wh) AND location_type = 'storage'
  )
  RETURNING id
),
ins_picking AS (
  INSERT INTO public.locations (warehouse_id, code, name, location_type, is_active)
  SELECT (SELECT id FROM wh),
         'PK-' || LPAD(gs::text, 3, '0'),
         'Picking ' || gs,
         'picking',
         true
  FROM generate_series(1, 10) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE warehouse_id = (SELECT id FROM wh) AND location_type = 'picking'
  )
  RETURNING id
)
-- 3) Asignar ubicación por defecto aleatoria a productos sin default_location_id
UPDATE public.products p
SET default_location_id = l.id,
    updated_at = NOW()
FROM LATERAL (
  SELECT id
  FROM public.locations
  WHERE is_active = true
    AND location_type IN ('storage', 'picking')
    AND warehouse_id = (SELECT id FROM wh)
  ORDER BY random()
  LIMIT 1
) l
WHERE p.is_active = true
  AND p.default_location_id IS NULL;

-- 4) Crear inventario con cantidad 0 en la ubicación por defecto si no existe
INSERT INTO public.inventory (
  product_id,
  warehouse_id,
  location_id,
  quantity,
  reserved_quantity,
  last_movement_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  loc.warehouse_id,
  p.default_location_id,
  0,
  0,
  NOW(),
  NOW(),
  NOW()
FROM public.products p
JOIN public.locations loc
  ON loc.id = p.default_location_id
LEFT JOIN public.inventory inv
  ON inv.product_id = p.id
 AND inv.location_id = p.default_location_id
 AND inv.warehouse_id = loc.warehouse_id
 AND inv.lot_number IS NULL
WHERE p.is_active = true
  AND p.default_location_id IS NOT NULL
  AND inv.id IS NULL;

COMMIT;

-- Verificación rápida
-- Productos con ubicación por defecto
-- SELECT COUNT(*) AS products_with_default_location FROM public.products WHERE default_location_id IS NOT NULL;
-- Inventario creado
-- SELECT COUNT(*) AS inventory_rows_at_default FROM public.inventory WHERE quantity = 0;
-- Mapeo ejemplo
-- SELECT p.sku, l.code, l.location_type FROM public.products p LEFT JOIN public.locations l ON l.id = p.default_location_id ORDER BY p.sku LIMIT 20;