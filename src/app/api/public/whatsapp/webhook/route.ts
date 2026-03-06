import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { errorResponse } from '@/lib/api-response';

function mapAckToStatus(ack: number): 'sent' | 'delivered' | 'read' | 'failed' {
    if (ack >= 3) return 'read';
    if (ack === 2) return 'delivered';
    if (ack === 1 || ack === 0) return 'sent';
    return 'failed';
}

function toEventId(data: Record<string, unknown>): string | null {
    const directId = typeof data.id === 'string' ? data.id : null;
    if (directId) return directId;
    const message = data.message && typeof data.message === 'object' ? (data.message as Record<string, unknown>) : null;
    return message && typeof message.id === 'string' ? message.id : null;
}

function toEpochMilliseconds(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? value : value * 1000;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed > 1_000_000_000_000 ? parsed : parsed * 1000;
    }
    return Date.now();
}

async function createWebhookClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRole) {
        return createSupabaseAdminClient(supabaseUrl, serviceRole);
    }
    return createClient();
}

export async function GET(req: Request) {
    const secret = process.env.WAHA_WEBHOOK_SECRET || '';
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const challenge = url.searchParams.get('challenge');
    if (!secret) {
        return errorResponse('INTERNAL_ERROR', 'Webhook secret is not configured', 500);
    }
    if (token !== secret) {
        return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }
    return NextResponse.json({ success: true, verified: true, challenge: challenge ?? null });
}

export async function POST(req: Request) {
    const secret = process.env.WAHA_WEBHOOK_SECRET || '';
    if (!secret) {
        return errorResponse('INTERNAL_ERROR', 'Webhook secret is not configured', 500);
    }
    try {
        const headerSecret = req.headers.get('X-Webhook-Secret') || req.headers.get('x-webhook-secret') || '';
        if (headerSecret !== secret) {
            return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
        }

        const body = (await req.json()) as { event?: unknown; payload?: unknown };
        const event = typeof body.event === 'string' ? body.event : '';
        const data = body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : {};
        const eventId = toEventId(data);
        const supabase = await createWebhookClient();

        const webhookLogResult = await supabase
            .from('wa_webhook_events')
            .upsert(
                {
                    event_name: event || 'unknown',
                    external_event_id: eventId,
                    payload: data,
                    status: 'received',
                },
                { onConflict: 'event_name,external_event_id' }
            )
            .select('id')
            .maybeSingle();
        const webhookLogId = webhookLogResult.data?.id ?? null;

        if (event === 'message') {
            const from = typeof data.from === 'string' ? data.from : '';
            const to = typeof data.to === 'string' ? data.to : '';
            const bodyText = typeof data.body === 'string' ? data.body : null;
            const type = typeof data.type === 'string' ? data.type : 'chat';
            const fromMe = Boolean(data.fromMe);
            const ack = typeof data.ack === 'number' ? data.ack : 0;
            const timestampMs = toEpochMilliseconds(data.timestamp);
            const sentAtIso = new Date(timestampMs).toISOString();
            const waJid = fromMe ? to : from;

            const { data: contact, error: contactError } = await supabase
                .from('wa_contacts')
                .upsert(
                    {
                        wa_jid: waJid,
                        phone: waJid.split('@')[0]?.replace(/\D/g, '') || null,
                        display_name: typeof data.notifyName === 'string' ? data.notifyName : null,
                        last_message_at: sentAtIso,
                    },
                    { onConflict: 'wa_jid' }
                )
                .select('id')
                .single();
            if (contactError) throw contactError;

            const { data: chat, error: chatError } = await supabase
                .from('wa_chats')
                .upsert(
                    {
                        contact_id: contact.id,
                        unread_count: fromMe ? 0 : 1,
                        last_message_at: sentAtIso,
                    },
                    { onConflict: 'contact_id' }
                )
                .select('id')
                .single();
            if (chatError) throw chatError;

            const messageStatus = mapAckToStatus(ack);
            const messageUpsert = await supabase
                .from('wa_messages')
                .upsert(
                    {
                        external_message_id: eventId || crypto.randomUUID(),
                        chat_id: chat.id,
                        body: bodyText,
                        type,
                        direction: fromMe ? 'outbound' : 'inbound',
                        sender_type: fromMe ? 'agent' : 'customer',
                        status: messageStatus,
                        sent_at: sentAtIso,
                        delivered_at: messageStatus === 'delivered' || messageStatus === 'read' ? sentAtIso : null,
                        read_at: messageStatus === 'read' ? sentAtIso : null,
                        raw_payload: data,
                    },
                    { onConflict: 'external_message_id' }
                )
                .select('id, created_at, sent_at')
                .single();
            if (messageUpsert.error) throw messageUpsert.error;

            await supabase.from('wa_message_status_log').insert({
                message_id: messageUpsert.data.id,
                status: messageStatus,
                occurred_at: sentAtIso,
                source: 'waha',
            });

            const media = data.media && typeof data.media === 'object' ? (data.media as Record<string, unknown>) : null;
            if (media) {
                await supabase.from('wa_message_media').upsert({
                    message_id: messageUpsert.data.id,
                    media_type: type,
                    mime_type: typeof media.mimetype === 'string' ? media.mimetype : null,
                    storage_key: typeof media.url === 'string' ? media.url : null,
                    size_bytes: typeof media.filesize === 'number' ? media.filesize : null,
                });
            }

            const createdAt = new Date(messageUpsert.data.created_at as string).getTime();
            const sentAt = new Date(messageUpsert.data.sent_at as string).getTime();
            if (createdAt && sentAt && sentAt - createdAt > 3000) {
                await supabase.from('wa_delivery_anomalies').insert({
                    message_id: messageUpsert.data.id,
                    anomaly_type: 'delayed_dashboard_delivery',
                    severity: 'high',
                    details: {
                        latency_ms: sentAt - createdAt,
                        threshold_ms: 3000,
                    },
                });
            }
        }

        if (event === 'message.ack') {
            const id = toEventId(data);
            if (id) {
                const ack = typeof data.ack === 'number' ? data.ack : -1;
                const status = mapAckToStatus(ack);
                const timestampIso = new Date(toEpochMilliseconds(data.timestamp)).toISOString();
                const updateResult = await supabase
                    .from('wa_messages')
                    .update({
                        status,
                        delivered_at: status === 'delivered' || status === 'read' ? timestampIso : null,
                        read_at: status === 'read' ? timestampIso : null,
                    })
                    .eq('external_message_id', id)
                    .select('id')
                    .maybeSingle();
                if (updateResult.data?.id) {
                    await supabase.from('wa_message_status_log').insert({
                        message_id: updateResult.data.id,
                        status,
                        occurred_at: timestampIso,
                        source: 'waha_ack',
                    });
                }
            }
        }

        if (event === 'session.status') {
            const name = typeof data.name === 'string' ? data.name : process.env.WAHA_SESSION_ID || 'default';
            const status = typeof data.status === 'string' ? data.status : 'UNKNOWN';
            await supabase.from('wa_sessions').upsert(
                {
                    session_name: name,
                    status,
                    qr_state: typeof data.qr === 'string' ? 'available' : null,
                    health_meta: data,
                    last_connected_at: status === 'WORKING' ? new Date().toISOString() : null,
                },
                { onConflict: 'session_name' }
            );
        }

        if (webhookLogId) {
            await supabase
                .from('wa_webhook_events')
                .update({ processed_at: new Date().toISOString(), status: 'processed' })
                .eq('id', webhookLogId);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Webhook error:', error);
        return errorResponse('INTERNAL_ERROR', 'Internal server error', 500, error instanceof Error ? error.message : null);
    }
}
