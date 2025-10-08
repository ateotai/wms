-- =====================================================
-- Migración producción: mover password plano a password_hash (bcrypt/pgcrypto)
-- =====================================================

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists password_hash text;

-- Para filas existentes con columna password en texto plano
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'app_users' and column_name = 'password'
  ) then
    update public.app_users
      set password_hash = crypt(password, gen_salt('bf'))
      where password_hash is null and password is not null;
  end if;
end $$;

-- Eliminar columna de password en texto plano si existe
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'app_users' and column_name = 'password'
  ) then
    alter table public.app_users drop column password;
  end if;
end $$;

-- Índice opcional sobre email
create index if not exists idx_app_users_email on public.app_users (email);

select 'Migración de app_users a password_hash completada' as mensaje;