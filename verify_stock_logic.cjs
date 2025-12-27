
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStockLogic() {
  console.log('Verifying Stock Logic...');
  
  const { data: products } = await supabase.from('products').select('id, sku').in('sku', ['SKU001', 'SKU002']);
  
  for (const p of products) {
    const { data: inv } = await supabase
      .from('inventory')
      .select('quantity, location_id, locations(code, location_type)')
      .eq('product_id', p.id);
      
    let stock = 0;
    let reception = 0;
    
    console.log(`\nProduct: ${p.sku}`);
    for (const item of inv) {
      const qty = item.quantity;
      const loc = item.locations || {};
      const code = (loc.code || '').toUpperCase();
      const locType = (loc.location_type || '').toLowerCase();
      
      // Mimic ProductsTable.tsx logic
      const isRecv = !item.location_id || locType === 'receiving' || code === 'RECV';
      
      console.log(`  - Loc: ${code} (${locType}), Qty: ${qty} -> isRecv: ${isRecv}`);
      
      if (isRecv) {
        reception += qty;
      } else {
        stock += qty;
      }
    }
    
    console.log(`  => Total Stock: ${stock}`);
    console.log(`  => Total Reception: ${reception}`);
  }
}

verifyStockLogic();
