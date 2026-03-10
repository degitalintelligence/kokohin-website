import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { errorResponse } from '@/lib/api-response';
import { sendMessageAction } from '@/app/actions/whatsapp';

function mapAckToStatus(ack: number): 'sent' | 'delivered' | 'read' | 'failed' {
    if (ack >= 3) return 'read';
    if (ack === 2) return 'delivered';
    if (ack === 1 || ack === 0) return 'sent';
    return 'failed';
}

function toEventId(data: Record<string, unknown>): string | null {
    const directId = toSerializedId(data.id);
    if (directId) return directId;
    const message = data.message && typeof data.message === 'object' ? (data.message as Record<string, unknown>) : null;
    return message ? toSerializedId(message.id) : null;
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

function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toSerializedId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value;
    const record = toRecord(value);
    const serialized = record._serialized;
    if (typeof serialized === 'string' && serialized.trim()) return serialized;
    const nestedId = record.id;
    if (nestedId && nestedId !== value) return toSerializedId(nestedId);
    return null;
}

function toWebhookEnvelope(body: unknown): { event: string; data: Record<string, unknown> } {
    const rawBody = toRecord(body);
    const bodyPayload = toRecord(rawBody.payload);
    const nestedPayload = toRecord(bodyPayload.payload);
    const bodyData = toRecord(rawBody.data);
    const bodyMessage = toRecord(rawBody.message);
    const event =
        (typeof rawBody.event === 'string' ? rawBody.event : null) ||
        (typeof rawBody.eventName === 'string' ? rawBody.eventName : null) ||
        (typeof rawBody.type === 'string' ? rawBody.type : null) ||
        (typeof bodyPayload.event === 'string' ? bodyPayload.event : null) ||
        '';

    const data = Object.keys(nestedPayload).length > 0
        ? nestedPayload
        : Object.keys(bodyPayload).length > 0 && !('event' in bodyPayload)
            ? bodyPayload
            : Object.keys(bodyData).length > 0
                ? bodyData
                : Object.keys(bodyMessage).length > 0
                    ? bodyMessage
                    : rawBody;

    return { event, data };
}

function resolveAutoReplyKeyword(body: string | null): string | null {
    if (!body) return null;
    const text = body.toLowerCase();
    if (text.includes('harga')) {
        return 'Untuk info harga dan penawaran resmi, silakan kirim detail kebutuhan (ukuran area, lokasi, dan tipe kanopi) agar tim Kokohin dapat menghitung estimasi yang paling tepat.';
    }
    if (text.includes('proyek')) {
        return 'Terkait status proyek Anda, mohon kirimkan nama atau ID proyek. Tim Kokohin akan cek progres terbaru dan menginformasikannya kembali.';
    }
    if (text.includes('kontak')) {
        return 'Anda dapat menghubungi tim Kokohin di jam kerja (09.00–17.00 WIB). Jika perlu respon cepat, kirimkan nama dan lokasi, kami akan segera follow up.';
    }
    return null;
}

async function createWebhookClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRole) {
        return createSupabaseAdminClient(supabaseUrl, serviceRole);
    }
    return createClient();
}

const ALLOW_UNAUTH =
    process.env.WAHA_WEBHOOK_ALLOW_UNAUTH === 'true' ||
    process.env.NODE_ENV === 'development';

export async function GET(req: Request) {
    const secret = process.env.WAHA_WEBHOOK_SECRET || '';
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const challenge = url.searchParams.get('challenge');
    if (!secret && !ALLOW_UNAUTH) {
        return errorResponse('INTERNAL_ERROR', 'Webhook secret is not configured', 500);
    }
    if (!ALLOW_UNAUTH && token !== secret) {
        return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }
    return NextResponse.json({ success: true, verified: true, challenge: challenge ?? null });
}

export async function POST(req: Request) {
    const secret = process.env.WAHA_WEBHOOK_SECRET || '';
    if (!secret && !ALLOW_UNAUTH) {
        return errorResponse('INTERNAL_ERROR', 'Webhook secret is not configured', 500);
    }
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        const headerSecret = req.headers.get('X-Webhook-Secret') || req.headers.get('x-webhook-secret') || '';
        const authHeader = req.headers.get('authorization') || '';
        const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        const authorized = ALLOW_UNAUTH || token === secret || headerSecret === secret || bearerToken === secret;

        if (!authorized && !ALLOW_UNAUTH) {
            const headerNames = Array.from(req.headers.keys());
            console.error('WAHA webhook unauthorized request', {
                hasToken: Boolean(token),
                headerNames,
                hasXWebhookSecret: Boolean(headerSecret),
                hasAuthorization: Boolean(authHeader),
            });
            return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
        }

        const body = await req.json();
        const { event, data } = toWebhookEnvelope(body);
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

        if (event === 'message' || event === 'message.any') {
            const messageRecord = toRecord(data.message);
            const from = toSerializedId(data.from) || toSerializedId(messageRecord.from) || '';
            const to = toSerializedId(data.to) || toSerializedId(messageRecord.to) || '';
            const bodyText =
                (typeof data.body === 'string' ? data.body : null) ||
                (typeof messageRecord.body === 'string' ? messageRecord.body : null);
            const type =
                (typeof data.type === 'string' ? data.type : null) ||
                (typeof messageRecord.type === 'string' ? messageRecord.type : null) ||
                'chat';
            const fromMe =
                typeof data.fromMe === 'boolean'
                    ? data.fromMe
                    : typeof messageRecord.fromMe === 'boolean'
                        ? messageRecord.fromMe
                        : false;
            const ack = typeof data.ack === 'number' ? data.ack : typeof data.ack === 'string' ? Number(data.ack) : 0;
            const timestampMs = toEpochMilliseconds(data.timestamp ?? messageRecord.timestamp);
            const sentAtIso = new Date(timestampMs).toISOString();
            const waJid = fromMe ? to : from;
            if (!waJid) {
                throw new Error('WAHA webhook payload missing wa_jid');
            }

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
            if (contactError) {
                console.error('WA Webhook contact upsert error:', contactError, { waJid });
                throw contactError;
            }

            const { data: chat, error: chatError } = await supabase
                .from('wa_chats')
                .upsert(
                    {
                        contact_id: contact.id,
                        last_message_at: sentAtIso,
                    },
                    { onConflict: 'contact_id' }
                )
                .select('id')
                .single();
            if (chatError) {
                console.error('WA Webhook chat upsert error:', chatError, { contactId: contact.id, waJid });
                throw chatError;
            }
            if (fromMe) {
                await supabase.from('wa_chats').update({ unread_count: 0 }).eq('id', chat.id);
            } else {
                const { data: currentChat } = await supabase
                    .from('wa_chats')
                    .select('unread_count')
                    .eq('id', chat.id)
                    .maybeSingle();
                const currentUnread = typeof currentChat?.unread_count === 'number' ? currentChat.unread_count : 0;
                await supabase.from('wa_chats').update({ unread_count: currentUnread + 1 }).eq('id', chat.id);
            }

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
            if (messageUpsert.error) {
                console.error('WA Webhook message upsert error:', messageUpsert.error, { chatId: chat.id, waJid, eventId });
                throw messageUpsert.error;
            }

            await supabase.from('wa_message_status_log').insert({
                message_id: messageUpsert.data.id,
                status: messageStatus,
                occurred_at: sentAtIso,
                source: 'waha',
            });

            const mediaData = toRecord(data.media);
            const messageMedia = toRecord(messageRecord.media);
            const media = Object.keys(mediaData).length > 0 ? mediaData : Object.keys(messageMedia).length > 0 ? messageMedia : null;
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

            if (!fromMe && type === 'chat' && typeof bodyText === 'string') {
                const replyText = resolveAutoReplyKeyword(bodyText);
                if (replyText) {
                    const { data: recentOutbound } = await supabase
                        .from('wa_messages')
                        .select('id,sent_at')
                        .eq('chat_id', chat.id)
                        .eq('direction', 'outbound')
                        .order('sent_at', { ascending: false })
                        .limit(1);

                    const lastSentAt = recentOutbound?.[0]?.sent_at as string | undefined;
                    const lastSentTime = lastSentAt ? new Date(lastSentAt).getTime() : 0;
                    const nowMs = Date.now();
                    const recentlyReplied = lastSentTime && nowMs - lastSentTime < 60_000;

                    if (!recentlyReplied) {
                        await sendMessageAction(waJid, replyText);
                    }
                }
            }
        }

        if (event === 'message.ack') {
            const id = toEventId(data);
            if (id) {
                const ack = typeof data.ack === 'number' ? data.ack : typeof data.ack === 'string' ? Number(data.ack) : -1;
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
