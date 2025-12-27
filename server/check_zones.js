
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('zones')
    .select('id, name')
    .limit(1);

  if (error) {
    console.error('Error checking zones table:', error);
  } else {
    console.log('Zones table exists. Found rows:', data.length);
  }
}

check();
