
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectSystem() {
  console.log('--- Inspecting Connector "wq1" ---');
  const { data: connectors, error: cErr } = await supabase
    .from('erp_connectors')
    .select('*')
    .ilike('name', '%wq1%');
  
  if (cErr) console.error('Error fetching connectors:', cErr);
  else {
    connectors.forEach(c => {
      console.log(`Connector: ${c.name} (ID: ${c.id})`);
      console.log(`  Direction: ${c.connection_settings?.direction || 'N/A'}`);
      console.log(`  Settings:`, JSON.stringify(c.connection_settings, null, 2));
    });
  }

  console.log('\n--- Inspecting Purchase Orders (Recepcion) ---');
  const { data: pos, error: pErr } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (pErr) console.error('Error fetching POs:', pErr);
  else {
    console.log(`Total POs found: ${pos.length}`);
    pos.forEach(p => console.log(`  PO: ${p.po_number} (ID: ${p.id}) - Status: ${p.status}`));
  }

  console.log('\n--- Inspecting Sales Orders (Envio/Empaquetado) ---');
  const { data: sos, error: sErr } = await supabase
    .from('sales_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sErr) console.error('Error fetching SOs:', sErr);
  else {
    console.log(`Total SOs found: ${sos.length}`);
    sos.forEach(s => console.log(`  SO: ${s.so_number} (ID: ${s.id}) - Status: ${s.status}`));
  }
}

inspectSystem();
