
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const supabaseUrl = 'https://supabase.kokohin.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE1ODczODYsImV4cCI6MTkyOTI2NzM4Nn0.HEfu-GIF3uFMk9qnKh7h0x5SS5Ux9g1LhlzwSpXJaqI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Searching for messages with LID participant...');
  
  const { data: messages, error: msgError } = await supabase
    .from('wa_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50); // Fetch last 50 messages

  if (msgError || !messages || messages.length === 0) {
    console.error('Error fetching messages:', msgError);
    return;
  }

  console.log(`Fetched ${messages.length} messages. Filtering for LID...`);

  const lidMessage = messages.find(m => {
      const p = m.raw_payload as any;
      return (p.participant && p.participant.includes('@lid')) || 
             (p.author && p.author.includes('@lid')) ||
             (p._data && p._data.participant && p._data.participant.includes('@lid'));
  });

  if (!lidMessage) {
      console.log('No LID message found in recent 50 messages.');
      return;
  }

  console.log('Found LID message!');
  const payload = lidMessage.raw_payload as any;
  
  console.log('--- Message ---');
  console.log(`ID: ${lidMessage.id}`);
  console.log(`Participant: ${payload.participant}`);
  console.log(`Author: ${payload.author}`);
  
  // Dump full payload to a file for inspection
  const dumpFile = path.resolve(process.cwd(), 'scripts/payload_dump.json');
  fs.writeFileSync(dumpFile, JSON.stringify(payload, null, 2));
  console.log(`Full payload dumped to: ${dumpFile}`);
}

main().catch(console.error);
