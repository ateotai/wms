-- =====================================================
-- SCRIPT PARA CORREGIR UBICACIONES SIN WAREHOUSE
-- =====================================================

-- Este script soluciona el problema de ubicaciones sin warehouse_id
-- que impide que aparezcan los productos en la lista de inventario

-- 1. Verificar el estado actual
SELECT '=== ESTADO ACTUAL ===' as step;

SELECT 'Ubicaciones sin warehouse:' as problema, COUNT(*) as cantidad
FROM locations l
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE w.id IS NULL;

-- 2. Mostrar ubicaciones problemáticas
SELECT 
    l.id,
    l.code,
    l.name,
    l.warehouse_id,
    'SIN WAREHOUSE' as estado
FROM locations l
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE w.id IS NULL;

-- 3. Verificar warehouses disponibles
SELECT 
    w.id,
    w.name,
    w.code,
    w.is_active
FROM warehouses w
WHERE w.is_active = true
ORDER BY w.created_at
LIMIT 1;

-- 4. Asignar el primer warehouse activo a ubicaciones sin warehouse
UPDATE locations 
SET warehouse_id = (
    SELECT id 
    FROM warehouses 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1
)
WHERE warehouse_id IS NULL;

-- 5. Verificar que se corrigió el problema
SELECT '=== DESPUÉS DE LA CORRECCIÓN ===' as step;

SELECT 'Ubicaciones sin warehouse:' as problema, COUNT(*) as cantidad
FROM locations l
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE w.id IS NULL;

-- 6. Mostrar todas las ubicaciones con sus warehouses
SELECT 
    l.id,
    l.code,
    l.name,
    l.warehouse_id,
    w.name as warehouse_name,
    w.code as warehouse_code
FROM locations l
INNER JOIN warehouses w ON l.warehouse_id = w.id
ORDER BY l.code;

-- 7. Probar la consulta del InventoryList después de la corrección
SELECT '=== PRUEBA DE CONSULTA INVENTORYLIST ===' as step;

SELECT 
    COUNT(*) as productos_en_inventario
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- 8. Mostrar algunos productos de ejemplo
SELECT 
    p.sku,
    p.name,
    c.name as categoria,
    i.quantity,
    i.available_quantity,
    l.code as ubicacion,
    w.name as almacen
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
INNER JOIN warehouses w ON l.warehouse_id = w.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
LIMIT 10;

COMMIT;