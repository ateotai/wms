
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  const { data, error } = await supabase.rpc('get_tables'); 
  // If rpc doesn't exist, we might fail. 
  // But wait, Supabase JS client doesn't have a direct 'list tables' method for public schema easily without permissions on information_schema.
  // Let's try to infer from a known list of likely tables if we can't query schema.
  
  // Actually, I can just try to select from a bunch of likely names.
  const candidates = [
    'orders', 
    'shipments', 
    'outbound_orders', 
    'picking_orders',
    'transfer_orders',
    'shipping_orders',
    'mock_orders'
  ];

  for (const table of candidates) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${table}`);
      // Check for test data
      const { data: testData } = await supabase.from(table).select('*').ilike('order_number', '%TEST%').limit(5);
       if (testData && testData.length > 0) {
         console.log(`FOUND TEST DATA IN: ${table}`);
         console.log(testData);
       }
    }
  }
}

// Another way is to try to read the codebase to see where "Órdenes de Envío" comes from.
// I'll assume the user is running the code in the 'src' folder.
// I'll search for the text "Órdenes de Envío" in the codebase.

listAllTables();
