-- =====================================================
-- SCRIPT PARA CORREGIR PRODUCTOS SIN CATEGORÍA
-- =====================================================

-- Este script soluciona el problema de productos sin categoría
-- que impide que aparezcan en la lista de inventario

-- 1. Crear una categoría por defecto si no existe
INSERT INTO categories (id, name, description, is_active)
SELECT 
    gen_random_uuid(),
    'General',
    'Categoría por defecto para productos sin clasificar',
    true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'General');

-- 2. Asignar la categoría por defecto a productos sin categoría
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'General' LIMIT 1)
WHERE category_id IS NULL 
AND is_active = true;

-- 3. Verificar que todos los productos activos tengan categoría
SELECT 
    COUNT(*) as productos_sin_categoria
FROM products 
WHERE category_id IS NULL 
AND is_active = true;

-- 4. Verificar que los productos ahora aparezcan en la consulta de inventario
SELECT 
    COUNT(*) as productos_en_inventario
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- 5. Mostrar algunos productos de ejemplo
SELECT 
    p.sku,
    p.name,
    c.name as categoria,
    i.quantity,
    l.code as ubicacion
FROM inventory i
INNER JOIN products p ON i.product_id = p.id
INNER JOIN locations l ON i.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
LIMIT 10;

COMMIT;