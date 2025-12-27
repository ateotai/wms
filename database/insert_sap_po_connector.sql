-- Insert new connector for Purchase Orders
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
  'SAP B1 Compras',
  'SAP B1',
  'http://localhost:3001/b1s/v1/PurchaseOrders',
  'manager',
  'manager',
  'active',
  true,
  60,
  'manual',
  '{"supportedTargets": ["purchase_orders"]}'::jsonb
);
