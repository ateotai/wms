
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInventory() {
  console.log('Fixing Inventory to match User Expectations...');

  // 1. Get Warehouse
  const { data: wh } = await supabase.from('warehouses').select('id').limit(1).single();
  const warehouse_id = wh.id;

  // 2. Ensure "Storage" Location exists
  let { data: loc } = await supabase
    .from('locations')
    .select('id')
    .eq('code', 'A-01-01')
    .single();

  if (!loc) {
    console.log('Creating Storage Location A-01-01...');
    const { data: newLoc } = await supabase
      .from('locations')
      .insert({
        warehouse_id,
        code: 'A-01-01',
        name: 'Estantería A',
        location_type: 'picking', // Standard storage
        is_active: true
      })
      .select('id')
      .single();
    loc = newLoc;
  }

  // 3. Get Products
  const { data: products } = await supabase
    .from('products')
    .select('id, sku')
    .in('sku', ['SKU001', 'SKU002']);

  for (const p of products) {
    console.log(`Processing ${p.sku}...`);

    // Check if we already have "Stock" (picking/storage location)
    const { data: stockInv } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', p.id)
      .eq('location_id', loc.id);

    if (stockInv && stockInv.length > 0) {
      console.log(`- Stock already exists for ${p.sku}. Updating to 2.`);
      await supabase
        .from('inventory')
        .update({ quantity: 2 })
        .eq('id', stockInv[0].id);
    } else {
      console.log(`- Inserting 2 units of Stock for ${p.sku}.`);
      await supabase.from('inventory').insert({
        product_id: p.id,
        warehouse_id,
        location_id: loc.id,
        quantity: 2,
        last_movement_at: new Date().toISOString()
      });
    }
    
    // Check Quarantine items (VIRT) - Ensure they are there (user said "habia 2 en recepcion")
    // We assume the VIRT items exist from previous audit. We don't touch them, 
    // but we will change frontend logic to count them as RECEPTION.
  }
  
  console.log('Inventory Fix Complete.');
}

fixInventory();
