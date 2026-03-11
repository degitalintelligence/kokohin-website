
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const lid = '238452406808763@lid'; 
  console.log(`Checking contact info for LID: ${lid}`);

  const { data: contact, error } = await supabase
    .from('wa_contacts')
    .select('*')
    .eq('wa_jid', lid) 
    .maybeSingle();

  if (contact) {
    console.log('Contact found by wa_jid:', contact);
  } else {
    console.log('Contact NOT found by wa_jid:', lid);
  }
}

main().catch(console.error);
