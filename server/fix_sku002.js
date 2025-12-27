
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSKU002() {
  const idsToDelete = [
    '8fa9c497-eec9-4a03-97c9-c77cc830cb03', // The 20 qty in RECV
    'ad53b54c-d440-4f36-9d20-a79ddea0e54a'  // The 20 reserved in RECV
  ];

  console.log('Deleting incorrect inventory records for SKU002...');
  
  const { error } = await supabase
    .from('inventory')
    .delete()
    .in('id', idsToDelete);

  if (error) {
    console.error('Error deleting records:', error);
  } else {
    console.log('Successfully deleted records:', idsToDelete);
  }
}

fixSKU002();
