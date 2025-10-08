-- =====================================================
-- DIAGNÓSTICO RLS PARA TABLA ZONES
-- =====================================================

-- 1) Verificar existencia y estado de RLS de la tabla
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'zones';

-- 2) Listar políticas activas en la tabla zones
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'zones';

-- 3) Ver rol actual del contexto
SELECT auth.uid() AS current_user_id, auth.role() AS current_role;

-- 4) Probar lectura simple (debería funcionar con políticas existentes)
SELECT COUNT(*) AS total_zones FROM zones;

-- 5) Nota: Para probar INSERT desde el cliente, inicia sesión en la app.
--    Si no estás autenticado, el rol será 'anon' y la política debe permitirlo.
--    Para desarrollo, el script create_zones_table.sql incluye la política 'zones_dev_anon_all'.