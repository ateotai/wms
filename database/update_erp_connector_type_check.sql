-- Actualiza el constraint del tipo de conector ERP para permitir valores usados por la UI
-- Ejecuta este script en el SQL Editor de Supabase o con:
--   npm run migrate:file database/update_erp_connector_type_check.sql
-- (asegúrate de definir SUPABASE_DB_URL o DATABASE_URL en server/.env para el comando anterior)

BEGIN;

ALTER TABLE public.erp_connectors
  DROP CONSTRAINT IF EXISTS erp_connectors_type_check;

ALTER TABLE public.erp_connectors
  ADD CONSTRAINT erp_connectors_type_check
  CHECK (type IN ('SAP B1', 'API Personalizada', 'API Personalizada v1', 'API'));

COMMIT;
