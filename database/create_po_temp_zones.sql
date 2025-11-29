-- =====================================================
-- Tabla de asignaciones de zona temporal para órdenes de compra
-- =====================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Tabla: po_temp_zones
create table if not exists public.po_temp_zones (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete restrict,
  zone_code text,
  -- Total de unidades compradas en la orden (sumatoria de purchase_order_items.quantity)
  purchased_quantity_total integer not null default 0,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now()
);

-- Una orden puede tener varias asignaciones históricas, pero la app usa la última.
-- Si prefieres una sola vigente, habilita esta restricción única y usa upsert.
-- alter table public.po_temp_zones add constraint po_temp_zones_po_unique unique (purchase_order_id);

-- Políticas RLS (ajusta según tu proyecto)
alter table public.po_temp_zones enable row level security;

-- Lectura: permitir a cualquier usuario autenticado ver asignaciones
create policy po_temp_zones_select_authenticated on public.po_temp_zones
  for select using (true);

-- Inserción/actualización: permitir a usuarios autenticados
create policy po_temp_zones_insert_authenticated on public.po_temp_zones
  for insert with check (true);

create policy po_temp_zones_update_authenticated on public.po_temp_zones
  for update using (true) with check (true);

-- Opcional: borrar
create policy po_temp_zones_delete_admin on public.po_temp_zones
  for delete using (true);

-- Índices útiles
create index if not exists idx_po_temp_zones_po on public.po_temp_zones (purchase_order_id);
create index if not exists idx_po_temp_zones_zone on public.po_temp_zones (zone_id);