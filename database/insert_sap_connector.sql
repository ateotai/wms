-- Delete existing connector with same endpoint to avoid duplicates
DELETE FROM public.erp_connectors WHERE endpoint = 'http://localhost:3001/b1s/v1/Items';

-- Insert new connector
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
  inventory_mapping
) VALUES (
  'SAP B1 Local',
  'SAP B1',
  'http://localhost:3001/b1s/v1/Items',
  'manager',
  'manager',
  'active',
  true,
  60,
  'manual',
  '{"sku": "ItemCode", "name": "ItemName", "stock": "Quantity", "price": "Price"}'::jsonb
);
