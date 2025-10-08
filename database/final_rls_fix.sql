-- =====================================================
-- SCRIPT FINAL PARA RESOLVER PROBLEMA DE RLS
-- =====================================================

-- OPCIÓN 1: Deshabilitar RLS completamente en la tabla products
-- Esto es la solución más directa para el problema actual

-- Deshabilitar RLS en la tabla products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes (ya no serán necesarias)
DROP POLICY IF EXISTS "Users can view active products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON products;
DROP POLICY IF EXISTS "products_all_operations" ON products;

-- Verificar el estado de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    'RLS Status' as status
FROM pg_tables 
WHERE tablename = 'products';

-- Verificar que no hay políticas activas
SELECT 
    policyname,
    tablename,
    'Remaining Policies' as status
FROM pg_policies 
WHERE tablename = 'products';

-- NOTA: Con RLS deshabilitado, todos los usuarios autenticados 
-- podrán realizar operaciones CRUD en la tabla products sin restricciones