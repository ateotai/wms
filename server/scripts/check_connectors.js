
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('No DB URL');
    return;
  }
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT id, name, endpoint, connection_settings, is_active FROM public.erp_connectors");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
