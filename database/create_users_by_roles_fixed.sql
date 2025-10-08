-- =====================================================
-- SCRIPT PARA CREAR USUARIOS CON DIFERENTES ROLES (CORREGIDO)
-- Sistema WMS - Gestión de Almacenes
-- =====================================================

-- Función para crear usuarios con roles específicos
CREATE OR REPLACE FUNCTION create_wms_users()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    user_count INTEGER := 0;
    user_id UUID;
BEGIN
    -- =====================================================
    -- USUARIOS CON ROL ADMIN
    -- Acceso completo a todas las funcionalidades
    -- =====================================================
    
    -- Admin Principal
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
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
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'admin@wms.com');
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
        user_id,
        'admin@wms.com',
        'Administrador Principal',
        'admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'admin',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario ADMIN creado: admin@wms.com' || E'\n';

    -- Admin Secundario
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.sistema@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'admin.sistema@wms.com',
            crypt('AdminSys123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Administrador del Sistema"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'admin.sistema@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'admin.sistema@wms.com',
        'Administrador del Sistema',
        'admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'admin',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario ADMIN creado: admin.sistema@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL MANAGER
    -- Acceso a operaciones de gestión y reportes
    -- =====================================================
    
    -- Manager de Operaciones
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager.operaciones@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'manager.operaciones@wms.com',
            crypt('Manager123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Manager de Operaciones"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'manager.operaciones@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'manager.operaciones@wms.com',
        'Manager de Operaciones',
        'manager',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'manager',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario MANAGER creado: manager.operaciones@wms.com' || E'\n';

    -- Manager de Inventario
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager.inventario@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'manager.inventario@wms.com',
            crypt('ManagerInv123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Manager de Inventario"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'manager.inventario@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'manager.inventario@wms.com',
        'Manager de Inventario',
        'manager',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'manager',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario MANAGER creado: manager.inventario@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL OPERATOR
    -- Acceso a operaciones operativas (recepciones, envíos)
    -- =====================================================
    
    -- Operador de Recepción
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operador.recepcion@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'operador.recepcion@wms.com',
            crypt('Operator123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Operador de Recepción"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'operador.recepcion@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'operador.recepcion@wms.com',
        'Operador de Recepción',
        'operator',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'operator',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.recepcion@wms.com' || E'\n';

    -- Operador de Envíos
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operador.envios@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'operador.envios@wms.com',
            crypt('OperatorShip123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Operador de Envíos"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'operador.envios@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'operador.envios@wms.com',
        'Operador de Envíos',
        'operator',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'operator',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.envios@wms.com' || E'\n';

    -- Operador de Picking
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operador.picking@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'operador.picking@wms.com',
            crypt('OperatorPick123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Operador de Picking"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'operador.picking@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'operador.picking@wms.com',
        'Operador de Picking',
        'operator',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'operator',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario OPERATOR creado: operador.picking@wms.com' || E'\n';

    -- =====================================================
    -- USUARIOS CON ROL USER (VIEWER)
    -- Acceso solo de lectura
    -- =====================================================
    
    -- Auditor
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'auditor@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'auditor@wms.com',
            crypt('Viewer123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Auditor del Sistema"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'auditor@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'auditor@wms.com',
        'Auditor del Sistema',
        'user',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'user',
        is_active = true,
        updated_at = NOW();

    user_count := user_count + 1;
    result_text := result_text || '✅ Usuario VIEWER creado: auditor@wms.com' || E'\n';

    -- Consultor Externo
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'consultor@wms.com') THEN
        user_id := gen_random_uuid();
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
            user_id,
            'consultor@wms.com',
            crypt('Consultor123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Consultor Externo"}',
            false,
            'authenticated'
        );
    ELSE
        user_id := (SELECT id FROM auth.users WHERE email = 'consultor@wms.com');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'consultor@wms.com',
        'Consultor Externo',
        'user',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'user',
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
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'operator' THEN 3
        WHEN 'user' THEN 4
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
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'operator' THEN 3
        WHEN 'user' THEN 4
    END,
    p.email;

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