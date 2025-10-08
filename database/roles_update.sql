-- =====================================================
-- ACTUALIZACIÓN DEL SISTEMA DE ROLES DE USUARIO
-- =====================================================

-- =====================================================
-- 1. CREAR ENUM DE ROLES DE USUARIO
-- =====================================================
CREATE TYPE user_role AS ENUM (
    'ADMIN',     -- Acceso completo a todas las funcionalidades
    'MANAGER',   -- Acceso a operaciones de gestión y reportes
    'OPERATOR',  -- Acceso a operaciones operativas (recepciones, envíos)
    'VIEWER'     -- Acceso solo de lectura
);

-- =====================================================
-- 2. ACTUALIZAR TABLA PROFILES PARA INCLUIR ROL
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN role user_role DEFAULT 'VIEWER' NOT NULL,
ADD COLUMN permissions JSONB DEFAULT '{}' NOT NULL,
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN last_login TIMESTAMPTZ,
ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Crear índice para mejorar consultas por rol
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- =====================================================
-- 3. CREAR TABLA DE PERMISOS POR ROL
-- =====================================================
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

-- Trigger para actualizar updated_at
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. INSERTAR PERMISOS POR ROL
-- =====================================================

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

-- =====================================================
-- 5. FUNCIONES PARA VERIFICAR PERMISOS
-- =====================================================

-- Función para verificar si un usuario tiene permiso para una acción
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

-- Función para obtener todos los permisos de un usuario
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

-- =====================================================
-- 6. ACTUALIZAR POLÍTICAS RLS PARA INCLUIR ROLES
-- =====================================================

-- Política para que los usuarios solo vean perfiles según su rol
DROP POLICY IF EXISTS "Users can view profiles based on role" ON profiles;
CREATE POLICY "Users can view profiles based on role" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR
        check_user_permission(auth.uid(), 'users', 'read')
    );

-- Política para que solo ADMIN y MANAGER puedan actualizar perfiles
DROP POLICY IF EXISTS "Users can update profiles based on role" ON profiles;
CREATE POLICY "Users can update profiles based on role" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR
        check_user_permission(auth.uid(), 'users', 'update')
    );

-- Política para que solo ADMIN pueda crear usuarios
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;
CREATE POLICY "Only admins can create profiles" ON profiles
    FOR INSERT WITH CHECK (
        check_user_permission(auth.uid(), 'users', 'create')
    );

-- =====================================================
-- 7. FUNCIÓN PARA ASIGNAR ROL AL PRIMER USUARIO (ADMIN)
-- =====================================================
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

-- Trigger para asignar ADMIN al primer usuario
CREATE TRIGGER assign_first_admin_trigger
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_first_admin();

-- =====================================================
-- 8. VISTAS PARA FACILITAR CONSULTAS
-- =====================================================

-- Vista para obtener usuarios con sus roles y permisos
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
LEFT JOIN role_permissions rp ON rp.role = p.role
GROUP BY p.id, p.email, p.full_name, p.role, p.is_active, p.last_login, p.created_at, p.updated_at;

-- Vista para estadísticas de usuarios por rol
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