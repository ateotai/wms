-- =====================================================
-- DIAGNÓSTICO RLS PARA TABLA WAREHOUSES
-- =====================================================

-- 1) Verificar estado de RLS
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'warehouses';

-- 2) Listar políticas activas en warehouses
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'warehouses';

-- 3) Ver usuario actual del contexto (JWT)
SELECT auth.uid() AS current_user_id, auth.role() AS current_role;
-- 3b) Estado del JWT y claims en esta sesión (útil en SQL Editor)
SELECT 
  current_setting('request.jwt.claims', true) AS jwt_claims,
  CASE WHEN auth.uid() IS NULL THEN 'JWT nulo' ELSE 'JWT presente' END AS jwt_status;

-- 4) Ver perfil del usuario actual
SELECT id, email, role, is_active
FROM public.profiles
WHERE id = auth.uid();
-- 4b) Confirmar existencia del perfil
SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) AS has_profile;

-- 5) Evaluar helpers usados por las políticas
SELECT public.is_admin() AS is_admin,
       public.is_admin_or_manager() AS is_admin_or_manager;
-- 5b) Nota: Si estas funciones devuelven NULL, normalmente indica:
--   - No hay JWT en el contexto (auth.uid() = NULL)
--   - No existe un registro en public.profiles para auth.uid()

-- 6) Consejo: Si is_admin_or_manager = false, el INSERT será rechazado.
--    Actualiza el rol del usuario a MANAGER o ADMIN y reintenta:
--    UPDATE public.profiles SET role = 'MANAGER', is_active = true WHERE id = auth.uid();

-- 7) (Opcional) Emular JWT en el SQL Editor (solo pruebas):
--    Reemplaza <TU-UUID> por el ID del usuario que quieres simular
--    SELECT set_config('request.jwt.claims', '{"sub":"<TU-UUID>","role":"authenticated"}', true);
--    Luego vuelve a ejecutar los bloques 3–5.