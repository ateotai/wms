-- =====================================================
-- SCRIPT PARA CORREGIR RESTRICCIÓN DE UNIT_OF_MEASURE
-- =====================================================

-- El error indica que hay una restricción CHECK en unit_of_measure
-- que no permite ciertos valores. Vamos a eliminar esta restricción
-- y crear una más flexible.

-- 1. Eliminar la restricción existente de unit_of_measure
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_of_measure_check;

-- 2. Crear una nueva restricción más flexible que incluya más opciones
ALTER TABLE products ADD CONSTRAINT products_unit_of_measure_check 
    CHECK (unit_of_measure IN ('PCS', 'KG', 'LT', 'M', 'M2', 'M3', 'pcs', 'kg', 'lt', 'm', 'm2', 'm3', 'UNIT', 'unit', 'EA', 'ea', 'EACH', 'each'));

-- 3. Alternativamente, si queremos ser más permisivos, podemos eliminar completamente la restricción
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_of_measure_check;

-- 4. Verificar la estructura de la tabla products
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'unit_of_measure';

-- 5. Verificar las restricciones actuales en la tabla products
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'products'::regclass
AND conname LIKE '%unit_of_measure%';

-- 6. Probar inserción de un producto de prueba
INSERT INTO products (sku, name, unit_of_measure) 
VALUES ('TEST-001', 'Producto de Prueba', 'PCS')
ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    unit_of_measure = EXCLUDED.unit_of_measure;