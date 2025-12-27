
require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTriplicates() {
  console.log('Fixing triplicated quantities...');

  // Fix SKU001 in GENERAL
  const { error: err1 } = await supabase
    .from('inventory')
    .update({ quantity: 50 })
    .eq('id', '860da366-42b4-4aaa-ae50-e3e8e87f3415');

  if (err1) console.error('Error updating SKU001:', err1);
  else console.log('Updated SKU001 (GENERAL) to 50');

  // Fix SKU002 in A-01-01
  const { error: err2 } = await supabase
    .from('inventory')
    .update({ quantity: 20 })
    .eq('id', '786e72b7-680d-48bf-9d65-0b9755871260');

  if (err2) console.error('Error updating SKU002:', err2);
  else console.log('Updated SKU002 (A-01-01) to 20');
}

fixTriplicates();
