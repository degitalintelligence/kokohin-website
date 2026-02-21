
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStoragePolicy() {
  console.log('Attempting to create storage policy using SQL via RPC (if enabled) or logging instruction...');
  
  // Since we cannot easily execute raw SQL via JS client without RPC function,
  // and we don't have direct SQL access here easily.
  // We will try to rely on the user following the manual instructions provided in chat.
  // But let's check if we can list policies (usually not via JS client).
  
  console.log('--- MANUAL ACTION REQUIRED ---');
  console.log('The error "new row violates row-level security policy" confirms the bucket exists but lacks write permission.');
  console.log('Please go to Supabase Dashboard > Storage > images > Configuration > Policies.');
  console.log('Add a new policy:');
  console.log('1. Name: "Enable Uploads"');
  console.log('2. Allowed operations: INSERT, UPDATE, SELECT');
  console.log('3. Target roles: authenticated (or public if you want)');
  console.log('------------------------------');
}

createStoragePolicy();
