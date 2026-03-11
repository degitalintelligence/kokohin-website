
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local manually
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

// --- Helper Functions from route.ts (Simplified) ---

function toSerializedId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object' && '_serialized' in value) return value._serialized as string;
    return null;
}

function toWebhookEnvelope(body: unknown): { event: string; data: Record<string, unknown> } {
    const rawBody = body as Record<string, unknown>;
    const bodyPayload = rawBody.payload as Record<string, unknown> || {};
    const nestedPayload = bodyPayload.payload as Record<string, unknown> || {};
    const bodyData = rawBody.data as Record<string, unknown> || {};
    
    const event = (rawBody.event || rawBody.eventName || rawBody.type || bodyPayload.event || '') as string;
    
    const data = Object.keys(nestedPayload).length > 0 ? nestedPayload : 
                 Object.keys(bodyPayload).length > 0 && !('event' in bodyPayload) ? bodyPayload : 
                 Object.keys(bodyData).length > 0 ? bodyData : rawBody;
    
    return { event, data };
}

// --- Main Simulation ---

async function main() {
    console.log('--- Verifying Webhook Flow ---');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('ERROR: Missing Supabase URL or Service Role Key in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEventId = '120363161234567890@g.us';
    const testParticipantId = '6281234567890@c.us';

    // Mock Payload for Group Join
    const mockPayload = {
        event: "group.join",
        payload: {
            id: testEventId,
            participants: [
                { id: testParticipantId, admin: null }
            ],
            group: {
                id: testEventId,
                subject: "Test Group Verification",
                participants: [
                   { id: testParticipantId, admin: null } 
                ]
            }
        }
    };

    console.log('Simulating Webhook Payload:', JSON.stringify(mockPayload, null, 2));

    let createdEventId: string | null = null;
    let createdChatId: string | null = null;

    try {
        const body = mockPayload;
        const { event, data } = toWebhookEnvelope(body);
        
        // 1. Log to wa_webhook_events
        console.log('Step 1: Upserting to wa_webhook_events...');
        const webhookLogResult = await supabase
            .from('wa_webhook_events')
            .upsert(
                {
                    event_name: event || 'unknown',
                    external_event_id: testEventId,
                    payload: data,
                    status: 'received',
                },
                { onConflict: 'event_name,external_event_id' }
            )
            .select('id')
            .single();

        if (webhookLogResult.error) {
            console.error('FAIL: wa_webhook_events upsert failed:', webhookLogResult.error);
            process.exit(1);
        }
        console.log('PASS: wa_webhook_events upsert successful. ID:', webhookLogResult.data.id);
        createdEventId = webhookLogResult.data.id;

        // 2. Process Group Logic
        console.log('Step 2: Processing Group Logic (Chat & Participants)...');
        
        // Upsert Contact
        const { data: groupContact, error: groupContactError } = await supabase
            .from('wa_contacts')
            .upsert(
                {
                    wa_jid: testEventId,
                    phone: testEventId.split('@')[0]?.replace(/\D/g, '') || null,
                    display_name: "Test Group Verification",
                    last_message_at: new Date().toISOString(),
                },
                { onConflict: 'wa_jid' }
            )
            .select('id')
            .single();
        
        if (groupContactError) {
            console.error('FAIL: Group Contact upsert failed:', groupContactError);
            process.exit(1);
        }

        // Upsert Chat
        const { data: chat, error: chatError } = await supabase
            .from('wa_chats')
            .upsert(
                {
                    contact_id: groupContact.id,
                    type: 'group',
                    last_message_at: new Date().toISOString(),
                    group_subject: "Test Group Verification",
                    group_owner_jid: null,
                },
                { onConflict: 'contact_id' }
            )
            .select('id')
            .single();
        
        if (chatError) {
            console.error('FAIL: Group Chat upsert failed:', chatError);
            process.exit(1);
        }
        console.log('PASS: Group Chat upsert successful. ID:', chat.id);
        createdChatId = chat.id;

        // Upsert Member
        const { data: memberContact, error: memberContactError } = await supabase
            .from('wa_contacts')
            .upsert(
                { wa_jid: testParticipantId, phone: '6281234567890' },
                { onConflict: 'wa_jid' }
            )
            .select('id')
            .single();

        if (memberContactError) {
             console.error('FAIL: Member Contact upsert failed:', memberContactError);
             process.exit(1);
        }

        const { error: memberUpsertError } = await supabase
            .from('wa_group_members')
            .upsert(
                {
                    chat_id: chat.id,
                    contact_id: memberContact.id,
                    role: 'member',
                    left_at: null,
                },
                { onConflict: 'chat_id,contact_id' }
            );

        if (memberUpsertError) {
            console.error('FAIL: wa_group_members upsert failed:', memberUpsertError);
            process.exit(1);
        }
        console.log('PASS: wa_group_members upsert successful.');

    } catch (error) {
        console.error('Unexpected Error:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('--- Cleanup ---');
        if (createdEventId) {
            await supabase.from('wa_webhook_events').delete().eq('id', createdEventId);
            console.log('Deleted test webhook event.');
        }
        if (createdChatId) {
            // Cascade delete should handle members, but let's be safe.
            // Actually, wa_group_members has ON DELETE CASCADE on chat_id.
            // wa_chats has ON DELETE CASCADE on contact_id? No, wa_chats references wa_contacts.
            // We should delete the chat.
            await supabase.from('wa_chats').delete().eq('id', createdChatId);
            console.log('Deleted test chat.');
            
            // Delete created contacts if needed (might affect other tests if shared, but these are unique JIDs)
            await supabase.from('wa_contacts').delete().eq('wa_jid', testEventId);
            await supabase.from('wa_contacts').delete().eq('wa_jid', testParticipantId);
            console.log('Deleted test contacts.');
        }
    }
    
    console.log('✅ VERIFICATION PASSED');
}

main().catch(console.error);
