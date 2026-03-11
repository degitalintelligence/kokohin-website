
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Query to get list of tables? No direct API for schema inspection via client.
  // But we can guess or try to insert/select from known tables.
  
  // Let's try to see if there is a 'wa_group_participants' table by selecting from it.
  const { data, error } = await supabase
    .from('wa_group_participants')
    .select('*')
    .limit(1);

  if (error) {
    console.log('wa_group_participants table check failed:', error.message);
  } else {
    console.log('wa_group_participants exists!');
  }

  // Check 'wa_participants'
  const { data: pData, error: pError } = await supabase
    .from('wa_participants')
    .select('*')
    .limit(1);

  if (pError) {
    console.log('wa_participants table check failed:', pError.message);
  } else {
    console.log('wa_participants exists!');
  }
}

main().catch(console.error);
