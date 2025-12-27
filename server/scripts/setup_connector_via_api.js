
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    console.log('Updating existing connectors to inbound...');
    // Fetch all connectors first to iterate and update (since update with jsonb_set is tricky via JS client without RPC)
    // Actually, we can just fetch all and update those missing direction.
    const { data: connectors, error: fetchErr } = await supabase
      .from('erp_connectors')
      .select('*');

    if (fetchErr) throw fetchErr;

    for (const c of connectors || []) {
      const settings = c.connection_settings || {};
      if (!settings.direction) {
        settings.direction = 'inbound';
        await supabase
          .from('erp_connectors')
          .update({ connection_settings: settings })
          .eq('id', c.id);
        console.log(`Updated connector ${c.name} to inbound`);
      }
    }

    console.log('Checking for outbound connector...');
    const endpoint = 'http://localhost:3001/b1s/v1/PurchaseOrders/Acknowledge';
    const { data: existing, error: checkErr } = await supabase
      .from('erp_connectors')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      console.log('Outbound connector already exists. Deleting it to recreate with exact configuration...');
      await supabase.from('erp_connectors').delete().eq('id', existing.id);
    }
    
    console.log('Creating outbound connector with exact requested configuration...');
    const { error: insertErr } = await supabase
      .from('erp_connectors')
      .insert({
        name: 'SAP B1 Confirmación Recepción',
        type: 'SAP B1',
        endpoint: endpoint,
        username: 'manager',
        status: 'active',
        is_active: true,
        sync_interval: 0,
        sync_type: 'automatic',
        connection_settings: {
          direction: 'outbound',
          supportedTargets: ['purchase_orders'],
          event: 'reception_completed',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      });
    if (insertErr) throw insertErr;
    console.log('Outbound connector created successfully.');


  } catch (e) {
    console.error('Error:', e);
  }
}

run();
