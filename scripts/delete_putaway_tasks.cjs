
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env vars
const envPath = path.resolve(__dirname, '../server/.env');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deletePutawayTasks() {
  console.log('Deleting tasks with customer "Acomodo"...');
  
  // First, get the IDs to confirm
  const { data: tasks, error: fetchError } = await supabase
    .from('picking_tasks')
    .select('id, orderNumber, customer')
    .ilike('customer', '%Acomodo%');
    
  if (fetchError) {
    console.error('Error fetching tasks:', fetchError);
    return;
  }
  
  console.log(`Found ${tasks.length} putaway tasks.`);
  
  if (tasks.length === 0) {
    console.log('No tasks to delete.');
    return;
  }

  const ids = tasks.map(t => t.id);
  
  const { error: deleteError } = await supabase
    .from('picking_tasks')
    .delete()
    .in('id', ids);
    
  if (deleteError) {
    console.error('Error deleting tasks:', deleteError);
  } else {
    console.log(`Successfully deleted ${tasks.length} tasks.`);
  }
}

deletePutawayTasks();
