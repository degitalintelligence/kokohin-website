
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

async function runAudit() {
    console.log('--- STARTING WA_ UPSERT AUDIT ---\n');

    const results: Record<string, any> = {};

    // 1. wa_contacts (Unique: wa_jid)
    await testUpsert(
        'wa_contacts',
        {
            wa_jid: '628999999999@c.us',
            phone: '628999999999',
            display_name: 'Audit Test Contact',
        },
        'wa_jid',
        results
    );

    // 2. wa_chats (Unique: contact_id)
    // Need a valid contact_id first
    const { data: contact } = await supabase.from('wa_contacts').select('id').eq('wa_jid', '628999999999@c.us').single();
    if (contact) {
        await testUpsert(
            'wa_chats',
            {
                contact_id: contact.id,
                type: 'individual',
                unread_count: 0,
            },
            'contact_id',
            results
        );
    } else {
        console.error('Skipping wa_chats test: Contact not found');
    }

    // 3. wa_messages (Unique: external_message_id)
    // Need a valid chat_id
    const { data: chat } = await supabase.from('wa_chats').select('id').eq('contact_id', contact?.id).single();
    if (chat) {
        const msgId = `audit-msg-${Date.now()}`;
        await testUpsert(
            'wa_messages',
            {
                external_message_id: msgId,
                chat_id: chat.id,
                body: 'Audit Test Message',
                direction: 'inbound',
                status: 'received',
                sent_at: new Date().toISOString(),
            },
            'external_message_id',
            results
        );

        // 4. wa_message_media (Unique: message_id)
        // Test upsert WITH onConflict (now fixed in code and DB)
        console.log(`\nTesting wa_message_media (onConflict: message_id)...`);
        const { data: msg } = await supabase.from('wa_messages').select('id').eq('external_message_id', msgId).single();
        if (msg) {
            const mediaPayload = {
                message_id: msg.id,
                media_type: 'image',
                mime_type: 'image/jpeg',
                size_bytes: 1234,
            };

            await testUpsert(
                'wa_message_media',
                mediaPayload,
                'message_id',
                results
            );
        }
    }

    // 5. wa_sessions (Unique: session_name)
    await testUpsert(
        'wa_sessions',
        {
            session_name: 'audit_session_test',
            status: 'STOPPED',
            qr_state: 'available',
        },
        'session_name',
        results
    );

    // 6. wa_group_members (Unique: chat_id, contact_id)
    if (chat && contact) {
        await testUpsert(
            'wa_group_members',
            {
                chat_id: chat.id,
                contact_id: contact.id,
                role: 'member',
            },
            'chat_id, contact_id',
            results
        );
    }

    // 7. wa_webhook_events (Unique: event_name, external_event_id)
    await testUpsert(
        'wa_webhook_events',
        {
            event_name: 'audit.test',
            external_event_id: `audit-evt-${Date.now()}`,
            payload: { test: true },
            status: 'received',
        },
        'event_name, external_event_id',
        results
    );

    // Cleanup
    console.log('\n--- Cleaning up Test Data ---');
    if (contact) await supabase.from('wa_contacts').delete().eq('id', contact.id); // Cascade should delete chat, messages, media
    await supabase.from('wa_sessions').delete().eq('session_name', 'audit_session_test');
    await supabase.from('wa_webhook_events').delete().eq('event_name', 'audit.test');

    console.log('\n--- AUDIT SUMMARY ---');
    console.table(results);
}

async function testUpsert(table: string, payload: any, conflictTarget: string, results: any) {
    console.log(`Testing ${table} (onConflict: ${conflictTarget})...`);
    const start = performance.now();
    
    // First Upsert (Insert)
    const { error: err1 } = await supabase.from(table).upsert(payload, { onConflict: conflictTarget });
    if (err1) {
        console.error(`❌ Error on 1st upsert ${table}:`, err1.message);
        results[table] = { status: 'FAILED', error: err1.message };
        return;
    }

    // Second Upsert (Update/Idempotency)
    const { error: err2 } = await supabase.from(table).upsert(payload, { onConflict: conflictTarget });
    const end = performance.now();
    
    if (err2) {
        console.error(`❌ Error on 2nd upsert ${table}:`, err2.message);
        results[table] = { status: 'FAILED', error: err2.message };
        return;
    }

    const timeMs = end - start;
    console.log(`✅ ${table} OK. Time: ${timeMs.toFixed(2)}ms`);
    results[table] = { status: 'SUCCESS', timeMs: Math.round(timeMs) };
}

runAudit().catch(console.error);
