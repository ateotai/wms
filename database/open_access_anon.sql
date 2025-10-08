-- =====================================================
-- ABRIR ACCESO TOTAL PARA ROL ANON EN DESARROLLO
-- =====================================================
-- Objetivo: permitir que el frontend use solo la base de datos
-- sin autenticación de Supabase (rol anon), sin restricciones.
-- Seguridad: NO usar en producción.

-- Asegurar permisos base para el rol anon
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Habilitar RLS y crear política "anon all" en cada tabla de public
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Dev anon all" ON public.%I;', r.tablename);
    EXECUTE format('CREATE POLICY "Dev anon all" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', r.tablename);
  END LOOP;
END $$;

-- Mensaje de confirmación
SELECT 'Acceso total para rol anon habilitado en todas las tablas de public' AS mensaje;