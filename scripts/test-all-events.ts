
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
function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toWebhookEnvelope(body: unknown): { event: string; data: Record<string, unknown> } {
    const rawBody = toRecord(body);
    const bodyPayload = toRecord(rawBody.payload);
    const nestedPayload = toRecord(bodyPayload.payload);
    const bodyData = toRecord(rawBody.data);
    
    const event = (rawBody.event || rawBody.eventName || rawBody.type || bodyPayload.event || '') as string;
    
    const data = Object.keys(nestedPayload).length > 0 ? nestedPayload : 
                 Object.keys(bodyPayload).length > 0 && !('event' in bodyPayload) ? bodyPayload : 
                 Object.keys(bodyData).length > 0 ? bodyData : rawBody;
    
    return { event, data };
}

// --- Main Simulation ---

async function main() {
    console.log('--- Verifying 29 Webhook Events ---');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('ERROR: Missing Supabase URL or Service Role Key in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const eventsToTest = [
        'session.status', 'message', 'message.any', 'message.reaction', 'message.ack',
        'message.ack.group', 'message.waiting', 'message.revoked', 'message.edited',
        'chat.archive', 'group.v2.join', 'group.v2.leave', 'group.v2.update',
        'group.v2.participants', 'group.join', 'group.leave', 'presence.update',
        'poll.vote', 'poll.vote.failed', 'call.received', 'call.accepted',
        'call.rejected', 'label.upsert', 'label.deleted', 'label.chat.added',
        'label.chat.deleted', 'event.response', 'event.response.failed', 'engine.event'
    ];

    let passedCount = 0;
    const failedEvents: string[] = [];

    for (const eventName of eventsToTest) {
        const testEventId = `test-event-${eventName}-${Date.now()}`;
        const mockPayload = {
            event: eventName,
            payload: {
                id: testEventId,
                mockData: `Data for ${eventName}`
            }
        };

        try {
            const { event, data } = toWebhookEnvelope(mockPayload);
            
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
                console.error(`FAIL: ${eventName} upsert failed:`, webhookLogResult.error.message);
                failedEvents.push(eventName);
            } else {
                // console.log(`PASS: ${eventName}`);
                passedCount++;
                // Cleanup
                await supabase.from('wa_webhook_events').delete().eq('id', webhookLogResult.data.id);
            }

        } catch (error: unknown) {
            console.error(`FAIL: ${eventName} exception:`, error);
            failedEvents.push(eventName);
        }
    }

    console.log(`\nResults: ${passedCount}/${eventsToTest.length} passed.`);
    if (failedEvents.length > 0) {
        console.error('Failed events:', failedEvents);
        process.exit(1);
    } else {
        console.log('✅ ALL EVENTS SUPPORTED AND SAVED SUCCESSFULLY');
    }
}

main().catch(console.error);
