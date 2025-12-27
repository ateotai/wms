
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventory() {
  // 1. Get Product ID
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('sku', 'SKU002');
  
  if (pError || !products.length) {
    console.error('Product not found or error:', pError);
    return;
  }
  
  const product = products[0];
  console.log('Product:', product);

  // 2. Get Inventory
  const { data: inventory, error: iError } = await supabase
    .from('inventory')
    .select('*, locations(*)')
    .eq('product_id', product.id);

  if (iError) {
    console.error('Inventory Error:', iError);
  } else {
    console.log('Inventory Records:', JSON.stringify(inventory, null, 2));
  }
}

checkInventory();
