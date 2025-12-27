const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAll(table) {
  console.log(`Deleting all from ${table}...`);
  // Supabase delete requires a filter. neq('id', '00000000-0000-0000-0000-000000000000') is a hack to match all UUIDs,
  // but some IDs might be text.
  // safer is to use a column that always exists and is not null.
  // For 'products', 'id' is UUID.
  // For 'picking_tasks', 'id' is text.
  
  // We can use .neq('id', 'placeholder') if id is text/uuid.
  
  try {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    // This might fail if id is not UUID for some tables?
    // picking_tasks id is text. '000...000' works as text too.
    
    if (error) {
       // If filter fails, try another strategy or specific filter
       console.error(`Error deleting from ${table}:`, error.message);
       // Try deleting with id NOT NULL
       const { error: err2 } = await supabase.from(table).delete().not('id', 'is', null);
       if (err2) throw err2;
    }
    console.log(`Deleted ${table}`);
  } catch (e) {
    console.error(`Failed to delete ${table}:`, e.message);
  }
}

async function main() {
  // Order matters due to constraints if not cascading
  await deleteAll('reception_appointment_orders');
  await deleteAll('reception_appointments');
  await deleteAll('purchase_order_items');
  await deleteAll('purchase_orders');
  await deleteAll('sales_order_items');
  await deleteAll('sales_orders');
  await deleteAll('picking_tasks');
  await deleteAll('inventory_movements');
  await deleteAll('inventory');
  await deleteAll('products');
  
  console.log('Cleanup complete.');
}

main();
