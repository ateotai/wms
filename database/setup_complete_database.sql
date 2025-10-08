-- =====================================================
-- CONFIGURACIÓN COMPLETA DE LA BASE DE DATOS WMS
-- =====================================================
-- IMPORTANTE: Este script debe ejecutarse paso a paso
-- No se puede ejecutar todo de una vez debido a dependencias

-- =====================================================
-- PASO 1: CREAR EXTENSIONES Y TABLAS
-- =====================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTA: Después de ejecutar este paso, ejecutar manualmente:
-- 1. create_inventory_tables.sql
-- 2. create_auth_users.sql  
-- 3. sample_users.sql
-- 4. sample_inventory_data.sql (si existe)

-- =====================================================
-- FUNCIÓN PARA VERIFICAR LA CONFIGURACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION verify_wms_setup()
RETURNS TABLE(
    step_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Verificar extensiones
    RETURN QUERY
    SELECT 
        'Extensiones'::TEXT as step_name,
        CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'ERROR' END as status,
        'uuid-ossp y pgcrypto: ' || COUNT(*)::TEXT as details
    FROM pg_extension 
    WHERE extname IN ('uuid-ossp', 'pgcrypto');

    -- Verificar tablas principales
    RETURN QUERY
    SELECT 
        'Tablas principales'::TEXT as step_name,
        CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'FALTAN TABLAS' END as status,
        'Tablas encontradas: ' || COUNT(*)::TEXT as details
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'warehouses', 'products', 'categories', 'inventory');

    -- Verificar usuarios en auth.users
    RETURN QUERY
    SELECT 
        'Usuarios auth'::TEXT as step_name,
        CASE WHEN COUNT(*) >= 6 THEN 'OK' ELSE 'FALTAN USUARIOS' END as status,
        'Usuarios en auth.users: ' || COUNT(*)::TEXT as details
    FROM auth.users;

    -- Verificar perfiles
    RETURN QUERY
    SELECT 
        'Perfiles'::TEXT as step_name,
        CASE WHEN COUNT(*) >= 6 THEN 'OK' ELSE 'FALTAN PERFILES' END as status,
        'Perfiles creados: ' || COUNT(*)::TEXT as details
    FROM profiles;

    -- Verificar datos de ejemplo
    RETURN QUERY
    SELECT 
        'Datos ejemplo'::TEXT as step_name,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'SIN DATOS' END as status,
        'Productos: ' || COUNT(*)::TEXT as details
    FROM products;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

SELECT 'INSTRUCCIONES DE CONFIGURACIÓN:' as mensaje;
SELECT '1. Ejecutar: create_inventory_tables.sql' as paso;
SELECT '2. Ejecutar: create_auth_users.sql' as paso;
SELECT '3. Ejecutar: sample_users.sql' as paso;
SELECT '4. Ejecutar: sample_inventory_data.sql (opcional)' as paso;
SELECT '5. Verificar con: SELECT * FROM verify_wms_setup();' as paso;

SELECT 'CREDENCIALES DE ACCESO:' as mensaje;
SELECT 'admin@wms.com / password123' as credencial;
SELECT 'gerente@wms.com / password123' as credencial;
SELECT 'operador@wms.com / password123' as credencial;
SELECT 'consulta@wms.com / password123' as credencial;
SELECT 'compras@wms.com / password123' as credencial;
SELECT 'envios@wms.com / password123' as credencial;