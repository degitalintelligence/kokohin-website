
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: chats, error } = await supabase
    .from('wa_chats')
    .select('wa_jid, id')
    .limit(10);

  if (chats) {
    console.log('Chats found:', chats);
  } else {
    console.log('No chats found.');
  }
}

main().catch(console.error);
