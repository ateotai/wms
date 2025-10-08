-- =====================================================
-- SCRIPT SIMPLIFICADO PARA CREAR USUARIO ADMIN
-- Sistema WMS - Solo crear admin@wms.com
-- =====================================================

-- Primero, verificar la estructura de la tabla profiles
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Crear usuario admin directamente en auth.users usando Supabase Auth
-- NOTA: Este método funciona mejor con Supabase Auth

-- Método 1: Crear usuario usando la función de Supabase (RECOMENDADO)
-- Ejecuta esto en el SQL Editor de Supabase:

/*
-- Crear usuario admin usando Supabase Auth
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@wms.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrador Principal"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
);
*/

-- Método 2: Crear perfil directamente (MÁS SIMPLE)
-- Primero eliminar si existe
DELETE FROM public.profiles WHERE email = 'admin@wms.com';

-- Crear perfil admin
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@wms.com',
    'Administrador Principal',
    'admin',
    true,
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT * FROM public.profiles WHERE email = 'admin@wms.com';

-- =====================================================
-- ALTERNATIVA: Usar Supabase Dashboard
-- =====================================================
/*
Si los métodos SQL no funcionan, usa el Dashboard de Supabase:

1. Ve a Authentication > Users en tu Dashboard de Supabase
2. Haz clic en "Add user"
3. Ingresa:
   - Email: admin@wms.com
   - Password: Admin123!
   - Email confirm: ✓ (marcado)
4. Haz clic en "Create user"
5. Luego ejecuta este SQL para crear el perfil:

INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@wms.com'),
    'admin@wms.com',
    'Administrador Principal',
    'admin',
    true
);
*/

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar usuario en auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@wms.com';

-- Verificar perfil
SELECT id, email, full_name, role, is_active, created_at 
FROM public.profiles 
WHERE email = 'admin@wms.com';