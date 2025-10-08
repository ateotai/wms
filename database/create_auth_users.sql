-- =====================================================
-- CREAR USUARIOS EN AUTH.USERS PARA DESARROLLO
-- =====================================================
-- Este script crea usuarios directamente en la tabla auth.users de Supabase
-- SOLO para desarrollo/testing. En producción usar el registro normal.

-- Función para crear usuarios en auth.users con contraseñas encriptadas
CREATE OR REPLACE FUNCTION create_auth_users()
RETURNS void AS $$
BEGIN
    -- Insertar usuarios directamente en auth.users
    -- Contraseña para todos: "password123" (encriptada con crypt)
    
    -- ADMIN - admin@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'admin@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Administrador Sistema"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- MANAGER - gerente@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'gerente@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "María González - Gerente"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- OPERATOR - operador@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'operador@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Carlos López - Operador"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- VIEWER - consulta@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000000',
        'consulta@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Ana Martínez - Consultas"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- MANAGER adicional - compras@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000000',
        'compras@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Roberto Silva - Compras"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- OPERATOR adicional - envios@wms.com
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        '66666666-6666-6666-6666-666666666666',
        '00000000-0000-0000-0000-000000000000',
        'envios@wms.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Laura Hernández - Envíos"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RAISE NOTICE 'Usuarios creados en auth.users exitosamente';
    RAISE NOTICE 'Credenciales: email/password123 para todos los usuarios';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT create_auth_users();

-- =====================================================
-- INFORMACIÓN DE USUARIOS CREADOS
-- =====================================================
/*
USUARIOS CREADOS:
1. admin@wms.com (password123) - ID: 11111111-1111-1111-1111-111111111111
2. gerente@wms.com (password123) - ID: 22222222-2222-2222-2222-222222222222
3. operador@wms.com (password123) - ID: 33333333-3333-3333-3333-333333333333
4. consulta@wms.com (password123) - ID: 44444444-4444-4444-4444-444444444444
5. compras@wms.com (password123) - ID: 55555555-5555-5555-5555-555555555555
6. envios@wms.com (password123) - ID: 66666666-6666-6666-6666-666666666666

TODOS LOS USUARIOS TIENEN LA MISMA CONTRASEÑA: password123
*/