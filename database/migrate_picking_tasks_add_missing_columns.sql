-- Migración: agregar columnas faltantes en public.picking_tasks
-- Uso (opción A - Supabase SQL Editor):
--   Copiar/pegar y ejecutar en el editor SQL de tu proyecto.
-- Uso (opción B - Postgres directo):
--   Ejecutar con cualquier cliente psql/GUI contra tu base.

-- Crear tabla si no existe (estructura base mínima)
create table if not exists public.picking_tasks (
  id text primary key,
  orderNumber text not null
);

-- Agregar columnas faltantes (compatibles con el frontend/backend actual)
alter table public.picking_tasks add column if not exists customer text;
alter table public.picking_tasks add column if not exists priority text;
alter table public.picking_tasks add column if not exists status text;
alter table public.picking_tasks add column if not exists assignedTo text;
alter table public.picking_tasks add column if not exists zone text;
alter table public.picking_tasks add column if not exists location text;
alter table public.picking_tasks add column if not exists items jsonb default '[]'::jsonb;
alter table public.picking_tasks add column if not exists estimatedTime integer default 10;
alter table public.picking_tasks add column if not exists actualTime integer;
alter table public.picking_tasks add column if not exists createdAt timestamptz default now();
alter table public.picking_tasks add column if not exists dueDate timestamptz;
alter table public.picking_tasks add column if not exists notes text;
alter table public.picking_tasks add column if not exists originZone text;
alter table public.picking_tasks add column if not exists destinationZone text;
alter table public.picking_tasks add column if not exists creator text;

-- Índices útiles (se crean sólo si no existen)
create index if not exists idx_picking_tasks_status on public.picking_tasks(status);
create index if not exists idx_picking_tasks_created_at on public.picking_tasks(createdAt desc);
create index if not exists idx_picking_tasks_assigned_to on public.picking_tasks(assignedTo);
create index if not exists idx_picking_tasks_order_number on public.picking_tasks(orderNumber);

-- Activar RLS (seguridad de filas) si aún no está activa
alter table public.picking_tasks enable row level security;

-- Políticas opcionales (descomentar si se requiere insertar con usuarios autenticados)
-- create policy "read_authenticated" on public.picking_tasks
--   for select using (auth.role() is not null);
-- create policy "insert_authenticated" on public.picking_tasks
--   for insert with check (auth.role() is not null);