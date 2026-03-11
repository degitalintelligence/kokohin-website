
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function runDebug() {
    console.log('--- FETCHING LATEST MESSAGES ---');
    const { data: messages, error } = await supabase
        .from('wa_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    if (!messages || messages.length === 0) {
        console.log('No messages found.');
        return;
    }

    console.log(`Found ${messages.length} messages.`);
    messages.forEach((msg, idx) => {
        console.log(`\n--- Message ${idx + 1} ---`);
        console.log('ID:', msg.id);
        console.log('Body:', msg.body);
        console.log('Direction:', msg.direction);
        console.log('Type:', msg.type);
        console.log('Raw Payload (Keys):', msg.raw_payload ? Object.keys(msg.raw_payload) : 'NULL');
        if (msg.raw_payload) {
            const p = msg.raw_payload;
            console.log('NotifyName:', p.notifyName);
            console.log('SenderName:', p.senderName);
            console.log('From:', p.from);
            console.log('Author:', p.author);
            console.log('Participant:', p.participant);
            console.log('_data keys:', p._data ? Object.keys(p._data) : 'NULL');
            if (p._data) {
                console.log('_data.notifyName:', p._data.notifyName);
                console.log('_data.senderName:', p._data.senderName);
            }
        }
    });
}

runDebug().catch(console.error);
