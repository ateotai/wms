
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStockZero() {
  console.log('Debugging Stock Zero Issue...');
  
  const { data: products } = await supabase.from('products').select('id, sku').in('sku', ['SKU001', 'SKU002']);
  
  for (const p of products) {
    console.log(`\n--- Product: ${p.sku} (${p.id}) ---`);
    const { data: inv, error } = await supabase
      .from('inventory')
      .select('id, quantity, location_id, locations(id, code, location_type)')
      .eq('product_id', p.id);
      
    if (error) {
      console.error('Error fetching inventory:', error);
      continue;
    }

    if (!inv || inv.length === 0) {
      console.log('No inventory found.');
      continue;
    }

    let calculatedStock = 0;
    let calculatedRecv = 0;

    for (const item of inv) {
      const qty = item.quantity;
      const loc = item.locations || {};
      const code = (loc.code || '').toUpperCase();
      const locType = (loc.location_type || '').toLowerCase();
      
      const isRecv = !item.location_id || locType === 'receiving' || code === 'RECV';
      
      console.log(`Inventory Item ID: ${item.id}`);
      console.log(`  Qty: ${qty}`);
      console.log(`  Location ID: ${item.location_id}`);
      console.log(`  Location Code: ${code}`);
      console.log(`  Location Type: ${locType}`);
      console.log(`  -> isRecv: ${isRecv}`);

      if (isRecv) {
        calculatedRecv += qty;
      } else {
        calculatedStock += qty;
      }
    }
    
    console.log(`\n  => Calculated Total Stock: ${calculatedStock}`);
    console.log(`  => Calculated Total Reception: ${calculatedRecv}`);
  }
}

debugStockZero();
