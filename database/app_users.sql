-- =====================================================
-- Tabla de usuarios controlados por el sistema (sin Supabase Auth)
-- Solo para desarrollo. No usar en producción tal cual.
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null, -- SOLO DEV: en producción usar hash/bcrypt
  full_name text,
  role text not null default 'OPERATOR',
  is_active boolean not null default true,
  permissions jsonb default '[]'::jsonb,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- Usuario de ejemplo
insert into public.app_users (email, password, full_name, role)
values ('admin@demo.local', 'admin123', 'Admin Demo', 'ADMIN')
on conflict (email) do nothing;