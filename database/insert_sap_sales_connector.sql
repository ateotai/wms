
INSERT INTO public.erp_connectors (name, type, status, endpoint, connection_settings, password, api_key)
VALUES (
  'SAP B1 Pedidos',
  'SAP B1',
  'active',
  'http://localhost:3001/b1s/v1/SalesOrders',
  '{
    "username": "manager",
    "syncInterval": 60,
    "supportedTargets": ["sales_orders"]
  }'::jsonb,
  '1234',
  NULL
);
