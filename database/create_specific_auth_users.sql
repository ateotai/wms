-- =====================================================
-- CREAR USUARIOS SOLICITADOS EN AUTH Y PROFILES (DESARROLLO)
-- =====================================================
-- Crea los usuarios:
--  - Admin:    admin@wms.com / Admin123!
--  - Manager:  manager@wms.com / Manager123!
--  - Operador: operator@wms.com / Operator123!
-- Confirma el email al momento de creación y asegura su perfil en public.profiles.
-- Ejecuta este script en el SQL Editor de Supabase (solo para desarrollo/testing).

CREATE OR REPLACE FUNCTION create_requested_auth_users()
RETURNS void AS $$
DECLARE
    admin_id   UUID;
    manager_id UUID;
    operator_id UUID;
    inst_id UUID := (SELECT id FROM auth.instances LIMIT 1);
    has_enum BOOLEAN := EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role');
BEGIN
    -- =====================
    -- ADMIN
    -- =====================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wms.com') THEN
        admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
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
            admin_id,
            inst_id,
            'authenticated',
            'admin@wms.com',
            crypt('Admin123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Administrador"}',
            false,
            'authenticated'
        );
    ELSE
        SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@wms.com';
        -- Actualiza contraseña si necesitas forzarla en dev
        UPDATE auth.users 
        SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = admin_id;
    END IF;

    -- Upsert perfil ADMIN
    IF has_enum THEN
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (admin_id, 'admin@wms.com', 'Administrador', 'ADMIN'::user_role, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'ADMIN'::user_role,
            is_active = true,
            updated_at = NOW();
    ELSE
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (admin_id, 'admin@wms.com', 'Administrador', 'admin', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'admin',
            is_active = true,
            updated_at = NOW();
    END IF;

    -- =====================
    -- MANAGER
    -- =====================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@wms.com') THEN
        manager_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
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
            manager_id,
            inst_id,
            'authenticated',
            'manager@wms.com',
            crypt('Manager123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Manager"}',
            false,
            'authenticated'
        );
    ELSE
        SELECT id INTO manager_id FROM auth.users WHERE email = 'manager@wms.com';
        UPDATE auth.users 
        SET encrypted_password = crypt('Manager123!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = manager_id;
    END IF;

    -- Upsert perfil MANAGER
    IF has_enum THEN
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (manager_id, 'manager@wms.com', 'Manager', 'MANAGER'::user_role, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'MANAGER'::user_role,
            is_active = true,
            updated_at = NOW();
    ELSE
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (manager_id, 'manager@wms.com', 'Manager', 'manager', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'manager',
            is_active = true,
            updated_at = NOW();
    END IF;

    -- =====================
    -- OPERATOR
    -- =====================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operator@wms.com') THEN
        operator_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
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
            operator_id,
            inst_id,
            'authenticated',
            'operator@wms.com',
            crypt('Operator123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Operador"}',
            false,
            'authenticated'
        );
    ELSE
        SELECT id INTO operator_id FROM auth.users WHERE email = 'operator@wms.com';
        UPDATE auth.users 
        SET encrypted_password = crypt('Operator123!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = operator_id;
    END IF;

    -- Upsert perfil OPERATOR
    IF has_enum THEN
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (operator_id, 'operator@wms.com', 'Operador', 'OPERATOR'::user_role, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'OPERATOR'::user_role,
            is_active = true,
            updated_at = NOW();
    ELSE
        INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (operator_id, 'operator@wms.com', 'Operador', 'operator', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = 'operator',
            is_active = true,
            updated_at = NOW();
    END IF;

    RAISE NOTICE 'Usuarios creados/actualizados: admin@wms.com, manager@wms.com, operator@wms.com';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT create_requested_auth_users();

-- Información
-- Los usuarios quedan confirmados y con perfiles activos. Si usas RLS basada
-- en enum user_role, se insertan como ADMIN / MANAGER / OPERATOR; si mantienes
-- role como TEXT con check lower-case, se insertan como admin/manager/operator.
-- En producción, registra usuarios con supabase.auth.signUp desde la app.