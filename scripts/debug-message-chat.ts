
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Get a message to see its chat_id
  const { data: messages, error } = await supabase
    .from('wa_messages')
    .select('id, chat_id, raw_payload')
    .limit(1);

  if (error || !messages || messages.length === 0) {
    console.error('Error fetching messages:', error);
    return;
  }

  const msg = messages[0];
  console.log('Message ID:', msg.id);
  console.log('Chat ID:', msg.chat_id);

  // 2. Try to fetch the chat by this ID
  if (msg.chat_id) {
    const { data: chat, error: chatError } = await supabase
        .from('wa_chats')
        .select('*')
        .eq('id', msg.chat_id)
        .maybeSingle();

    if (chatError) {
        console.error('Error fetching chat:', chatError);
    } else if (chat) {
        console.log('Chat found:', chat);
    } else {
        console.log('Chat NOT found with ID:', msg.chat_id);
    }
  }
}

main().catch(console.error);
