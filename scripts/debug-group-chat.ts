
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const groupJid = '120363303617978095@g.us'; 
  console.log(`Checking chat info for group: ${groupJid}`);

  const { data: chat, error } = await supabase
    .from('wa_chats')
    .select('*')
    .eq('wa_jid', groupJid) 
    .maybeSingle();

  if (chat) {
    console.log('Chat found:', chat);
    // Check if raw_data contains participants
    // Note: column name might be 'raw_data' or something else
  } else {
    console.log('Chat NOT found by wa_jid:', groupJid);
  }
}

main().catch(console.error);
