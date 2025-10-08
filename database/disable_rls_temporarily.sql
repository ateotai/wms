-- =====================================================
-- SCRIPT PARA DESHABILITAR RLS TEMPORALMENTE
-- =====================================================
-- ADVERTENCIA: Esto deshabilitará la seguridad a nivel de fila
-- Solo usar como solución temporal para pruebas

-- Deshabilitar RLS en la tabla products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'products';