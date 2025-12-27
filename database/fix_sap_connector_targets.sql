UPDATE public.erp_connectors
SET connection_settings = jsonb_set(
  COALESCE(connection_settings, '{}'::jsonb),
  '{supportedTargets}',
  '["products", "inventory"]'::jsonb
)
WHERE name = 'SAP B1 Local';
