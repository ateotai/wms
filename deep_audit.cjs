
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepAudit() {
  console.log('Deep Audit of SKU001 and SKU002...');
  
  const { data: products } = await supabase.from('products').select('id, sku').in('sku', ['SKU001', 'SKU002']);
  
  for (const p of products) {
    console.log(`\n=== PRODUCT: ${p.sku} (${p.id}) ===`);
    
    const { data: inv, error } = await supabase
      .from('inventory')
      .select('id, quantity, location_id, locations(id, code, location_type, name)')
      .eq('product_id', p.id);
      
    if (error) { console.error(error); continue; }
    
    let totalQty = 0;
    inv.forEach(i => {
      const loc = i.locations || {};
      console.log(`- Qty: ${i.quantity} | Loc: ${loc.code || 'NULL'} | Type: ${loc.location_type || 'N/A'} | Name: ${loc.name || 'N/A'} | LocID: ${i.location_id}`);
      totalQty += i.quantity;
    });
    console.log(`TOTAL DB QUANTITY: ${totalQty}`);
  }
}

deepAudit();
