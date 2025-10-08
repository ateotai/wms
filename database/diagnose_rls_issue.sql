-- =====================================================
-- SCRIPT DE DIAGNÓSTICO PARA PROBLEMAS RLS
-- =====================================================

-- 1. Verificar si RLS está habilitado en la tabla products
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'products';

-- 2. Listar todas las políticas actuales en la tabla products
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'products';

-- 3. Verificar el usuario actual y su autenticación
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() as current_jwt,
    auth.role() as current_role;

-- 4. Verificar la estructura de la tabla products
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- 5. Intentar hacer un SELECT simple para verificar permisos de lectura
SELECT COUNT(*) as total_products FROM products;

-- 6. Verificar si hay triggers o funciones que puedan interferir
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'products';