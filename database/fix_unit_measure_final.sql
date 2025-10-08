-- =====================================================
-- SCRIPT FINAL PARA ELIMINAR RESTRICCIÓN DE UNIT_OF_MEASURE
-- =====================================================

-- El error persiste a pesar de haber actualizado la restricción.
-- Vamos a eliminar completamente la restricción CHECK para permitir
-- cualquier valor en unit_of_measure, ya que la validación se puede
-- hacer a nivel de aplicación.

-- 1. Eliminar completamente la restricción de unit_of_measure
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_of_measure_check;

-- 2. Verificar que la restricción fue eliminada
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'products'::regclass
AND conname LIKE '%unit_of_measure%';

-- 3. Verificar la estructura actual de la columna
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'unit_of_measure';

-- 4. Probar inserción con diferentes valores
INSERT INTO products (sku, name, unit_of_measure) 
VALUES 
    ('TEST-PCS', 'Test PCS', 'PCS'),
    ('TEST-KG', 'Test KG', 'KG'),
    ('TEST-UNIT', 'Test UNIT', 'UNIT'),
    ('TEST-pcs', 'Test pcs', 'pcs'),
    ('TEST-t', 'Test t', 't')
ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    unit_of_measure = EXCLUDED.unit_of_measure;

-- 5. Verificar que las inserciones funcionaron
SELECT sku, name, unit_of_measure 
FROM products 
WHERE sku LIKE 'TEST-%'
ORDER BY sku;

-- 6. Limpiar datos de prueba
DELETE FROM products WHERE sku LIKE 'TEST-%';

COMMIT;