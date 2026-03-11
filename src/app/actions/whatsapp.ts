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

type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

const CONTACTS_CACHE_TTL_MS = 5_000;
const MESSAGES_CACHE_TTL_MS = 5_000;

const contactsCache = new Map<string, CacheEntry<unknown>>();
const messagesCache = new Map<string, CacheEntry<unknown>>();

function clearContactsCache() {
    contactsCache.clear();
}

function clearMessagesCacheForChat(chatId: string) {
    const prefix = `${chatId}:`;
    for (const key of messagesCache.keys()) {
        if (key.startsWith(prefix)) {
            messagesCache.delete(key);
        }
    }
}

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

async function syncGroupMembersForChat(
    supabase: Awaited<ReturnType<typeof createClient>>,
    waJid: string
) {
    const metadata = await waha.getGroupMetadataCached(waJid);
    const participants = Array.isArray(metadata.participants) ? metadata.participants : [];

    const { data: contactRow, error: contactError } = await supabase
        .from('wa_contacts')
        .upsert(
            {
                wa_jid: waJid,
                phone: waJid.split('@')[0]?.replace(/\D/g, '') || null,
                display_name: metadata.subject || metadata.name || null,
                last_message_at: new Date().toISOString(),
            },
            { onConflict: 'wa_jid' }
        )
        .select('id')
        .single();
    if (contactError || !contactRow) {
        throw contactError || new Error('Failed to upsert group contact');
    }

    const { data: chatRow, error: chatError } = await supabase
        .from('wa_chats')
        .upsert(
            {
                contact_id: contactRow.id,
                type: 'group',
                last_message_at: new Date().toISOString(),
                group_subject: metadata.subject || metadata.name || null,
                group_owner_jid: null,
            },
            { onConflict: 'contact_id' }
        )
        .select('id')
        .single();
    if (chatError || !chatRow) {
        throw chatError || new Error('Failed to upsert group chat');
    }

    if (participants.length === 0) {
        return { chatId: chatRow.id, membersSynced: 0 };
    }

    let count = 0;
    for (const p of participants) {
        const jid = typeof p.id === 'string' ? p.id : '';
        if (!jid) continue;
        const phone = jid.split('@')[0]?.replace(/\D/g, '') || null;

        const { data: memberContact, error: memberContactError } = await supabase
            .from('wa_contacts')
            .upsert(
                {
                    wa_jid: jid,
                    phone,
                },
                { onConflict: 'wa_jid' }
            )
            .select('id')
            .single();
        if (memberContactError || !memberContact) {
            continue;
        }

        const role =
            p.isSuperAdmin === true
                ? 'superadmin'
                : p.isAdmin === true
                    ? 'admin'
                    : 'member';

        const { error: memberError } = await supabase
            .from('wa_group_members')
            .upsert(
                {
                    chat_id: chatRow.id,
                    contact_id: memberContact.id,
                    role,
                },
                { onConflict: 'chat_id,contact_id' }
            );
        if (!memberError) {
            count += 1;
        }
    }

    return { chatId: chatRow.id, membersSynced: count };
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

export async function syncGroupMembersAction(waJid: string) {
    const supabase = await createClient();
    try {
        const normalizedJid = waJid.includes('@') ? waJid : `${waJid}@g.us`;
        const result = await syncGroupMembersForChat(supabase, normalizedJid);
        revalidatePath('/admin/whatsapp');
        return {
            success: true,
            chatId: result.chatId,
            membersSynced: result.membersSynced,
        };
    } catch (error: unknown) {
        return {
            success: false,
            error: getErrorMessage(error, 'Gagal sinkronisasi anggota grup dari WA'),
        };
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

        clearMessagesCacheForChat(chatId);
        clearContactsCache();

        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: result.id };
    } catch (error: unknown) {
        console.error('Error in sendMessageAction:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function sendTypingAction(chatId: string) {
    try {
        await waha.sendTyping(chatId);
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim status typing') };
    }
}

export async function sendSeenAction(chatId: string) {
    try {
        await waha.sendSeen(chatId);
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim status seen') };
    }
}

export async function forwardMessageAction(targetChatId: string, sourceMessageId: string) {
    const supabase = await createClient();
    try {
        const { data: source, error: sourceError } = await supabase
            .from('wa_messages')
            .select('id, external_message_id, body, type')
            .eq('id', sourceMessageId)
            .maybeSingle();

        if (sourceError || !source) {
            throw new Error('Pesan sumber tidak ditemukan');
        }
        if (!source.external_message_id) {
            throw new Error('Pesan ini tidak dapat di-forward');
        }

        const result = await sendWithRetry(
            () => waha.forwardMessage(targetChatId, source.external_message_id),
            2
        );

        const externalId = typeof result?.id === 'string' ? result.id : crypto.randomUUID();
        const { chat } = await upsertChatContext(supabase, targetChatId);
        const nowIso = new Date().toISOString();

        const { data: inserted, error: messageError } = await supabase
            .from('wa_messages')
            .insert({
                external_message_id: externalId,
                chat_id: chat.id,
                body: source.body,
                type: source.type,
                direction: 'outbound',
                sender_type: 'agent',
                status: 'sent',
                is_forwarded: true,
                is_deleted: false,
                idempotency_key: crypto.randomUUID(),
                sent_at: nowIso,
            })
            .select('id')
            .maybeSingle();
        if (messageError || !inserted) throw messageError || new Error('Gagal menyimpan pesan forward');

        await insertStatusLog(supabase, inserted.id, 'sent', 'crm_api');
        await insertAuditLog(supabase, 'forward', 'message', inserted.id, {
            source_message_id: sourceMessageId,
            target_chat_id: chat.id,
        });

        clearMessagesCacheForChat(targetChatId);
        clearContactsCache();

        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: externalId };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal meneruskan pesan') };
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

        clearMessagesCacheForChat(chatId);
        clearContactsCache();

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

        // 1. Get existing webhooks to avoid duplicates (best-effort; older WAHA may not support listing)
        let existing: { url?: string }[] = [];
        try {
            const rawExisting = await waha.getWebhooks();
            if (Array.isArray(rawExisting)) {
                existing = rawExisting as { url?: string }[];
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
            const listingUnsupported =
                message.includes('cannot get') ||
                message.includes('404') ||
                message.includes('not found');
            if (!listingUnsupported) {
                throw error;
            }
            // If WAHA doesn't support GET /api/webhooks, skip duplicate detection and continue.
            existing = [];
        }
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
        try {
            await waha.registerWebhook(webhookUrl, secret, [
                'session.status',
                'message',
                'message.any',
                'message.reaction',
                'message.ack',
                'message.ack.group',
                'message.waiting',
                'message.revoked',
                'message.edited',
                'chat.archive',
                'group.v2.join',
                'group.v2.leave',
                'group.v2.update',
                'group.v2.participants',
                'group.join',
                'group.leave',
                'presence.update',
                'poll.vote',
                'poll.vote.failed',
                'call.received',
                'call.accepted',
                'call.rejected',
                'label.upsert',
                'label.deleted',
                'label.chat.added',
                'label.chat.deleted',
                'event.response',
                'event.response.failed',
                'engine.event',
            ]);
            
            return { success: true, message: 'Webhook berhasil didaftarkan ke ' + webhookUrl };
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
            const unsupportedWebhookApi =
                message.includes('cannot post /api/webhooks') ||
                message.includes('cannot post /api/webhook') ||
                message.includes('404') ||
                message.includes('not found');

            if (unsupportedWebhookApi) {
                console.warn(
                    'WAHA instance does not support /api/webhooks register API. Please configure webhook URL manually in WAHA dashboard if needed.'
                );
                return {
                    success: true,
                    message:
                        'WAHA instance tidak menyediakan API /api/webhooks. Jika webhook sudah dikonfigurasi manual di WAHA dashboard ke ' +
                        webhookUrl +
                        ', Anda bisa mengabaikan tombol ini.',
                };
            }

            throw error;
        }
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

        const { data: messageRow } = await supabase
            .from('wa_messages')
            .select('chat_id')
            .eq('id', messageId)
            .maybeSingle();

        if (messageRow?.chat_id) {
            clearMessagesCacheForChat(messageRow.chat_id as string);
        }

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
        const normalizedSearch = search.trim();
        const cacheKey = `${page}:${limit}:${normalizedSearch.toLowerCase()}`;
        const now = Date.now();
        const cached = contactsCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.value as {
                success: boolean;
                contacts?: unknown[];
                pagination?: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
                warning?: string | null;
                error?: string;
            };
        }

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
                phone: contact.phone,
                avatar_url: contact.avatar_url,
                last_message_at: chat.last_message_at,
                unread_count: chat.unread_count,
                erp_project_id: erpInfo?.id,
                erp_project_status: erpInfo?.status,
            };
        }).filter((item): item is NonNullable<typeof item> => Boolean(item));

        const result = {
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
        contactsCache.set(cacheKey, {
            value: result,
            expiresAt: now + CONTACTS_CACHE_TTL_MS,
        });
        return result;
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat kontak WhatsApp') };
    }
}

export async function getPaginatedMessagesAction(chatId: string, page = 1, limit = 50) {
    const supabase = await createClient();
    try {
        const offset = (page - 1) * limit;
        const cacheKey = `${chatId}:${page}:${limit}`;
        const now = Date.now();
        const cached = messagesCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.value as {
                success: boolean;
                messages?: unknown[];
                pagination?: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
                error?: string;
            };
        }
        
        const { data, count, error } = await supabase
            .from('wa_messages')
            .select(
                `
                id,
                chat_id,
                external_message_id,
                body,
                type,
                direction,
                sender_type,
                status,
                sent_at,
                quoted_message_id,
                is_forwarded,
                is_deleted,
                raw_payload,
                wa_message_media (
                    storage_key,
                    media_type
                )
                `,
                { count: 'exact' }
            )
            .eq('chat_id', chatId)
            .order('sent_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const rows = (data ?? []) as unknown as Array<{
            id: string;
            chat_id: string;
            external_message_id: string;
            body: string | null;
            type: string;
            direction: string;
            sender_type: string;
            status: string;
            sent_at: string;
            quoted_message_id?: string | null;
            is_forwarded?: boolean | null;
            is_deleted?: boolean | null;
            raw_payload?: unknown;
            wa_message_media?: { storage_key?: string | null; media_type?: string | null }[] | { storage_key?: string | null; media_type?: string | null } | null;
        }>;

        // Collect author IDs for group messages
        const authorIds = new Set<string>();
        rows.forEach(row => {
            // Check if message has author info in payload (typical for groups)
            if (row.raw_payload) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = row.raw_payload as Record<string, any>;
                const author = payload.author || payload._data?.author || payload.participant;
                if (typeof author === 'string') {
                    authorIds.add(author);
                }
            }
        });

        // Fetch contacts if any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contactMap = new Map<string, any>();
        if (authorIds.size > 0) {
            const { data: contacts } = await supabase
                .from('wa_contacts')
                .select('id, wa_id:wa_jid, name:display_name, phone, avatar_url, last_message_at')
                .in('wa_jid', Array.from(authorIds));
            
            if (contacts) {
                contacts.forEach(c => contactMap.set(c.wa_id, c));
            }
        }

        const messages = rows.map((row) => {
            const mediaRelation = row.wa_message_media;
            const media =
                Array.isArray(mediaRelation) ? mediaRelation[0] : mediaRelation || null;

            let senderContact = null;
            if (row.raw_payload) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload = row.raw_payload as Record<string, any>;
                const author = payload.author || payload._data?.author || payload.participant;
                if (typeof author === 'string') {
                    senderContact = contactMap.get(author) || null;
                }
            }

            return {
                id: row.id,
                external_message_id: row.external_message_id,
                chat_id: row.chat_id,
                body: row.body,
                type: row.type,
                direction: row.direction as 'inbound' | 'outbound',
                sender_type: row.sender_type as 'customer' | 'agent' | 'system',
                status: row.status,
                sent_at: row.sent_at,
                quoted_message_id: row.quoted_message_id ?? null,
                is_forwarded: row.is_forwarded ?? false,
                is_deleted: row.is_deleted ?? false,
                mediaUrl: media?.storage_key ?? null,
                mediaCaption: row.type === 'document' ? row.body : null,
                raw_payload: row.raw_payload ?? null,
                sender_contact: senderContact,
            };
        });

        const result = {
            success: true,
            messages,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
        messagesCache.set(cacheKey, {
            value: result,
            expiresAt: now + MESSAGES_CACHE_TTL_MS,
        });
        return result;
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat pesan WhatsApp') };
    }
}

export async function getMessageAction(messageId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('wa_messages')
            .select(
                `
                id,
                chat_id,
                external_message_id,
                body,
                type,
                direction,
                sender_type,
                status,
                sent_at,
                quoted_message_id,
                is_forwarded,
                is_deleted,
                raw_payload,
                wa_message_media (
                    storage_key,
                    media_type
                )
                `
            )
            .eq('id', messageId)
            .single();

        if (error) throw error;

        const row = data as unknown as {
            id: string;
            chat_id: string;
            external_message_id: string;
            body: string | null;
            type: string;
            direction: string;
            sender_type: string;
            status: string;
            sent_at: string;
            quoted_message_id?: string | null;
            is_forwarded?: boolean | null;
            is_deleted?: boolean | null;
            raw_payload?: unknown;
            wa_message_media?: { storage_key?: string | null; media_type?: string | null }[] | { storage_key?: string | null; media_type?: string | null } | null;
        };

        let senderContact = null;
        if (row.chat_id.endsWith('@g.us') && row.raw_payload) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload = row.raw_payload as Record<string, any>;
            const author = payload.author || payload._data?.author || payload.participant;
            if (typeof author === 'string') {
                const { data: contact } = await supabase
                    .from('wa_contacts')
                    .select('id, wa_id:wa_jid, name:display_name, phone, avatar_url, last_message_at')
                    .eq('wa_jid', author)
                    .single();
                
                if (contact) {
                    senderContact = contact;
                }
            }
        }

        const mediaRelation = row.wa_message_media;
        const media =
            Array.isArray(mediaRelation) ? mediaRelation[0] : mediaRelation || null;

        const message = {
            id: row.id,
            external_message_id: row.external_message_id,
            chat_id: row.chat_id,
            body: row.body,
            type: row.type,
            direction: row.direction as 'inbound' | 'outbound',
            sender_type: row.sender_type as 'customer' | 'agent' | 'system',
            status: row.status,
            sent_at: row.sent_at,
            quoted_message_id: row.quoted_message_id ?? null,
            is_forwarded: row.is_forwarded ?? false,
            is_deleted: row.is_deleted ?? false,
            mediaUrl: media?.storage_key ?? null,
            mediaCaption: row.type === 'document' ? row.body : null,
            raw_payload: row.raw_payload ?? null,
            sender_contact: senderContact,
        };

        return { success: true, message };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat pesan') };
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

export interface SegmentFilter {
    labelIds?: string[];
    region?: string;
    projectStatus?: string;
}

export async function countBroadcastRecipientsAction(filters: SegmentFilter) {
    const supabase = await createClient();
    try {
        let query = supabase
            .from('wa_contacts')
            .select('id', { count: 'exact', head: true });

        // Filter by Region
        if (filters.region) {
            query = query.eq('region', filters.region);
        }

        // Filter by Labels (requires join with wa_chats -> wa_chat_labels)
        if (filters.labelIds && filters.labelIds.length > 0) {
            // We use !inner to ensure we only get contacts that have the matching labels
            // Note: This logic assumes "OR" for labels (any of the selected labels)
            query = query.not('wa_chats', 'is', null); // Ensure they have a chat
            
            // Complex filtering on many-to-many is hard with simple query builder
            // We'll use a subquery approach for labels:
            // Get chat_ids that have these labels first
            const { data: chatsWithLabels } = await supabase
                .from('wa_chat_labels')
                .select('chat_id')
                .in('label_id', filters.labelIds);
            
            if (chatsWithLabels && chatsWithLabels.length > 0) {
                const chatIds = chatsWithLabels.map(c => c.chat_id);
                // Now find contacts associated with these chats
                const { data: contactsWithChats } = await supabase
                    .from('wa_chats')
                    .select('contact_id')
                    .in('id', chatIds);
                
                if (contactsWithChats && contactsWithChats.length > 0) {
                    const contactIds = contactsWithChats.map(c => c.contact_id);
                    query = query.in('id', contactIds);
                } else {
                    return { count: 0 };
                }
            } else {
                return { count: 0 };
            }
        }

        const { count, error } = await query;
        
        if (error) throw error;
        return { count: count || 0 };
    } catch (error: unknown) {
        return { count: 0, error: getErrorMessage(error) };
    }
}

export async function getQuickRepliesAction() {
    const supabase = await createClient();
    try {
        const { data: replies, error } = await supabase
            .from('wa_quick_replies')
            .select('*')
            .eq('is_active', true)
            .order('title');
            
        if (error) throw error;
        return { success: true, replies };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}

export type AutoReplyTemplate = {
    id?: string;
    code: string;
    title: string;
    body_template: string;
    is_active?: boolean;
};

export async function getAutoReplyTemplatesAction() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('wa_quick_replies')
            .select('*')
            .ilike('code', 'AUTO_%')
            .order('code', { ascending: true });

        if (error) throw error;
        return { success: true, templates: data as AutoReplyTemplate[] };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat auto-reply templates') };
    }
}

export async function upsertAutoReplyTemplateAction(payload: AutoReplyTemplate) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const code = payload.code.trim().toUpperCase();
        if (!code.startsWith('AUTO_')) {
            throw new Error('Kode auto-reply harus diawali dengan "AUTO_"');
        }

        const data = {
            code,
            title: payload.title.trim() || code,
            body_template: payload.body_template,
            is_active: payload.is_active ?? true,
        };

        if (payload.id) {
            const { error } = await supabase
                .from('wa_quick_replies')
                .update(data)
                .eq('id', payload.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('wa_quick_replies')
                .insert(data);
            if (error) throw error;
        }

        revalidatePath('/admin/settings/whatsapp-auto-replies');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menyimpan auto-reply template') };
    }
}

export async function deleteAutoReplyTemplateAction(id: string) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { error } = await supabase
            .from('wa_quick_replies')
            .delete()
            .eq('id', id);
        if (error) throw error;

        revalidatePath('/admin/settings/whatsapp-auto-replies');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menghapus auto-reply template') };
    }
}

export async function createBroadcastCampaignAction(name: string, template: string, segmentFilter: SegmentFilter = {}, scheduleAt?: string) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User tidak terautentikasi');

        const { data: campaign, error } = await supabase
            .from('wa_broadcast_campaigns')
            .insert({
                name,
                segment_filter_json: segmentFilter,
                schedule_at: scheduleAt || null,
                status: scheduleAt ? 'scheduled' : 'draft',
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
        // 1. Get campaign to read filters
        const { data: campaign, error: fetchError } = await supabase
            .from('wa_broadcast_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();
            
        if (fetchError || !campaign) throw new Error('Kampanye tidak ditemukan');

        const filters = campaign.segment_filter_json as SegmentFilter;

        const { error: campaignError } = await supabase
            .from('wa_broadcast_campaigns')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        if (campaignError) throw campaignError;

        // 2. Fetch recipients based on filters
        let query = supabase
            .from('wa_contacts')
            .select('wa_jid, display_name, id');

        // Apply filters (duplicate logic from count - refactor if possible but keeping simple for now)
        if (filters?.region) {
            query = query.eq('region', filters.region);
        }

        if (filters?.labelIds && filters.labelIds.length > 0) {
             const { data: chatsWithLabels } = await supabase
                .from('wa_chat_labels')
                .select('chat_id')
                .in('label_id', filters.labelIds);
            
            if (chatsWithLabels && chatsWithLabels.length > 0) {
                const chatIds = chatsWithLabels.map(c => c.chat_id);
                const { data: contacts } = await supabase
                    .from('wa_chats')
                    .select('contact_id')
                    .in('id', chatIds);
                
                if (contacts && contacts.length > 0) {
                    const contactIds = contacts.map(c => c.contact_id);
                    query = query.in('id', contactIds);
                } else {
                    query = query.in('id', []); // No matches
                }
            } else {
                query = query.in('id', []); // No matches
            }
        }

        const { data: contacts } = await query;


        const recipients = contacts || [];
        let successCount = 0;
        let failedCount = 0;

        // Send messages
        for (const contact of recipients) {
            try {
                const message = template.replace('{{name}}', contact.display_name || 'Pelanggan');
                const result = await waha.sendMessage(contact.wa_jid, message);
                if (result?.id) {
                    successCount++;
                } else {
                    failedCount++;
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch {
                failedCount++;
            }
        }

        await supabase
            .from('wa_broadcast_campaigns')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        return { success: true, successCount, failedCount };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim broadcast') };
    }
}

export async function getLabelsAction() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('wa_labels')
            .select('*')
            .order('name');
        if (error) throw error;
        return { success: true, labels: data };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat label') };
    }
}

export async function createLabelAction(name: string, color: string) {
    const supabase = await createClient();
    try {
        const code = name.toLowerCase().replace(/\s+/g, '_');
        const { data, error } = await supabase
            .from('wa_labels')
            .insert({ name, color, code })
            .select()
            .single();
        if (error) throw error;
        revalidatePath('/admin/whatsapp');
        return { success: true, label: data };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal membuat label') };
    }
}

export async function getChatLabelsAction(chatId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('wa_chat_labels')
            .select('*, label:wa_labels(*)')
            .eq('chat_id', chatId);
        if (error) throw error;
        return { success: true, chatLabels: data };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal memuat label chat') };
    }
}

export async function assignLabelAction(chatId: string, labelId: string) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User tidak terautentikasi');

        const { error } = await supabase
            .from('wa_chat_labels')
            .insert({
                chat_id: chatId,
                label_id: labelId,
                created_by: user.id
            });
        if (error) throw error;
        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menambahkan label') };
    }
}

export async function removeLabelAction(chatId: string, labelId: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('wa_chat_labels')
            .delete()
            .eq('chat_id', chatId)
            .eq('label_id', labelId);
        if (error) throw error;
        revalidatePath('/admin/whatsapp');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal menghapus label') };
    }
}
