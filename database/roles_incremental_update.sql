-- =====================================================
-- ACTUALIZACIÓN INCREMENTAL DEL SISTEMA DE ROLES
-- Este script solo agrega componentes que no existen
-- =====================================================

-- =====================================================
-- 1. CREAR ENUM DE ROLES SI NO EXISTE
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typtype = 'e') THEN
        CREATE TYPE user_role AS ENUM (
            'ADMIN',     -- Acceso completo a todas las funcionalidades
            'MANAGER',   -- Acceso a operaciones de gestión y reportes
            'OPERATOR',  -- Acceso a operaciones operativas (recepciones, envíos)
            'VIEWER'     -- Acceso solo de lectura
        );
        RAISE NOTICE 'Enum user_role creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum user_role ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 2. AGREGAR COLUMNAS A PROFILES SI NO EXISTEN
-- =====================================================

-- Agregar columna role si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'VIEWER' NOT NULL;
        RAISE NOTICE 'Columna role agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna role ya existe en profiles, omitiendo...';
    END IF;
END $$;

-- Agregar columna permissions si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE profiles ADD COLUMN permissions JSONB DEFAULT '{}' NOT NULL;
        RAISE NOTICE 'Columna permissions agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna permissions ya existe en profiles, omitiendo...';
    END IF;
END $$;

-- Agregar columna is_active si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Columna is_active agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna is_active ya existe en profiles, omitiendo...';
    END IF;
END $$;

-- Agregar columna last_login si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE 'Columna last_login agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna last_login ya existe en profiles, omitiendo...';
    END IF;
END $$;

-- Agregar columna created_by si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE profiles ADD COLUMN created_by UUID REFERENCES profiles(id);
        RAISE NOTICE 'Columna created_by agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna created_by ya existe en profiles, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 3. CREAR ÍNDICES SI NO EXISTEN
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
        CREATE INDEX idx_profiles_role ON profiles(role);
        RAISE NOTICE 'Índice idx_profiles_role creado';
    ELSE
        RAISE NOTICE 'Índice idx_profiles_role ya existe, omitiendo...';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_active') THEN
        CREATE INDEX idx_profiles_active ON profiles(is_active);
        RAISE NOTICE 'Índice idx_profiles_active creado';
    ELSE
        RAISE NOTICE 'Índice idx_profiles_active ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 4. CREAR TABLA ROLE_PERMISSIONS SI NO EXISTE
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        CREATE TABLE role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role user_role NOT NULL,
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(20) NOT NULL,
            allowed BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(role, resource, action)
        );
        RAISE NOTICE 'Tabla role_permissions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla role_permissions ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 5. CREAR TRIGGER PARA ROLE_PERMISSIONS SI NO EXISTE
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_role_permissions_updated_at'
    ) THEN
        CREATE TRIGGER update_role_permissions_updated_at
            BEFORE UPDATE ON role_permissions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_role_permissions_updated_at creado';
    ELSE
        RAISE NOTICE 'Trigger update_role_permissions_updated_at ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 6. INSERTAR PERMISOS SI LA TABLA ESTÁ VACÍA
-- =====================================================
DO $$ 
BEGIN
    IF (SELECT COUNT(*) FROM role_permissions) = 0 THEN
        -- ADMIN: Acceso completo a todas las funcionalidades
        INSERT INTO role_permissions (role, resource, action, allowed) VALUES
            ('ADMIN', 'users', 'create', true),
            ('ADMIN', 'users', 'read', true),
            ('ADMIN', 'users', 'update', true),
            ('ADMIN', 'users', 'delete', true),
            ('ADMIN', 'warehouses', 'create', true),
            ('ADMIN', 'warehouses', 'read', true),
            ('ADMIN', 'warehouses', 'update', true),
            ('ADMIN', 'warehouses', 'delete', true),
            ('ADMIN', 'products', 'create', true),
            ('ADMIN', 'products', 'read', true),
            ('ADMIN', 'products', 'update', true),
            ('ADMIN', 'products', 'delete', true),
            ('ADMIN', 'inventory', 'create', true),
            ('ADMIN', 'inventory', 'read', true),
            ('ADMIN', 'inventory', 'update', true),
            ('ADMIN', 'inventory', 'delete', true),
            ('ADMIN', 'purchase_orders', 'create', true),
            ('ADMIN', 'purchase_orders', 'read', true),
            ('ADMIN', 'purchase_orders', 'update', true),
            ('ADMIN', 'purchase_orders', 'delete', true),
            ('ADMIN', 'sales_orders', 'create', true),
            ('ADMIN', 'sales_orders', 'read', true),
            ('ADMIN', 'sales_orders', 'update', true),
            ('ADMIN', 'sales_orders', 'delete', true),
            ('ADMIN', 'transfers', 'create', true),
            ('ADMIN', 'transfers', 'read', true),
            ('ADMIN', 'transfers', 'update', true),
            ('ADMIN', 'transfers', 'delete', true),
            ('ADMIN', 'reports', 'read', true),
            ('ADMIN', 'settings', 'update', true);

        -- MANAGER: Acceso a operaciones de gestión y reportes
        INSERT INTO role_permissions (role, resource, action, allowed) VALUES
            ('MANAGER', 'users', 'read', true),
            ('MANAGER', 'warehouses', 'read', true),
            ('MANAGER', 'warehouses', 'update', true),
            ('MANAGER', 'products', 'create', true),
            ('MANAGER', 'products', 'read', true),
            ('MANAGER', 'products', 'update', true),
            ('MANAGER', 'inventory', 'read', true),
            ('MANAGER', 'inventory', 'update', true),
            ('MANAGER', 'purchase_orders', 'create', true),
            ('MANAGER', 'purchase_orders', 'read', true),
            ('MANAGER', 'purchase_orders', 'update', true),
            ('MANAGER', 'sales_orders', 'create', true),
            ('MANAGER', 'sales_orders', 'read', true),
            ('MANAGER', 'sales_orders', 'update', true),
            ('MANAGER', 'transfers', 'create', true),
            ('MANAGER', 'transfers', 'read', true),
            ('MANAGER', 'transfers', 'update', true),
            ('MANAGER', 'reports', 'read', true);

        -- OPERATOR: Acceso a operaciones operativas (recepciones, envíos)
        INSERT INTO role_permissions (role, resource, action, allowed) VALUES
            ('OPERATOR', 'products', 'read', true),
            ('OPERATOR', 'inventory', 'read', true),
            ('OPERATOR', 'inventory', 'update', true),
            ('OPERATOR', 'purchase_orders', 'read', true),
            ('OPERATOR', 'purchase_orders', 'update', true),
            ('OPERATOR', 'sales_orders', 'read', true),
            ('OPERATOR', 'sales_orders', 'update', true),
            ('OPERATOR', 'transfers', 'read', true),
            ('OPERATOR', 'transfers', 'update', true),
            ('OPERATOR', 'cycle_counts', 'create', true),
            ('OPERATOR', 'cycle_counts', 'read', true),
            ('OPERATOR', 'cycle_counts', 'update', true);

        -- VIEWER: Acceso solo de lectura
        INSERT INTO role_permissions (role, resource, action, allowed) VALUES
            ('VIEWER', 'products', 'read', true),
            ('VIEWER', 'inventory', 'read', true),
            ('VIEWER', 'purchase_orders', 'read', true),
            ('VIEWER', 'sales_orders', 'read', true),
            ('VIEWER', 'transfers', 'read', true),
            ('VIEWER', 'reports', 'read', true);

        RAISE NOTICE 'Permisos por rol insertados exitosamente';
    ELSE
        RAISE NOTICE 'La tabla role_permissions ya contiene datos, omitiendo inserción...';
    END IF;
END $$;

-- =====================================================
-- 7. CREAR FUNCIONES SI NO EXISTEN
-- =====================================================

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION check_user_permission(
    user_id UUID,
    resource_name VARCHAR(50),
    action_name VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
    has_permission BOOLEAN := false;
BEGIN
    -- Obtener el rol del usuario
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = user_id AND is_active = true;
    
    -- Si no se encuentra el usuario o no está activo, denegar acceso
    IF user_role_val IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar permiso en la tabla role_permissions
    SELECT allowed INTO has_permission
    FROM role_permissions
    WHERE role = user_role_val
    AND resource = resource_name
    AND action = action_name;
    
    -- Si no se encuentra el permiso específico, denegar acceso
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener permisos de usuario
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(resource VARCHAR(50), action VARCHAR(20), allowed BOOLEAN) AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Obtener el rol del usuario
    SELECT p.role INTO user_role_val
    FROM profiles p
    WHERE p.id = user_id AND p.is_active = true;
    
    -- Si no se encuentra el usuario, retornar vacío
    IF user_role_val IS NULL THEN
        RETURN;
    END IF;
    
    -- Retornar todos los permisos del rol
    RETURN QUERY
    SELECT rp.resource, rp.action, rp.allowed
    FROM role_permissions rp
    WHERE rp.role = user_role_val
    ORDER BY rp.resource, rp.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para asignar primer admin
CREATE OR REPLACE FUNCTION assign_first_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es el primer usuario en la tabla, asignarle rol ADMIN
    IF (SELECT COUNT(*) FROM profiles) = 1 THEN
        NEW.role = 'ADMIN';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREAR TRIGGER PARA PRIMER ADMIN SI NO EXISTE
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'assign_first_admin_trigger'
    ) THEN
        CREATE TRIGGER assign_first_admin_trigger
            BEFORE INSERT ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION assign_first_admin();
        RAISE NOTICE 'Trigger assign_first_admin_trigger creado';
    ELSE
        RAISE NOTICE 'Trigger assign_first_admin_trigger ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- 9. CREAR/ACTUALIZAR POLÍTICAS RLS
-- =====================================================

-- Eliminar políticas existentes si existen y crear nuevas
DROP POLICY IF EXISTS "Users can view profiles based on role" ON profiles;
CREATE POLICY "Users can view profiles based on role" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR
        check_user_permission(auth.uid(), 'users', 'read')
    );

DROP POLICY IF EXISTS "Users can update profiles based on role" ON profiles;
CREATE POLICY "Users can update profiles based on role" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR
        check_user_permission(auth.uid(), 'users', 'update')
    );

DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
CREATE POLICY "Only admins can create profiles" ON profiles
    FOR INSERT WITH CHECK (
        check_user_permission(auth.uid(), 'users', 'create')
    );

-- =====================================================
-- 10. CREAR VISTAS SI NO EXISTEN
-- =====================================================

-- Vista para usuarios con roles y permisos
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.last_login,
    p.created_at,
    p.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'resource', rp.resource,
                'action', rp.action,
                'allowed', rp.allowed
            )
        ) FILTER (WHERE rp.resource IS NOT NULL),
        '[]'::json
    ) as permissions
FROM profiles p
LEFT JOIN role_permissions rp ON rp.role = p.role::user_role
GROUP BY p.id, p.email, p.full_name, p.role, p.is_active, p.last_login, p.created_at, p.updated_at;

-- Vista para estadísticas por rol
CREATE OR REPLACE VIEW user_stats_by_role AS
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
    COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as recent_logins
FROM profiles
GROUP BY role
ORDER BY role;

-- =====================================================
-- MENSAJE FINAL
-- =====================================================
DO $$ 
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ACTUALIZACIÓN INCREMENTAL COMPLETADA';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'El sistema de roles ha sido actualizado exitosamente.';
    RAISE NOTICE 'Ejecuta check_database_state.sql para verificar el estado.';
END $$;