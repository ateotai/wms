
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Client } = require('pg');

async function test() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  console.log('Testing DB connection to:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'undefined');
  
  if (!dbUrl) {
    console.error('No DB URL found');
    return;
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time:', res.rows[0]);
    await client.end();
  } catch (e) {
    console.error('Connection failed:', e);
  }
}

test();
