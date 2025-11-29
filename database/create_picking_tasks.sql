-- Script: Crear tabla de tareas de picking
-- Uso: Ejecutar en Supabase (SQL editor) o psql contra su base

-- Tabla principal
create table if not exists public.picking_tasks (
  id text primary key,
  orderNumber text not null,
  customer text,
  priority text not null check (priority in ('high','medium','low')),
  status text not null check (status in ('pending','in_progress','completed','cancelled')),
  assignedTo text,
  zone text,
  location text,
  items jsonb default '[]'::jsonb,
  estimatedTime integer not null default 10,
  actualTime integer,
  createdAt timestamptz not null default now(),
  dueDate timestamptz,
  notes text,
  originZone text,
  destinationZone text,
  creator text
);

-- Índices útiles
create index if not exists idx_picking_tasks_status on public.picking_tasks(status);
create index if not exists idx_picking_tasks_created_at on public.picking_tasks(createdAt desc);
create index if not exists idx_picking_tasks_assigned_to on public.picking_tasks(assignedTo);
create index if not exists idx_picking_tasks_order_number on public.picking_tasks(orderNumber);

-- Seguridad: activamos RLS (el service role del backend la bypassa)
alter table public.picking_tasks enable row level security;

-- Políticas opcionales (descomentarlas si desea lecturas públicas autenticadas o por rol).
-- Ejemplo: permitir lectura a usuarios autenticados
-- create policy "read_authenticated" on public.picking_tasks
--   for select using (auth.role() is not null);

-- Ejemplo: permitir inserciones desde usuarios autenticados (si no usa service role en backend)
-- create policy "insert_authenticated" on public.picking_tasks
--   for insert with check (auth.role() is not null);