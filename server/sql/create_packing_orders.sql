BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.packing_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_name text,
  customer_email text,
  customer_phone text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  address_country text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','packing','ready','shipped','delivered')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  carrier text,
  shipping_method text,
  estimated_delivery date,
  tracking_number text,
  total_weight numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  notes text,
  packing_id text NOT NULL UNIQUE,
  packing_model text NOT NULL DEFAULT 'consolidation' CHECK (packing_model IN ('consolidation','wave','pack_to_light')),
  packing_wave_id text,
  packing_station text,
  packing_operator text,
  packing_status text NOT NULL DEFAULT 'pending' CHECK (packing_status IN ('pending','in_process','completed')),
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_packing_orders_created_at ON public.packing_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_packing_orders_status ON public.packing_orders (status);
CREATE INDEX IF NOT EXISTS idx_packing_orders_packing_status ON public.packing_orders (packing_status);

ALTER TABLE public.packing_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY packing_orders_select_authenticated ON public.packing_orders
  FOR SELECT TO authenticated USING (true);

COMMIT;