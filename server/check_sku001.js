
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventorySKU001() {
  const { data: products } = await supabase.from('products').select('id').eq('sku', 'SKU001');
  if (!products.length) return;
  const pid = products[0].id;

  const { data: inventory } = await supabase
    .from('inventory')
    .select('*, locations(*)')
    .eq('product_id', pid);

  console.log('SKU001 Inventory:', JSON.stringify(inventory, null, 2));
}

checkInventorySKU001();
