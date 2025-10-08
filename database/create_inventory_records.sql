-- =====================================================
-- SCRIPT PARA CREAR REGISTROS DE INVENTARIO
-- =====================================================

-- Este script crea registros de inventario para los productos importados
-- para que aparezcan en la lista de productos de la interfaz.

-- 1. Primero, verificar qué productos existen sin inventario
SELECT 
    p.id,
    p.sku,
    p.name,
    p.unit_of_measure,
    CASE 
        WHEN i.id IS NULL THEN 'Sin inventario'
        ELSE 'Con inventario'
    END as estado_inventario
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
WHERE p.is_active = true
ORDER BY p.sku;

-- 2. Verificar si existen ubicaciones
SELECT COUNT(*) as total_ubicaciones FROM locations;

-- 3. Crear una ubicación por defecto si no existe
INSERT INTO locations (id, warehouse_id, code, name, location_type, is_active)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM warehouses LIMIT 1),
    'DEFAULT-01',
    'Ubicación por Defecto',
    'storage',
    true
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE code = 'DEFAULT-01');

-- 4. Crear registros de inventario para productos sin inventario
INSERT INTO inventory (
    id,
    product_id,
    warehouse_id,
    location_id,
    quantity,
    reserved_quantity,
    last_counted_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    p.id as product_id,
    (SELECT id FROM warehouses LIMIT 1) as warehouse_id,
    (SELECT id FROM locations WHERE code = 'DEFAULT-01' LIMIT 1) as location_id,
    0 as quantity,
    0 as reserved_quantity,
    NOW() as last_counted_at,
    NOW() as created_at,
    NOW() as updated_at
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
WHERE p.is_active = true 
AND i.id IS NULL;

-- 5. Verificar los registros creados
SELECT 
    p.sku,
    p.name,
    i.quantity,
    l.code as ubicacion,
    i.created_at
FROM products p
INNER JOIN inventory i ON p.id = i.product_id
INNER JOIN locations l ON i.location_id = l.id
WHERE p.is_active = true
ORDER BY p.sku;

-- 6. Contar total de productos con inventario
SELECT 
    COUNT(DISTINCT p.id) as productos_con_inventario,
    COUNT(DISTINCT CASE WHEN i.id IS NULL THEN p.id END) as productos_sin_inventario
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
WHERE p.is_active = true;

COMMIT;