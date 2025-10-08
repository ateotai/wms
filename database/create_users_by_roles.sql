-- =====================================================
-- SCRIPT PARA CREAR USUARIOS CON DIFERENTES ROLES
-- Sistema WMS - Gestión de Almacenes
-- =====================================================

-- Función para crear usuarios con roles específicos
CREATE OR REPLACE FUNCTION create_wms_users()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    user_count INTEGER := 0;
BEGIN
    -- Verificar que el enum user_role existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        RAISE EXCEPTION 'El enum user_role no existe. Ejecuta primero roles_incremental_update.sql';
    END IF;

    -- =====================================================
    -- USUARIOS CON ROL ADMIN
    -- Acceso completo a todas las funcionalidades
    -- =====================================================
    
    -- Admin Principal
    -- Verificar si el usuario ya existe antes de insertar
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wms.com') THEN
        INSERT INTO auth.users (
            id,
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
            gen_random_uuid(),
            'admin@wms.com',
            crypt('Admin123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Administrador Principal"}',
            false,
            'authenticated'
        );
    END IF;

    -- Perfil para Admin Principal
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'admin@wms.com'),
        'admin@wms.com',
        'Administrador Principal',
        'ADMIN'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'ADMIN'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario ADMIN creado: admin@wms.com' || E'\n';

    -- Admin Secundario
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'admin.sistema@wms.com',
        crypt('AdminSys123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Administrador del Sistema"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'admin.sistema@wms.com'),
        'admin.sistema@wms.com',
        'Administrador del Sistema',
        'ADMIN'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'ADMIN'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario ADMIN creado: admin.sistema@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL MANAGER
    -- Acceso a operaciones de gestión y reportes
    -- =====================================================
    
    -- Manager de Operaciones
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'manager.operaciones@wms.com',
        crypt('Manager123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Manager de Operaciones"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'manager.operaciones@wms.com'),
        'manager.operaciones@wms.com',
        'Manager de Operaciones',
        'MANAGER'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'MANAGER'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario MANAGER creado: manager.operaciones@wms.com' || E'\n';

    -- Manager de Inventario
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'manager.inventario@wms.com',
        crypt('ManagerInv123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Manager de Inventario"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'manager.inventario@wms.com'),
        'manager.inventario@wms.com',
        'Manager de Inventario',
        'MANAGER'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'MANAGER'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario MANAGER creado: manager.inventario@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL OPERATOR
    -- Acceso a operaciones operativas (recepciones, envíos)
    -- =====================================================
    
    -- Operador de Recepción
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'operador.recepcion@wms.com',
        crypt('Operator123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Operador de Recepción"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'operador.recepcion@wms.com'),
        'operador.recepcion@wms.com',
        'Operador de Recepción',
        'OPERATOR'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'OPERATOR'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.recepcion@wms.com' || E'\n';

    -- Operador de Envíos
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'operador.envios@wms.com',
        crypt('OperatorShip123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Operador de Envíos"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'operador.envios@wms.com'),
        'operador.envios@wms.com',
        'Operador de Envíos',
        'OPERATOR'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'OPERATOR'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.envios@wms.com' || E'\n';

    -- Operador de Picking
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'operador.picking@wms.com',
        crypt('OperatorPick123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Operador de Picking"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'operador.picking@wms.com'),
        'operador.picking@wms.com',
        'Operador de Picking',
        'OPERATOR'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'OPERATOR'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.picking@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL VIEWER
    -- Acceso solo de lectura
    -- =====================================================
    
    -- Auditor
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'auditor@wms.com',
        crypt('Viewer123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Auditor del Sistema"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'auditor@wms.com'),
        'auditor@wms.com',
        'Auditor del Sistema',
        'VIEWER'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'VIEWER'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario VIEWER creado: auditor@wms.com' || E'\n';

    -- Consultor Externo
    INSERT INTO auth.users (
        id,
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
        gen_random_uuid(),
        'consultor@wms.com',
        crypt('Consultor123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Consultor Externo"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'consultor@wms.com'),
        'consultor@wms.com',
        'Consultor Externo',
        'VIEWER'::user_role,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'VIEWER'::user_role,
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario VIEWER creado: consultor@wms.com' || E'\n';

    -- Resultado final
    result_text := result_text || E'\n' || '🎉 RESUMEN: ' || user_count || ' usuarios creados exitosamente' || E'\n';
    result_text := result_text || '📋 Roles distribuidos: 2 ADMIN, 2 MANAGER, 3 OPERATOR, 2 VIEWER' || E'\n';
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJECUTAR LA FUNCIÓN PARA CREAR USUARIOS
-- =====================================================

SELECT create_wms_users();

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Verificar usuarios creados por rol
SELECT 
    role,
    COUNT(*) as total_usuarios,
    string_agg(email, ', ') as emails
FROM profiles 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY 
    CASE role
        WHEN 'ADMIN' THEN 1
        WHEN 'MANAGER' THEN 2
        WHEN 'OPERATOR' THEN 3
        WHEN 'VIEWER' THEN 4
    END;

-- Verificar todos los usuarios con sus permisos
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.created_at
FROM profiles p
WHERE p.role IS NOT NULL
ORDER BY 
    CASE p.role
        WHEN 'ADMIN' THEN 1
        WHEN 'MANAGER' THEN 2
        WHEN 'OPERATOR' THEN 3
        WHEN 'VIEWER' THEN 4
    END,
    p.email;

-- Verificar permisos por rol
SELECT 
    rp.role,
    rp.resource,
    rp.action,
    rp.allowed
FROM role_permissions rp
ORDER BY 
    CASE rp.role
        WHEN 'ADMIN' THEN 1
        WHEN 'MANAGER' THEN 2
        WHEN 'OPERATOR' THEN 3
        WHEN 'VIEWER' THEN 4
    END,
    rp.resource,
    rp.action;

-- =====================================================
-- FUNCIÓN PARA LIMPIAR USUARIOS DE PRUEBA (OPCIONAL)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_test_users()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    deleted_count INTEGER := 0;
BEGIN
    -- Eliminar perfiles de prueba
    DELETE FROM public.profiles 
    WHERE email IN (
        'admin@wms.com',
        'admin.sistema@wms.com',
        'manager.operaciones@wms.com',
        'manager.inventario@wms.com',
        'operador.recepcion@wms.com',
        'operador.envios@wms.com',
        'operador.picking@wms.com',
        'auditor@wms.com',
        'consultor@wms.com'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Eliminar usuarios de auth
    DELETE FROM auth.users 
    WHERE email IN (
        'admin@wms.com',
        'admin.sistema@wms.com',
        'manager.operaciones@wms.com',
        'manager.inventario@wms.com',
        'operador.recepcion@wms.com',
        'operador.envios@wms.com',
        'operador.picking@wms.com',
        'auditor@wms.com',
        'consultor@wms.com'
    );
    
    result_text := '🗑️ Usuarios de prueba eliminados: ' || deleted_count;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Para ejecutar la limpieza (descomenta la siguiente línea si necesitas limpiar):
-- SELECT cleanup_test_users();