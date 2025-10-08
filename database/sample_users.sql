-- =====================================================
-- USUARIOS DE EJEMPLO CON DIFERENTES ROLES
-- =====================================================

-- NOTA: Este script asume que los usuarios ya existen en auth.users
-- Ejecutar primero create_auth_users.sql antes de este script

-- =====================================================
-- 1. ACTUALIZAR USUARIOS EXISTENTES CON ROLES
-- =====================================================

-- Función para crear perfiles de usuarios (después de crear usuarios en auth.users)
CREATE OR REPLACE FUNCTION create_sample_users()
RETURNS void AS $$
BEGIN
    -- Verificar que los usuarios existen en auth.users antes de crear perfiles
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
        RAISE EXCEPTION 'Usuario admin no existe en auth.users. Ejecutar create_auth_users.sql primero.';
    END IF;
    
    -- Insertar perfiles para usuarios existentes en auth.users
    
    -- ADMIN - Administrador del sistema
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'admin@wms.com',
        'Administrador Sistema',
        'ADMIN',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'ADMIN',
        full_name = 'Administrador Sistema',
        is_active = true,
        updated_at = NOW();

    -- MANAGER - Gerente de almacén
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '22222222-2222-2222-2222-222222222222',
        'gerente@wms.com',
        'María González - Gerente',
        'MANAGER',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'MANAGER',
        full_name = 'María González - Gerente',
        is_active = true,
        updated_at = NOW();

    -- OPERATOR - Operador de almacén
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '33333333-3333-3333-3333-333333333333',
        'operador@wms.com',
        'Carlos López - Operador',
        'OPERATOR',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'OPERATOR',
        full_name = 'Carlos López - Operador',
        is_active = true,
        updated_at = NOW();

    -- VIEWER - Usuario solo lectura
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '44444444-4444-4444-4444-444444444444',
        'consulta@wms.com',
        'Ana Martínez - Consultas',
        'VIEWER',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'VIEWER',
        full_name = 'Ana Martínez - Consultas',
        is_active = true,
        updated_at = NOW();

    -- MANAGER adicional - Gerente de compras
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '55555555-5555-5555-5555-555555555555',
        'compras@wms.com',
        'Roberto Silva - Compras',
        'MANAGER',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'MANAGER',
        full_name = 'Roberto Silva - Compras',
        is_active = true,
        updated_at = NOW();

    -- OPERATOR adicional - Operador de envíos
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at
    ) VALUES (
        '66666666-6666-6666-6666-666666666666',
        'envios@wms.com',
        'Laura Hernández - Envíos',
        'OPERATOR',
        true,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'OPERATOR',
        full_name = 'Laura Hernández - Envíos',
        is_active = true,
        updated_at = NOW();

    RAISE NOTICE 'Perfiles de usuarios creados exitosamente';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para crear usuarios de ejemplo
SELECT create_sample_users();

-- =====================================================
-- 2. FUNCIÓN PARA ASIGNAR ROLES A USUARIOS EXISTENTES
-- =====================================================

-- Función para asignar rol a un usuario por email
CREATE OR REPLACE FUNCTION assign_user_role(
    user_email TEXT,
    new_role user_role,
    assigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_found BOOLEAN := false;
BEGIN
    UPDATE profiles 
    SET 
        role = new_role,
        updated_at = NOW()
    WHERE email = user_email;
    
    GET DIAGNOSTICS user_found = FOUND;
    
    IF user_found THEN
        RAISE NOTICE 'Rol % asignado al usuario %', new_role, user_email;
        RETURN true;
    ELSE
        RAISE NOTICE 'Usuario % no encontrado', user_email;
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. EJEMPLOS DE USO DE LA FUNCIÓN
-- =====================================================

-- Ejemplos de cómo asignar roles (descomenta para usar):
-- SELECT assign_user_role('usuario@empresa.com', 'MANAGER', '11111111-1111-1111-1111-111111111111');
-- SELECT assign_user_role('operador@empresa.com', 'OPERATOR', '11111111-1111-1111-1111-111111111111');
-- SELECT assign_user_role('consultor@empresa.com', 'VIEWER', '11111111-1111-1111-1111-111111111111');

-- =====================================================
-- 4. CONSULTAS ÚTILES PARA VERIFICAR USUARIOS Y ROLES
-- =====================================================

-- Ver todos los usuarios con sus roles
-- SELECT id, email, full_name, role, is_active, created_at FROM profiles ORDER BY role, full_name;

-- Ver permisos de un usuario específico
-- SELECT * FROM get_user_permissions('11111111-1111-1111-1111-111111111111');

-- Verificar si un usuario tiene un permiso específico
-- SELECT check_user_permission('22222222-2222-2222-2222-222222222222', 'products', 'create');

-- Ver estadísticas de usuarios por rol
-- SELECT * FROM user_stats_by_role;

-- =====================================================
-- 5. DATOS ADICIONALES PARA TESTING
-- =====================================================

-- Actualizar algunos usuarios con última fecha de login para testing
UPDATE profiles 
SET last_login = NOW() - INTERVAL '2 days'
WHERE email IN ('admin@wms.com', 'gerente@wms.com');

UPDATE profiles 
SET last_login = NOW() - INTERVAL '1 week'
WHERE email IN ('operador@wms.com');

UPDATE profiles 
SET last_login = NOW() - INTERVAL '45 days'
WHERE email IN ('consulta@wms.com');

-- =====================================================
-- 6. FUNCIÓN PARA LIMPIAR USUARIOS DE EJEMPLO
-- =====================================================

-- Función para eliminar usuarios de ejemplo (solo para desarrollo)
CREATE OR REPLACE FUNCTION cleanup_sample_users()
RETURNS void AS $$
BEGIN
    DELETE FROM profiles 
    WHERE id IN (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555',
        '66666666-6666-6666-6666-666666666666'
    );
    
    RAISE NOTICE 'Usuarios de ejemplo eliminados';
END;
$$ LANGUAGE plpgsql;

-- Para limpiar usuarios de ejemplo (descomenta para usar):
-- SELECT cleanup_sample_users();