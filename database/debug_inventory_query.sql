-- =====================================================
-- SCRIPT DE DEBUG PARA INVENTARIO
-- =====================================================

-- 1. Verificar productos activos
SELECT 
    COUNT(*) as total_productos_activos,
    COUNT(CASE WHEN is_active = true THEN 1 END) as productos_activos,
    COUNT(CASE WHEN is_active = false THEN 1 END) as productos_inactivos
FROM products;

-- 2. Verificar registros de inventario
SELECT 
    COUNT(*) as total_registros_inventario
FROM inventory;

-- 3. Verificar ubicaciones
SELECT 
    COUNT(*) as total_ubicaciones
FROM locations;

-- 4. Verificar almacenes
SELECT 
    COUNT(*) as total_almacenes
FROM warehouses;

-- 5. Ejecutar la misma consulta que usa InventoryList
SELECT 
    i.id,
    i.quantity,
    i.reserved_quantity,
    i.last_counted_at,
    p.id as product_id,
    p.sku,
    p.name,
    p.cost_price,
    p.selling_price,
    p.min_stock_level,
    p.reorder_point,
    p.is_active,
    c.name as category_name,
    l.code as location_code,
    l.name as location_name
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- 6. Verificar productos SIN inventario
SELECT 
    p.id,
    p.sku,
    p.name,
    p.is_active,
    'Sin inventario' as estado
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
WHERE p.is_active = true 
AND i.id IS NULL;

-- 7. Verificar si hay problemas con las relaciones
SELECT 
    'Productos sin categoría' as tipo,
    COUNT(*) as cantidad
FROM products p
WHERE p.category_id IS NULL AND p.is_active = true

UNION ALL

SELECT 
    'Inventario sin ubicación' as tipo,
    COUNT(*) as cantidad
FROM inventory i
WHERE i.location_id IS NULL

UNION ALL

SELECT 
    'Inventario sin producto' as tipo,
    COUNT(*) as cantidad
FROM inventory i
LEFT JOIN products p ON i.product_id = p.id
WHERE p.id IS NULL;