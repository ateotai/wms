/**
 * Migración de esquema: agrega columnas faltantes en public.picking_tasks.
 *
 * Ejecución:
 * 1) Configura la variable de entorno `DATABASE_URL` (cadena de conexión Postgres)
 *    Ejemplo Supabase: postgres://postgres:<DB_PASSWORD>@db.<your-ref>.supabase.co:5432/postgres
 * 2) Instala dependencias: `npm i`
 * 3) Ejecuta: `npm run migrate:picking_tasks`
 *
 * Nota: Supabase PostgREST no permite DDL; este script usa conexión directa a Postgres.
 */
const { Client } = require('pg');

async function migrate() {
  const cn =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL;
  if (!cn) {
    console.error(
      '[migrate_picking_tasks] Faltan variables de conexión. Define `DATABASE_URL` para ejecutar la migración.\n' +
      'Alternativa: usa el SQL en database/migrate_picking_tasks_add_missing_columns.sql en el editor SQL de Supabase.'
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: cn });
  await client.connect();
  console.log('[migrate_picking_tasks] Conectado. Aplicando migración…');

  const statements = [
    `create table if not exists public.picking_tasks (id text primary key, orderNumber text not null)`,
    `alter table public.picking_tasks add column if not exists customer text`,
    `alter table public.picking_tasks add column if not exists priority text`,
    `alter table public.picking_tasks add column if not exists status text`,
    `alter table public.picking_tasks add column if not exists assignedTo text`,
    `alter table public.picking_tasks add column if not exists zone text`,
    `alter table public.picking_tasks add column if not exists location text`,
    `alter table public.picking_tasks add column if not exists items jsonb default '[]'::jsonb`,
    `alter table public.picking_tasks add column if not exists estimatedTime integer default 10`,
    `alter table public.picking_tasks add column if not exists actualTime integer`,
    `alter table public.picking_tasks add column if not exists createdAt timestamptz default now()`,
    `alter table public.picking_tasks add column if not exists dueDate timestamptz`,
    `alter table public.picking_tasks add column if not exists notes text`,
    `alter table public.picking_tasks add column if not exists originZone text`,
    `alter table public.picking_tasks add column if not exists destinationZone text`,
    `alter table public.picking_tasks add column if not exists creator text`,
    `create index if not exists idx_picking_tasks_status on public.picking_tasks(status)`,
    `create index if not exists idx_picking_tasks_created_at on public.picking_tasks(createdAt desc)`,
    `create index if not exists idx_picking_tasks_assigned_to on public.picking_tasks(assignedTo)`,
    `create index if not exists idx_picking_tasks_order_number on public.picking_tasks(orderNumber)`,
    `alter table public.picking_tasks enable row level security`
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log('[OK]', sql);
    } catch (e) {
      console.warn('[WARN]', sql, '=>', e.message);
    }
  }

  await client.end();
  console.log('[migrate_picking_tasks] Migración completada.');
}

migrate().catch((e) => {
  console.error('[migrate_picking_tasks] Error general:', e);
  process.exit(1);
});