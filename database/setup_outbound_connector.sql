-- Actualizar conectores existentes como de 'entrada' (inbound) por defecto
UPDATE public.erp_connectors
SET connection_settings = jsonb_set(
  COALESCE(connection_settings, '{}'::jsonb),
  '{direction}',
  '"inbound"'
)
WHERE (connection_settings->>'direction') IS NULL;

-- Insertar nuevo conector de SALIDA (outbound) para confirmación de recepciones
INSERT INTO public.erp_connectors (
  name,
  type,
  endpoint,
  username,
  password,
  status,
  is_active,
  sync_interval,
  sync_type,
  connection_settings
) VALUES (
  'SAP B1 Confirmación Recepción',
  'SAP B1',
  'http://localhost:3001/b1s/v1/PurchaseOrders/Acknowledge',
  'manager',
  'manager',
  'active',
  true,
  0, -- Tiempo real, no por intervalo
  'automatic',
  '{
    "direction": "outbound",
    "supportedTargets": ["purchase_orders"],
    "event": "reception_completed"
  }'::jsonb
);
