
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
  
  console.log('--- Sales Orders Columns ---');
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_orders'");
  console.log(JSON.stringify(res.rows, null, 2));
  
  console.log('--- Sales Order Items Table? ---');
  const resItems = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'sales_order_items'");
  console.log(JSON.stringify(resItems.rows, null, 2));

  await client.end();
}
check();
