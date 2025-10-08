-- =====================================================
-- DIAGNÓSTICO AVANZADO DE INVENTARIO
-- =====================================================

-- Este script replica EXACTAMENTE la consulta del InventoryList.tsx
-- y verifica cada paso del proceso

-- 1. VERIFICAR DATOS BASE
SELECT '=== VERIFICACIÓN DE DATOS BASE ===' as step;

SELECT 'Productos activos:' as tipo, COUNT(*) as cantidad FROM products WHERE is_active = true;
SELECT 'Registros de inventario:' as tipo, COUNT(*) as cantidad FROM inventory;
SELECT 'Ubicaciones:' as tipo, COUNT(*) as cantidad FROM locations;
SELECT 'Categorías:' as tipo, COUNT(*) as cantidad FROM categories;
SELECT 'Almacenes:' as tipo, COUNT(*) as cantidad FROM warehouses;

-- 2. VERIFICAR PRODUCTOS CON TODOS SUS DATOS
SELECT '=== PRODUCTOS CON DATOS COMPLETOS ===' as step;

SELECT 
    p.id,
    p.sku,
    p.name,
    p.category_id,
    c.name as category_name,
    p.is_active
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- 3. VERIFICAR INVENTARIO CON RELACIONES
SELECT '=== INVENTARIO CON RELACIONES ===' as step;

SELECT 
    i.id as inventory_id,
    i.product_id,
    p.sku,
    p.name as product_name,
    i.location_id,
    l.code as location_code,
    l.name as location_name,
    i.quantity,
    i.reserved_quantity
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
WHERE p.is_active = true;

-- 4. CONSULTA EXACTA DEL INVENTORYLIST.TSX
SELECT '=== CONSULTA EXACTA DE INVENTORYLIST ===' as step;

SELECT 
    i.id,
    i.product_id,
    i.location_id,
    i.quantity,
    i.reserved_quantity,
    i.available_quantity,
    i.created_at,
    i.updated_at,
    p.sku,
    p.name as product_name,
    p.description,
    p.cost_price,
    p.selling_price,
    p.weight,
    p.dimensions,
    p.barcode,
    p.min_stock_level,
    p.max_stock_level,
    p.reorder_point,
    p.unit_of_measure,
    p.is_active,
    l.code as location_code,
    l.name as location_name,
    l.location_type,
    l.warehouse_id,
    c.name as category_name
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY p.sku;

-- 5. VERIFICAR POLÍTICAS RLS (Row Level Security)
SELECT '=== VERIFICACIÓN DE POLÍTICAS RLS ===' as step;

-- Verificar si RLS está habilitado en las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('inventory', 'products', 'locations', 'categories');

-- 6. VERIFICAR PERMISOS DE USUARIO ACTUAL
SELECT '=== USUARIO ACTUAL ===' as step;
SELECT current_user as usuario_actual;

-- 7. VERIFICAR DATOS DE EJEMPLO ESPECÍFICOS
SELECT '=== DATOS DE EJEMPLO ESPECÍFICOS ===' as step;

-- Buscar productos específicos que deberían existir
SELECT 
    p.sku,
    p.name,
    p.is_active,
    p.category_id,
    c.name as category_name,
    COUNT(i.id) as inventory_records
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory i ON p.id = i.product_id
WHERE p.sku IN ('LAPTOP001', 'MOUSE001', 'KEYBOARD001', 'MONITOR001', 'TABLET001')
GROUP BY p.id, p.sku, p.name, p.is_active, p.category_id, c.name;

-- 8. VERIFICAR CONFIGURACIÓN DE WAREHOUSE
SELECT '=== CONFIGURACIÓN DE WAREHOUSE ===' as step;

SELECT 
    w.id,
    w.name,
    w.code,
    w.is_active,
    COUNT(l.id) as locations_count
FROM warehouses w
LEFT JOIN locations l ON w.id = l.warehouse_id
GROUP BY w.id, w.name, w.code, w.is_active;

-- 9. VERIFICAR SI HAY ERRORES EN LOS DATOS
SELECT '=== VERIFICACIÓN DE INTEGRIDAD ===' as step;

-- Productos sin categoría
SELECT 'Productos sin categoría:' as problema, COUNT(*) as cantidad
FROM products 
WHERE category_id IS NULL AND is_active = true;

-- Inventario con productos inactivos
SELECT 'Inventario con productos inactivos:' as problema, COUNT(*) as cantidad
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
WHERE p.is_active = false;

-- Inventario con ubicaciones inválidas
SELECT 'Inventario con ubicaciones inválidas:' as problema, COUNT(*) as cantidad
FROM inventory i
LEFT JOIN locations l ON i.location_id = l.id
WHERE l.id IS NULL;

-- Ubicaciones sin warehouse
SELECT 'Ubicaciones sin warehouse:' as problema, COUNT(*) as cantidad
FROM locations l
LEFT JOIN warehouses w ON l.warehouse_id = w.id
WHERE w.id IS NULL;