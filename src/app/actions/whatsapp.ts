'use server';

import { waha } from '@/lib/waha';
import type { WahaSession } from '@/lib/waha';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type SessionQrCarrier = WahaSession & {
    qr?: string;
    qrCode?: string;
    engine?: {
        qr?: string;
        qrCode?: string;
    };
};

type WahaChatPayload = {
    id: string;
    name: string | null;
    pushname: string | null;
    timestamp: string | null;
};

type WahaMessagePayload = {
    id: string;
    chatId: string;
    body: string | null;
    type: string;
    fromMe: boolean;
    status: string;
    mediaUrl: string | null;
    mediaCaption: string | null;
    timestamp: string;
    quotedMessageId: string | null;
    isForwarded: boolean;
    isDeleted: boolean;
};

type SendMessageOptions = {
    quotedMessageId?: string | null;
    isForwarded?: boolean;
    idempotencyKey?: string;
};

type SendMediaInput = {
    file: File;
    caption?: string;
    idempotencyKey?: string;
};

function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function isWahaUnavailableError(error: unknown): boolean {
    const message = getErrorMessage(error, '').toLowerCase();
    return message.includes('waha') && (message.includes('503') || message.includes('temporarily unavailable') || message.includes('service unavailable'));
}

function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toSerializedId(value: unknown): string | null {
    if (typeof value === 'string') return value;
    const record = toRecord(value);
    const serialized = record._serialized;
    return typeof serialized === 'string' ? serialized : null;
}

function toIsoTimestamp(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const ms = value > 1_000_000_000_000 ? value : value * 1000;
        return new Date(ms).toISOString();
    }
    if (typeof value === 'string') {
        if (!value.trim()) return null;
        const asNumber = Number(value);
        if (!Number.isNaN(asNumber)) {
            const ms = asNumber > 1_000_000_000_000 ? asNumber : asNumber * 1000;
            return new Date(ms).toISOString();
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return null;
}

function detectMediaType(mimeType: string): 'image' | 'document' | 'voice' | null {
    const mime = mimeType.toLowerCase();
    if (['image/jpeg', 'image/png'].includes(mime)) return 'image';
    if (mime === 'audio/ogg') return 'voice';
    if (
        [
            'application/pdf',
            'application/msword',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ].includes(mime)
    ) {
        return 'document';
    }
    return null;
}

function getMaxSizeBytes(mediaType: 'image' | 'document' | 'voice'): number {
    if (mediaType === 'document') return 100 * 1024 * 1024;
    return 16 * 1024 * 1024;
}

async function sendWithRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i <= retries; i++) {
        try {
            return await operation();
        } catch (error: unknown) {
            lastError = error;
            if (i === retries) break;
            await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
        }
    }
    throw lastError;
}

async function upsertChatContext(supabase: Awaited<ReturnType<typeof createClient>>, waJid: string) {
    const now = new Date().toISOString();
    const { data: contact, error: contactError } = await supabase
        .from('wa_contacts')
        .upsert(
            {
                wa_jid: waJid,
                phone: waJid.split('@')[0]?.replace(/\D/g, '') || null,
                last_message_at: now,
            },
            { onConflict: 'wa_jid' }
        )
        .select()
        .single();

    if (contactError) throw contactError;

    const { data: chat, error: chatError } = await supabase
        .from('wa_chats')
        .upsert(
            {
                contact_id: contact.id,
                last_message_at: now,
            },
            { onConflict: 'contact_id' }
        )
        .select()
        .single();

    if (chatError) throw chatError;
    return { contact, chat };
}

async function insertStatusLog(
    supabase: Awaited<ReturnType<typeof createClient>>,
    messageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    source: string
) {
    await supabase.from('wa_message_status_log').insert({
        message_id: messageId,
        status,
        occurred_at: new Date().toISOString(),
        source,
    });
}

async function insertAuditLog(
    supabase: Awaited<ReturnType<typeof createClient>>,
    action: string,
    entityType: string,
    entityId: string,
    afterJson: Record<string, unknown>
) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('wa_audit_logs').insert({
        actor_id: user?.id ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        after_json: afterJson,
    });
}

export async function trackOptimizedFallbackAction(reason: string, source = 'optimized_client') {
    const supabase = await createClient();
    try {
        const normalizedReason = reason.trim().slice(0, 300) || 'unknown';
        await insertAuditLog(
            supabase,
            'optimized_fallback',
            'system',
            crypto.randomUUID(),
            {
                reason: normalizedReason,
                source,
                occurred_at: new Date().toISOString(),
            }
        );
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mencatat telemetry fallback') };
    }
}

/**
 * Server Action to send a WhatsApp message via WAHA
 */
export async function sendMessageAction(chatId: string, text: string, options?: SendMessageOptions) {
    const supabase = await createClient();
    const idempotencyKey = options?.idempotencyKey ?? crypto.randomUUID();

    try {
        const existingByIdempotency = await supabase
            .from('wa_messages')
            .select('external_message_id')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        if (existingByIdempotency.data?.external_message_id) {
            return { success: true, messageId: existingByIdempotency.data.external_message_id };
        }

        const result = await sendWithRetry(() => waha.sendMessage(chatId, text), 2);

        if (!result || !result.id) {
            throw new Error('Failed to send message via WAHA');
        }

        const { chat } = await upsertChatContext(supabase, chatId);

        const nowIso = new Date().toISOString();
        const { data: inserted, error: messageError } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: result.id,
                chat_id: chat.id,
                body: text,
                type: 'chat',
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                quoted_message_id: options?.quotedMessageId ?? null,
                is_forwarded: Boolean(options?.isForwarded),
                is_deleted: false,
                idempotency_key: idempotencyKey,
                sent_at: nowIso,
                retry_count: 0,
                last_retry_at: null,
            })
            .select('id')
            .maybeSingle();

        if (messageError) {
            if (messageError.code !== '23505') {
                throw messageError;
            }
        }

        if (inserted?.id) {
            await insertStatusLog(supabase, inserted.id, 'sent', 'crm_api');
            await insertAuditLog(supabase, 'send_text', 'message', inserted.id, {
                chat_id: chat.id,
                external_message_id: result.id,
                idempotency_key: idempotencyKey,
            });
        }

        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: result.id };
    } catch (error: unknown) {
        console.error('Error in sendMessageAction:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function sendMediaMessageAction(chatId: string, payload: SendMediaInput) {
    const supabase = await createClient();
    const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();
    try {
        const existingByIdempotency = await supabase
            .from('wa_messages')
            .select('external_message_id')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();
        if (existingByIdempotency.data?.external_message_id) {
            return { success: true, messageId: existingByIdempotency.data.external_message_id };
        }

        const mediaType = detectMediaType(payload.file.type || '');
        if (!mediaType) {
            return { success: false, error: 'Format file tidak didukung.' };
        }

        const maxSize = getMaxSizeBytes(mediaType);
        if (payload.file.size > maxSize) {
            return { success: false, error: 'Ukuran file melebihi batas spesifikasi.' };
        }

        const ext = payload.file.name.includes('.') ? payload.file.name.split('.').pop() : 'bin';
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const filePath = `whatsapp-media/${fileName}`;
        const arrayBuffer = await payload.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const upload = await supabase.storage
            .from('images')
            .upload(filePath, buffer, { contentType: payload.file.type, upsert: false });
        if (upload.error) {
            throw new Error(`Gagal upload media: ${upload.error.message}`);
        }

        const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
        const mediaUrl = publicUrlData.publicUrl;

        const result = await sendWithRetry(
            () =>
                waha.sendMedia(chatId, {
                    url: mediaUrl,
                    caption: payload.caption,
                    filename: payload.file.name,
                }),
            2
        );
        const externalId = typeof result?.id === 'string' ? result.id : crypto.randomUUID();
        const { chat } = await upsertChatContext(supabase, chatId);
        const nowIso = new Date().toISOString();

        const { data: inserted, error: messageError } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: externalId,
                chat_id: chat.id,
                body: payload.caption ?? payload.file.name,
                type: mediaType === 'voice' ? 'audio' : mediaType,
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                is_deleted: false,
                idempotency_key: idempotencyKey,
                sent_at: nowIso,
            })
            .select('id')
            .single();
        if (messageError) throw messageError;

        const { error: mediaError } = await supabase.from('wa_message_media').insert({
            message_id: inserted.id,
            media_type: mediaType,
            mime_type: payload.file.type,
            size_bytes: payload.file.size,
            storage_key: mediaUrl,
        });
        if (mediaError) throw mediaError;

        await insertStatusLog(supabase, inserted.id, 'sent', 'crm_api');
        await insertAuditLog(supabase, 'send_media', 'message', inserted.id, {
            chat_id: chat.id,
            external_message_id: externalId,
            media_type: mediaType,
            idempotency_key: idempotencyKey,
        });

        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: externalId };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim media WhatsApp') };
    }
}

export async function sendTemplateMessageAction(chatId: string, templateName: string, variables: string[] = []) {
    const supabase = await createClient();
    try {
        const result = await sendWithRetry(() => waha.sendTemplate(chatId, templateName, variables), 2);
        if (!result?.id) throw new Error('Gagal mengirim template');
        const { chat } = await upsertChatContext(supabase, chatId);
        const { data: message, error } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: result.id,
                chat_id: chat.id,
                body: JSON.stringify({ templateName, variables }),
                type: 'template',
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                sent_at: new Date().toISOString(),
            })
            .select('id')
            .single();
        if (error) throw error;
        await insertStatusLog(supabase, message.id, 'sent', 'crm_api');
        await insertAuditLog(supabase, 'send_template', 'message', message.id, { templateName, variables });
        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: result.id };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim template WhatsApp') };
    }
}

export async function sendInteractiveButtonsAction(
    chatId: string,
    text: string,
    buttons: { id: string; title: string }[]
) {
    const supabase = await createClient();
    try {
        const result = await sendWithRetry(() => waha.sendInteractiveButtons(chatId, text, buttons), 2);
        if (!result?.id) throw new Error('Gagal mengirim pesan interaktif');
        const { chat } = await upsertChatContext(supabase, chatId);
        const { data: message, error } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: result.id,
                chat_id: chat.id,
                body: text,
                type: 'interactive',
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                sent_at: new Date().toISOString(),
                raw_payload: { buttons },
            })
            .select('id')
            .single();
        if (error) throw error;
        await insertStatusLog(supabase, message.id, 'sent', 'crm_api');
        await insertAuditLog(supabase, 'send_interactive', 'message', message.id, { text, buttons_count: buttons.length });
        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: result.id };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim tombol interaktif') };
    }
}

/**
 * Server Action to get session status and QR code
 */
export async function getSessionStatusAction() {
    try {
        const status = await waha.getSessionStatus();
        
        let qrCode = null;
        let lastError = null;

        if (status && status.status === 'SCAN_QR_CODE') {
            // 1. Try to find QR in the status object itself (metadata or engine)
            const statusWithQr = status as SessionQrCarrier;
            qrCode = statusWithQr.qr || statusWithQr.qrCode || statusWithQr.engine?.qr;
            
            if (!qrCode) {
                // 2. Try to find in the list of sessions
                try {
                    const allSessions = await waha.getSessions();
                    const currentSession = (allSessions as SessionQrCarrier[]).find((s) => s.name === status.name);
                    if (currentSession) {
                        qrCode = currentSession.qr || currentSession.qrCode || currentSession.engine?.qr;
                    }
                } catch {
                    console.warn('[WAHA Server Debug] Failed to fetch all sessions list');
                }
            }

            if (!qrCode) {
                // 3. Fallback to screenshot methods
                // Initial wait for server to generate QR
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Retry screenshot up to 5 times
                for (let i = 0; i < 5; i++) {
                    try {
                        qrCode = await waha.getScreenshot();
                        if (qrCode) {
                            break;
                        }
                    } catch (error: unknown) {
                        lastError = getErrorMessage(error);
                        console.warn(`[WAHA Retry ${i+1}] Screenshot failed:`, lastError);
                    }
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
                }
            }
        }

        return { 
            success: true, 
            status, 
            qrCode, 
            error: qrCode ? null : (
                lastError || 
                (status?.status === 'SCAN_QR_CODE' ? 'QR Code belum siap di server' : 
                 status?.status === 'FAILED' ? (typeof toRecord(status.config).error === 'string' ? String(toRecord(status.config).error) : 'Layanan WhatsApp Offline') :
                 status?.status === 'STARTING' ? (
                    typeof toRecord(status.config).warning === 'string'
                        ? String(toRecord(status.config).warning)
                        : null
                 ) :
                 null)
            )
        };
    } catch (error: unknown) {
        console.error('Error in getSessionStatusAction:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Server Action to start session
 */
export async function startSessionAction() {
    try {
        await waha.startSession();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Server Action to register webhook to kokohin.com
 */
export async function registerWebhookAction() {
    try {
        const explicitWebhookUrl = (process.env.WAHA_WEBHOOK_URL || '').replace(/[`"']/g, '').trim();
        let baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://kokohin.com').replace(/[`"']/g, '').trim();
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const webhookUrl = explicitWebhookUrl || `${baseUrl}/api/public/whatsapp/webhook`;
        const secret = process.env.WAHA_WEBHOOK_SECRET || '';

        if (!secret) {
            throw new Error('WAHA_WEBHOOK_SECRET is not configured in environment variables.');
        }

        // 1. Get existing webhooks to avoid duplicates
        const existing = await waha.getWebhooks();
        const normalizedPrimary = webhookUrl.replace(/\/$/, '');
        const legacyAlias = normalizedPrimary.endsWith('/api/public/whatsapp/webhook')
            ? normalizedPrimary.replace('/api/public/whatsapp/webhook', '/api/whatsapp/webhook')
            : normalizedPrimary;
        const alreadyRegistered = (existing as { url?: string }[]).find((w) => {
            const current = (w.url || '').replace(/\/$/, '');
            return current === normalizedPrimary || current === legacyAlias;
        });

        if (alreadyRegistered) {
            return { success: true, message: 'Webhook sudah terdaftar di ' + webhookUrl };
        }

        // 2. Register new webhook
        await waha.registerWebhook(webhookUrl, secret, ['message', 'message.ack', 'session.status', 'message.reaction']);
        
        return { success: true, message: 'Webhook berhasil didaftarkan ke ' + webhookUrl };
    } catch (error: unknown) {
        console.error('Error in registerWebhookAction:', error);
        return { success: false, error: getErrorMessage(error, 'Gagal mendaftarkan webhook') };
    }
}

/**
 * Server Action to stop session
 */
export async function stopSessionAction() {
    try {
        await waha.stopSession();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Server Action to logout session
 */
export async function logoutSessionAction() {
    try {
        await waha.logoutSession();
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getChatsAction() {
    try {
        const chats = await waha.getChats();
        const mapped = (Array.isArray(chats) ? chats : []).map((chat): WahaChatPayload => {
            const row = toRecord(chat);
            const id = toSerializedId(row.id) || '';
            const timestamp = toIsoTimestamp(
                row.timestamp ??
                row.lastMessageTimestamp ??
                toRecord(row.lastMessage).timestamp
            );
            return {
                id,
                name: typeof row.name === 'string' ? row.name : null,
                pushname: typeof row.pushname === 'string' ? row.pushname : null,
                timestamp,
            };
        }).filter((chat) => chat.id.length > 0);

        return { success: true, chats: mapped };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getMessagesAction(chatId: string) {
    try {
        const messages = await waha.getMessages(chatId, 50);
        const mapped = (Array.isArray(messages) ? messages : []).map((msg): WahaMessagePayload => {
            const row = toRecord(msg);
            const rowData = toRecord(row._data);
            const media = toRecord(row.media);
            const isoTimestamp = toIsoTimestamp(row.timestamp ?? rowData.t ?? rowData.timestamp) || new Date().toISOString();
            const messageId = toSerializedId(row.id) || `${chatId}-${isoTimestamp}`;
            return {
                id: messageId,
                chatId,
                body: typeof row.body === 'string'
                    ? row.body
                    : (typeof rowData.body === 'string' ? rowData.body : null),
                type: typeof row.type === 'string'
                    ? row.type
                    : (typeof rowData.type === 'string' ? rowData.type : 'chat'),
                fromMe: Boolean(row.fromMe ?? rowData.fromMe),
                status: typeof row.status === 'string'
                    ? row.status
                    : (typeof rowData.ack === 'number' ? (rowData.ack === 3 ? 'read' : rowData.ack === 2 ? 'delivered' : 'sent') : 'sent'),
                mediaUrl: typeof row.mediaUrl === 'string'
                    ? row.mediaUrl
                    : (typeof media.url === 'string' ? media.url : null),
                mediaCaption: typeof row.mediaCaption === 'string'
                    ? row.mediaCaption
                    : (typeof media.caption === 'string' ? media.caption : null),
                timestamp: isoTimestamp,
                quotedMessageId: null,
                isForwarded: false,
                isDeleted: false,
            };
        });

        return { success: true, messages: mapped };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function quoteReplyAction(chatId: string, quotedMessageId: string, text: string) {
    const supabase = await createClient();
    try {
        const result = await sendWithRetry(() => waha.replyMessage(chatId, quotedMessageId, text), 2);
        if (!result?.id) throw new Error('Gagal mengirim quote reply');
        const { chat } = await upsertChatContext(supabase, chatId);
        const { data: inserted, error } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: result.id,
                chat_id: chat.id,
                body: text,
                type: 'chat',
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                quoted_message_id: quotedMessageId,
                sent_at: new Date().toISOString(),
            })
            .select('id')
            .single();
        if (error) throw error;
        await insertStatusLog(supabase, inserted.id, 'sent', 'crm_api');
        await insertAuditLog(supabase, 'quote_reply', 'message', inserted.id, { quoted_message_id: quotedMessageId });
        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: result.id };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim quote reply') };
    }
}

export async function deleteMessageForSenderAction(messageId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('wa_messages')
            .update({
                body: 'message deleted',
                is_deleted: true,
            })
            .eq('id', messageId)
            .eq('direction', 'outbound');

        if (error) {
            throw error;
        }

        await insertAuditLog(supabase, 'delete_for_sender', 'message', messageId, { is_deleted: true });

        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menghapus pesan') };
    }
}

export async function addInternalNoteAction(chatId: string, note: string) {
    const supabase = await createClient();
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
            return { success: false, error: 'User tidak terautentikasi' };
        }

        const { error } = await supabase
            .from('wa_internal_notes')
            .insert({
                chat_id: chatId,
                agent_id: user.id,
                note: note.trim(),
            });

        if (error) {
            throw error;
        }

        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menyimpan catatan internal') };
    }
}

export async function getInternalNotesAction(chatId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('wa_internal_notes')
            .select('id, note, created_at, agent_id')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            throw error;
        }

        return { success: true, notes: data ?? [] };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat catatan internal') };
    }
}

type ContactJoinRow = {
    id: string;
    contact_id: string;
    unread_count: number | null;
    last_message_at: string | null;
    wa_contacts: {
        id: string;
        wa_jid: string;
        display_name: string | null;
        avatar_url: string | null;
        phone: string | null;
    } | {
        id: string;
        wa_jid: string;
        display_name: string | null;
        avatar_url: string | null;
        phone: string | null;
    }[] | null;
};

type NormalizedWahaChat = {
    waJid: string;
    displayName: string | null;
    timestamp: string | null;
};

function normalizeWahaChatRow(input: unknown): NormalizedWahaChat | null {
    const row = toRecord(input);
    const id = toSerializedId(row.id) || (typeof row.id === 'string' ? row.id : null) || (typeof row.chatId === 'string' ? row.chatId : null);
    if (!id || !id.includes('@')) return null;
    const displayName =
        (typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null) ||
        (typeof row.pushname === 'string' && row.pushname.trim() ? row.pushname.trim() : null) ||
        null;
    const timestamp = toIsoTimestamp(row.timestamp ?? row.lastMessageTimestamp ?? toRecord(row.lastMessage).timestamp);
    return { waJid: id, displayName, timestamp };
}

async function bootstrapChatsFromWaha(
    supabase: Awaited<ReturnType<typeof createClient>>,
    limit: number
): Promise<number> {
    console.log('[WhatsApp] Bootstrapping chats from WAHA...');
    const chats = await waha.getChats();
    console.log('[WhatsApp] WAHA raw chats count:', Array.isArray(chats) ? chats.length : 'Not array');
    
    const normalized = (Array.isArray(chats) ? chats : [])
        .map((chat) => normalizeWahaChatRow(chat))
        .filter((chat): chat is NormalizedWahaChat => Boolean(chat))
        .slice(0, limit);

    console.log('[WhatsApp] Normalized chats to sync:', normalized.length);

    if (normalized.length === 0) return 0;

    let synced = 0;
    for (const item of normalized) {
        const nowIso = item.timestamp ?? new Date().toISOString();
        const { data: contact, error: contactError } = await supabase
            .from('wa_contacts')
            .upsert(
                {
                    wa_jid: item.waJid,
                    phone: item.waJid.split('@')[0]?.replace(/\D/g, '') || null,
                    display_name: item.displayName,
                    last_message_at: nowIso,
                },
                { onConflict: 'wa_jid' }
            )
            .select('id')
            .single();
        
        if (contactError) {
            console.error('[WhatsApp] Contact upsert error:', contactError, item);
        }

        if (contactError || !contact?.id) {
            continue;
        }

        const { error: chatError } = await supabase
            .from('wa_chats')
            .upsert(
                {
                    contact_id: contact.id,
                    last_message_at: nowIso,
                },
                { onConflict: 'contact_id' }
            );
            
        if (chatError) {
             console.error('[WhatsApp] Chat upsert error:', chatError, item);
        }

        if (!chatError) {
            synced += 1;
        }
    }
    
    console.log(`[WhatsApp] Successfully synced ${synced} chats`);
    return synced;
}

export async function syncChatsFromWahaAction(limit = 200) {
    const supabase = await createClient();
    try {
        const synced = await bootstrapChatsFromWaha(supabase, limit);
        revalidatePath('/admin/whatsapp');
        return { success: true, synced };
    } catch (error: unknown) {
        if (isWahaUnavailableError(error)) {
            return { success: false, error: 'Layanan WAHA sementara tidak tersedia. Coba lagi beberapa saat lagi.' };
        }
        return { success: false, error: getErrorMessage(error, 'Gagal sinkronisasi chat dari WAHA') };
    }
}

export async function getPaginatedContactsAction(page = 1, limit = 20, search = '') {
    const supabase = await createClient();
    try {
        const offset = (page - 1) * limit;
        let warning: string | null = null;

        const baseQuery = () =>
            supabase
            .from('wa_chats')
            .select(`
                id, 
                contact_id, 
                unread_count, 
                last_message_at, 
                wa_contacts (
                    id, 
                    wa_jid, 
                    display_name, 
                    avatar_url, 
                    phone
                )
            `, { count: 'exact' })
            .order('last_message_at', { ascending: false })
            .range(offset, offset + limit - 1);

        let filteredContactIds: string[] | null = null;
        const normalizedSearch = search.trim();
        if (normalizedSearch) {
            const { data: matchedContacts, error: contactSearchError } = await supabase
                .from('wa_contacts')
                .select('id')
                .or(`display_name.ilike.%${normalizedSearch}%,wa_jid.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`)
                .limit(300);
            if (contactSearchError) {
                throw contactSearchError;
            }
            filteredContactIds = (matchedContacts ?? []).map((item) => item.id).filter(Boolean);
            if (filteredContactIds.length === 0) {
                return {
                    success: true,
                    contacts: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }
        }

        const query = filteredContactIds && filteredContactIds.length > 0
            ? baseQuery().in('contact_id', filteredContactIds)
            : baseQuery();

        let { data, count, error } = await query;

        if (error) {
            console.error('Error fetching chats:', error);
            throw error;
        }

        const shouldBootstrap = (!data || data.length === 0) && !normalizedSearch && page === 1;
        if (shouldBootstrap) {
            try {
                const synced = await bootstrapChatsFromWaha(supabase, Math.max(limit, 50));
                if (synced > 0) {
                    const refreshed = filteredContactIds && filteredContactIds.length > 0
                        ? await baseQuery().in('contact_id', filteredContactIds)
                        : await baseQuery();
                    data = refreshed.data;
                    count = refreshed.count;
                    error = refreshed.error;
                    if (error) {
                        throw error;
                    }
                }
            } catch (bootstrapError: unknown) {
                if (isWahaUnavailableError(bootstrapError)) {
                    warning = 'Layanan WAHA sedang tidak tersedia (503). Menampilkan data lokal terakhir.';
                } else {
                    throw bootstrapError;
                }
            }
        }

        const rows = ((data ?? []) as unknown[]).map((entry) => entry as ContactJoinRow);
        const waJids = rows
            .map((chat) => {
                const contact = Array.isArray(chat.wa_contacts) ? chat.wa_contacts[0] : chat.wa_contacts;
                return contact?.wa_jid || '';
            })
            .filter(Boolean)
            .map((waJid) => waJid.split('@')[0].replace(/\D/g, ''));
        let erpData: { id: string; phone: string; status: string; customer_name: string }[] = [];
        
        if (waJids.length > 0) {
            try {
                const orQuery = waJids.map(phone => `phone.ilike.%${phone}%`).join(',');
                const { data: erpProjects } = await supabase
                    .from('erp_projects')
                    .select('id, phone, status, customer_name')
                    .or(orQuery);
                
                erpData = erpProjects || [];
            } catch (erpError) {
                console.error('Error fetching ERP projects:', erpError);
            }
        }

        const chatsWithDetails = rows.map(chat => {
            const contact = Array.isArray(chat.wa_contacts) ? chat.wa_contacts[0] : chat.wa_contacts;
            if (!contact) return null;
            const cleanPhone = contact.phone || contact.wa_jid.split('@')[0].replace(/\D/g, '');
            const erpInfo = erpData.find(lead => lead.phone.includes(cleanPhone));
            
            return {
                id: chat.id,
                contact_id: chat.contact_id,
                wa_id: contact.wa_jid,
                name: contact.display_name || erpInfo?.customer_name || contact.wa_jid.split('@')[0],
                avatar_url: contact.avatar_url,
                last_message_at: chat.last_message_at,
                unread_count: chat.unread_count,
                erp_project_id: erpInfo?.id,
                erp_project_status: erpInfo?.status,
            };
        }).filter((item): item is NonNullable<typeof item> => Boolean(item));

        return {
            success: true,
            contacts: chatsWithDetails,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
            warning,
        };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat kontak WhatsApp') };
    }
}

export async function getPaginatedMessagesAction(chatId: string, page = 1, limit = 50) {
    const supabase = await createClient();
    try {
        const offset = (page - 1) * limit;
        
        const { data, count, error } = await supabase
            .from('wa_messages')
            .select('*', { count: 'exact' })
            .eq('chat_id', chatId)
            .order('sent_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return {
            success: true,
            messages: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat pesan WhatsApp') };
    }
}

export async function getChatMetricsAction() {
    const supabase = await createClient();
    try {
        const [{ count: totalChats }, { count: inboundMessages }, { count: outboundMessages }] = await Promise.all([
            supabase.from('wa_chats').select('id', { count: 'exact', head: true }),
            supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound'),
            supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'outbound'),
        ]);

        const responseRate = inboundMessages && inboundMessages > 0
            ? Math.min(100, Math.round(((outboundMessages ?? 0) / inboundMessages) * 100))
            : 0;
        
        // Target conversion rate based on response rate
        const conversionRate = Math.min(100, Math.round(responseRate * 0.45));

        return {
            success: true,
            metrics: {
                totalChats: totalChats ?? 0,
                responseRate,
                conversionRate,
            },
        };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat metrik chat') };
    }
}

export async function getWhatsAppMonitoringMetricsAction() {
    const supabase = await createClient();
    try {
        const now = Date.now();
        const last15Min = new Date(now - 15 * 60 * 1000).toISOString();
        const last30Min = new Date(now - 30 * 60 * 1000).toISOString();
        const last24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const [sessionResult, sentResult, failedResult, delayedResult, anomalyResult, fallbackResult] = await Promise.all([
            getSessionStatusAction(),
            supabase
                .from('wa_messages')
                .select('id', { count: 'exact', head: true })
                .eq('direction', 'outbound')
                .gte('sent_at', last15Min),
            supabase
                .from('wa_messages')
                .select('id', { count: 'exact', head: true })
                .eq('direction', 'outbound')
                .eq('status', 'failed')
                .gte('sent_at', last30Min),
            supabase
                .from('wa_messages')
                .select('id,sent_at,created_at', { count: 'exact' })
                .gte('created_at', last15Min)
                .limit(200),
            supabase
                .from('wa_delivery_anomalies')
                .select('id, anomaly_type, severity, detected_at, details')
                .is('resolved_at', null)
                .order('detected_at', { ascending: false })
                .limit(10),
            supabase
                .from('wa_audit_logs')
                .select('id, after_json, created_at', { count: 'exact' })
                .eq('action', 'optimized_fallback')
                .gte('created_at', last24Hours)
                .limit(300),
        ]);

        const delayedCount =
            delayedResult.data?.filter((item) => {
                const createdAt = new Date((item.created_at as string) || 0).getTime();
                const sentAt = new Date((item.sent_at as string) || 0).getTime();
                if (!createdAt || !sentAt) return false;
                return sentAt - createdAt > 3000;
            }).length ?? 0;

        const sentCount = sentResult.count ?? 0;
        const failedCount = failedResult.count ?? 0;
        const totalCount = sentCount + failedCount;
        const errorRate = totalCount > 0 ? Number(((failedCount / totalCount) * 100).toFixed(2)) : 0;
        const connectionStatus = sessionResult.success ? sessionResult.status?.status || 'UNKNOWN' : 'UNKNOWN';
        const isHealthy = connectionStatus === 'WORKING' && errorRate === 0 && delayedCount === 0;
        const fallbackCount24h = fallbackResult.count ?? 0;
        const fallbackReasonMap = new Map<string, number>();
        (fallbackResult.data ?? []).forEach((item) => {
            const reasonValue = toRecord(item.after_json).reason;
            const reason = typeof reasonValue === 'string' && reasonValue.trim()
                ? reasonValue.trim()
                : 'unknown';
            fallbackReasonMap.set(reason, (fallbackReasonMap.get(reason) ?? 0) + 1);
        });
        const fallbackTopReasons = Array.from(fallbackReasonMap.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return {
            success: true,
            monitoring: {
                connectionStatus,
                isHealthy,
                sentCount,
                failedCount,
                delayedCount,
                errorRate,
                alerts: anomalyResult.data ?? [],
                fallbackCount24h,
                fallbackTopReasons,
            },
        };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat monitoring WhatsApp') };
    }
}

export async function createBroadcastCampaignAction(name: string, template: string, segmentFilter: Record<string, unknown> = {}) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User tidak terautentikasi');

        const { data: campaign, error } = await supabase
            .from('wa_broadcast_campaigns')
            .insert({
                name,
                segment_filter_json: segmentFilter,
                status: 'draft',
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, campaign };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal membuat kampanye broadcast') };
    }
}

export async function sendBroadcastAction(campaignId: string, template: string) {
    const supabase = await createClient();
    try {
        const { error: campaignError } = await supabase
            .from('wa_broadcast_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaignError) throw campaignError;

        // 2. Update status to processing
        await supabase
            .from('wa_broadcast_campaigns')
            .update({ status: 'processing' })
            .eq('id', campaignId);

        // 3. Get all active chats for broadcast (simplified for now)
        const { data: chats } = await supabase
            .from('wa_chats')
            .select('id, wa_contacts(wa_jid, display_name)');

        if (!chats || chats.length === 0) {
            throw new Error('Tidak ada target chat untuk broadcast');
        }

        let successCount = 0;
        let failedCount = 0;

        // 4. Send messages (in a real production app, this should be done by a background worker)
        for (const chat of chats) {
            try {
                const contact = (chat.wa_contacts as { wa_jid?: string; display_name?: string } | null) ?? {};
                const personalizedBody = template.replace('{{name}}', contact.display_name || 'Pelanggan');
                
                if (!contact.wa_jid) {
                    failedCount++;
                    continue;
                }

                const result = await waha.sendMessage(contact.wa_jid, personalizedBody);
                
                if (result && result.id) {
                    // Record recipient status
                    await supabase
                        .from('wa_broadcast_recipients')
                        .insert({
                            campaign_id: campaignId,
                            chat_id: chat.id,
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                        });
                    successCount++;
                } else {
                    failedCount++;
                }
            } catch (err) {
                console.error('Failed to send broadcast message:', err);
                failedCount++;
            }
        }

        // 5. Update campaign status
        await supabase
            .from('wa_broadcast_campaigns')
            .update({ status: 'completed' })
            .eq('id', campaignId);

        return { success: true, successCount, failedCount };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim broadcast') };
    }
}

export async function assignAgentToChatAction(chatId: string, agentId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('wa_chats')
            .update({ assigned_agent_id: agentId })
            .eq('id', chatId);

        if (error) throw error;

        // Record audit log
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('wa_audit_logs').insert({
                actor_id: user.id,
                action: 'assign_agent',
                entity_type: 'chat',
                entity_id: chatId,
                after_json: { agent_id: agentId }
            });
        }

        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menugaskan agen') };
    }
}

export async function autoAssignChatAction(chatId: string) {
    const supabase = await createClient();
    try {
        // 1. Get active assignment rules
        const { data: rule } = await supabase
            .from('wa_assignment_rules')
            .select('*')
            .eq('is_active', true)
            .single();

        if (!rule) return { success: false, error: 'Tidak ada aturan penugasan aktif' };

        // 2. Implement Round-Robin
        if (rule.mode === 'round_robin') {
            const { data: agents } = await supabase
                .from('profiles')
                .select('id')
                .in('role', ['admin_sales', 'agent']);

            if (!agents || agents.length === 0) throw new Error('Tidak ada agen tersedia');

            // Find last assigned agent from audit logs or just pick next in list
            const { data: lastAssignment } = await supabase
                .from('wa_audit_logs')
                .select('after_json')
                .eq('action', 'assign_agent')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            let nextAgentId = agents[0].id;
            if (lastAssignment) {
                const lastAgentId = toRecord(lastAssignment.after_json).agent_id;
                const lastIndex = agents.findIndex(a => a.id === lastAgentId);
                if (lastIndex !== -1 && lastIndex < agents.length - 1) {
                    nextAgentId = agents[lastIndex + 1].id;
                }
            }

            return assignAgentToChatAction(chatId, nextAgentId);
        }

        return { success: false, error: 'Mode penugasan tidak didukung' };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal penugasan otomatis') };
    }
}
