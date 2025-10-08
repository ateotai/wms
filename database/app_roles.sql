-- =====================================================
-- Tabla de roles de aplicación (gestión independiente)
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  is_system boolean not null default true,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Semillas iniciales (se insertan solo si el rol no existe)
insert into public.app_roles (name, description, is_system, permissions)
select 'ADMIN', 'Acceso completo al sistema', true, to_jsonb(array[
  'inventory_read','inventory_write','orders_read','orders_write','reports_read','reports_write','users_read','users_write','config_read','config_write'
])
where not exists (select 1 from public.app_roles where name = 'ADMIN');

insert into public.app_roles (name, description, is_system, permissions)
select 'MANAGER', 'Gestión de operaciones y reportes', true, to_jsonb(array[
  'inventory_read','inventory_write','orders_read','orders_write','reports_read','users_read'
])
where not exists (select 1 from public.app_roles where name = 'MANAGER');

insert into public.app_roles (name, description, is_system, permissions)
select 'OPERATOR', 'Operaciones básicas del almacén', true, to_jsonb(array[
  'inventory_read','orders_read'
])
where not exists (select 1 from public.app_roles where name = 'OPERATOR');

insert into public.app_roles (name, description, is_system, permissions)
select 'VIEWER', 'Acceso de consulta únicamente', true, to_jsonb(array[
  'inventory_read','reports_read'
])
where not exists (select 1 from public.app_roles where name = 'VIEWER');

-- Actualiza updated_at automáticamente
create or replace function public.touch_app_roles()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_touch_app_roles on public.app_roles;
create trigger trg_touch_app_roles
before update on public.app_roles
for each row execute function public.touch_app_roles();