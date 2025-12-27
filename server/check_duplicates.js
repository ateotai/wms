
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const skus = ['SKU001', 'SKU002'];
  
  for (const sku of skus) {
    console.log(`\nChecking records for ${sku}...`);
    
    // Get product ID first
    const { data: products } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', sku)
      .single();
      
    if (!products) {
      console.log(`Product ${sku} not found`);
      continue;
    }

    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*, locations(name, code)')
      .eq('product_id', products.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      continue;
    }

    console.log(`Found ${inventory.length} records for ${sku}:`);
    inventory.forEach(item => {
      console.log(`- ID: ${item.id}`);
      console.log(`  Location: ${item.locations?.name || 'Unknown'} (${item.locations?.code})`);
      console.log(`  Qty: ${item.quantity}, Reserved: ${item.reserved_quantity}, Available: ${item.available_quantity}`);
      console.log(`  Created: ${item.created_at}`);
      console.log('---');
    });
  }
}

checkDuplicates();
