
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
  
  console.log('--- Picking Tasks Columns ---');
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'picking_tasks'");
  console.log(JSON.stringify(res.rows, null, 2));
  
  await client.end();
}
check();
