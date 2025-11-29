-- Crea la tabla de relación entre picking_batches y transfers
-- Permite identificar lotes creados a partir de traspasos

create table if not exists public.picking_batch_transfers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.picking_batches(id) on delete cascade,
  transfer_id uuid not null references public.transfers(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Índices para acelerar consultas por batch o transfer
create index if not exists picking_batch_transfers_batch_idx on public.picking_batch_transfers (batch_id);
create index if not exists picking_batch_transfers_transfer_idx on public.picking_batch_transfers (transfer_id);

comment on table public.picking_batch_transfers is 'Relación de lotes de picking con traspasos';