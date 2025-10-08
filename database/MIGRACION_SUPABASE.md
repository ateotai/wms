# Migración a nuevo proyecto de Supabase

Este documento te guía para crear toda la estructura y tablas en tu nuevo proyecto de Supabase y conectar la app.

## Credenciales del proyecto
- URL: `https://jffaljgvdigkyxjksnot.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZmFsamd2ZGlna3l4amtzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDEwODMsImV4cCI6MjA3NTAxNzA4M30.W6JVxYFn226MhuIXwa8aP-cLHIhunKyLOdtXNQ2NHLA`

## Pasos de instalación (SQL Editor en Supabase)
1. Abre tu proyecto y ve a `SQL` > `New Query`.
2. Ejecuta, en este orden:
   - `database/schema.sql`
   - `database/security.sql`
   - `database/functions.sql`
   - Opcional: `database/sample_data.sql`
   - Opcional: `database/create_auth_users.sql` o `database/create_users_by_roles_fixed.sql` para usuarios de desarrollo.

### Verificación rápida
Tras ejecutar los scripts, valida el estado:
```sql
-- Si ejecutaste setup_complete_database.sql, usa:
SELECT * FROM verify_wms_setup();

-- Si no, verifica componentes clave manualmente:
SELECT COUNT(*) AS profiles_count FROM public.profiles;
SELECT COUNT(*) AS warehouses_count FROM public.warehouses;
SELECT COUNT(*) AS products_count FROM public.products;
```

### Prueba de RLS con JWT emulado (en SQL Editor)
```sql
-- Ver JWT en contexto
SELECT current_setting('request.jwt.claims', true);
SELECT auth.uid(), auth.role();

-- Emular JWT (usa un UUID válido; por ejemplo uno de create_auth_users.sql)
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT auth.uid(), auth.role();

-- Perfil y rol
SELECT id, email, role, is_active FROM public.profiles WHERE id = auth.uid();

-- Helpers
SELECT public.is_admin() AS is_admin, public.is_admin_or_manager() AS is_admin_or_manager;

-- Prueba de inserción (política permite insert a autenticados)
INSERT INTO public.warehouses (name, code, address, is_active)
VALUES ('Almacén Principal', 'MAIN01', 'Dirección', true);
```

## Conectar la app
La app usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Puedes:
- Crear `.env` (no versionado) con:
```
VITE_SUPABASE_URL=https://jffaljgvdigkyxjksnot.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZmFsamd2ZGlna3l4amtzbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDEwODMsImV4cCI6MjA3NTAxNzA4M30.W6JVxYFn226MhuIXwa8aP-cLHIhunKyLOdtXNQ2NHLA
```
- O utilizar los valores por defecto ya configurados en `src/lib/supabase.ts`.

## Notas
- Ejecuta los scripts exactamente en el orden indicado para evitar dependencias rotas.
- Para producción, crea usuarios vía Auth en el dashboard; los scripts de `auth.users` son para desarrollo.
- Si alguna operación RLS falla en el SQL Editor, asegúrate de emular el JWT o ejecutar desde el frontend autenticado.