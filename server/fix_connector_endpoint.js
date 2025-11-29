// Fix ERP connector endpoint to backend mock for SAP
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or API key');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: connectors, error } = await supabase
    .from('erp_connectors')
    .select('id, type, endpoint, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  console.log('Connectors found:', connectors?.length || 0);
  const desiredPort = process.env.PORT || '8080';
  const desiredEndpointBase = `http://localhost:${desiredPort}/mock/sap`;

  for (const c of connectors || []) {
    const endpointStr = String(c.endpoint || '');
    let host = '';
    try { host = new URL(endpointStr).host; } catch {}
    const isMockSap = /\/mock\/sap$/i.test(endpointStr);
    const isDesired = host.endsWith(`:${desiredPort}`);
    const needsFix = isMockSap && !isDesired; // si es mock/sap y no apunta al puerto deseado, actualizar
    console.log(`- ${c.id} type=${c.type} endpoint=${c.endpoint} -> needsFix=${needsFix}`);
    if (needsFix) {
      const newEndpoint = desiredEndpointBase;
      const { error: updErr } = await supabase
        .from('erp_connectors')
        .update({ endpoint: newEndpoint })
        .eq('id', c.id);
      if (updErr) {
        console.error(`  Failed to update ${c.id}:`, updErr.message || updErr);
      } else {
        console.log(`  Updated endpoint -> ${newEndpoint}`);
      }
    }
  }

  console.log('Done.');
})();