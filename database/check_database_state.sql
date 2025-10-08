-- =====================================================
-- SCRIPT PARA VERIFICAR EL ESTADO ACTUAL DE LA BASE DE DATOS
-- =====================================================

-- Verificar si el enum user_role existe
SELECT 
    'user_role enum' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'user_role' AND typtype = 'e'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status;

-- Verificar columnas en la tabla profiles
SELECT 
    'profiles.' || column_name as component,
    'EXISTS' as status
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('role', 'permissions', 'is_active', 'last_login', 'created_by');

-- Verificar si la tabla role_permissions existe
SELECT 
    'role_permissions table' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'role_permissions'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status;

-- Verificar funciones específicas
SELECT 
    'function: ' || routine_name as component,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN ('check_user_permission', 'get_user_permissions', 'assign_first_admin');

-- Verificar triggers específicos
SELECT 
    'trigger: ' || trigger_name as component,
    'EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_name IN ('assign_first_admin_trigger', 'update_role_permissions_updated_at');

-- Verificar vistas específicas
SELECT 
    'view: ' || table_name as component,
    'EXISTS' as status
FROM information_schema.views 
WHERE table_name IN ('user_roles_view', 'user_stats_by_role');

-- Verificar políticas RLS específicas
SELECT 
    'policy: ' || policyname as component,
    'EXISTS' as status
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname IN (
    'Users can view profiles based on role',
    'Users can update profiles based on role', 
    'Only admins can create profiles'
);

-- Contar registros en role_permissions si existe la tabla
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        SELECT COUNT(*) INTO record_count FROM role_permissions;
        RAISE NOTICE 'role_permissions records: % records', record_count;
    ELSE
        RAISE NOTICE 'role_permissions records: TABLE MISSING';
    END IF;
END $$;