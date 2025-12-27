
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Query to get all table names
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (error) {
    // If information_schema is not accessible via client, we try to infer from common names
    // or just list a few expected ones.
    console.error('Error fetching tables:', error);
  } else {
    console.log('Tables:', data.map(t => t.table_name));
  }
}

async function checkOrders() {
  console.log('Checking potential order tables...');
  
  const tables = ['orders', 'purchase_orders', 'sales_orders', 'shipments'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5);
      if (!error && data) {
        console.log(`\nTable '${table}': found ${data.length} records`);
        if (data.length > 0) console.log(data);
      }
    } catch (e) {
      // ignore
    }
  }
}

checkOrders();
