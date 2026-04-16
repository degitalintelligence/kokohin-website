WhatsApp CRM - Architecture Audit & Action Plan

Target Audience: Lead Developer / Fullstack Engineer
Objective: Refactor MVP codebase to be Production-Ready, Vercel-Safe, and highly scalable without ballooning server costs.

🚨 LEVEL 1: CRITICAL (Fix Immediately - System Crashers)

1. In-Memory Cache in Serverless Environment

File: src/app/actions/whatsapp.ts
Issue: You are using new Map() for contactsCache and messagesCache. In a serverless environment (like Vercel/AWS Lambda), instances are spun up and down dynamically. This means User A might hit Instance 1 (sees cache), and User B hits Instance 2 (empty cache). This causes "Ghost Data" where chats appear and disappear randomly. Also, it causes memory leaks.
Business Impact: CS team will miss incoming chats. Leads get cold. Conversion rate drops.
Solution: Remove the Node.js Map cache entirely. Rely on Supabase's speed, or use Redis if caching is strictly necessary.

Action (Code Replacement):
Remove these lines at the top of src/app/actions/whatsapp.ts:

// HAPUS BARIS INI:
// const contactsCache = new Map<string, CacheEntry<unknown>>();
// const messagesCache = new Map<string, CacheEntry<unknown>>();
// function clearContactsCache() { ... }
// function clearMessagesCacheForChat(chatId: string) { ... }


Then, rewrite getPaginatedContactsAction to remove cache logic (Full Function):

export async function getPaginatedContactsAction(page = 1, limit = 20, search = '') {
    const supabase = await createClient();
    try {
        const offset = (page - 1) * limit;
        let warning: string | null = null;
        const normalizedSearch = search.trim();

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

        if (error) throw error;

        const shouldBootstrap = (!data || data.length === 0) && !normalizedSearch && page === 1;
        if (shouldBootstrap) {
            try {
                // Gunakan fungsi bootstrapChatsFromWaha yang sudah ada di codebase
                const synced = await bootstrapChatsFromWaha(supabase, Math.max(limit, 50));
                if (synced > 0) {
                    const refreshed = filteredContactIds && filteredContactIds.length > 0
                        ? await baseQuery().in('contact_id', filteredContactIds)
                        : await baseQuery();
                    data = refreshed.data;
                    count = refreshed.count;
                    error = refreshed.error;
                    if (error) throw error;
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


(Note untuk Dev: Lakukan hal yang sama untuk menghapus cache pada fungsi getPaginatedMessagesAction).

2. OOM (Out of Memory) Risk on File Uploads

File: src/app/actions/whatsapp.ts -> sendMediaMessageAction
Issue: Passing entire files (Buffer.from(await payload.file.arrayBuffer())) through Next.js Server Actions will exceed Vercel's payload limits (4.5MB) and cause memory spikes.
Business Impact: CS cannot send catalogs/proposals larger than a few MBs. Server crashes.
Solution: Upload files directly from the Client (Browser) to Supabase Storage, then pass only the URL to the Server Action to forward to WAHA.

Action:

Update UI Component to upload to Supabase first.

Replace sendMediaMessageAction entirely (Full Function):

type SendMediaInputUrl = {
    fileName: string;
    fileSize: number;
    mimeType: string;
    mediaUrl: string; // URL publik dari Supabase Storage
    caption?: string;
    idempotencyKey?: string;
};

export async function sendMediaMessageAction(chatId: string, payload: SendMediaInputUrl) {
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

        const mediaType = detectMediaType(payload.mimeType);
        if (!mediaType) return { success: false, error: 'Format file tidak didukung.' };

        // WAHA will download the file from this URL and send it
        const result = await sendWithRetry(
            () =>
                waha.sendMedia(chatId, {
                    url: payload.mediaUrl,
                    caption: payload.caption,
                    filename: payload.fileName,
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
                body: payload.caption ?? payload.fileName,
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
            mime_type: payload.mimeType,
            size_bytes: payload.fileSize,
            storage_key: payload.mediaUrl, // Simpan URL, bukan file path
        });
        if (mediaError) throw mediaError;

        revalidatePath('/admin/whatsapp');
        return { success: true, messageId: externalId };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Gagal mengirim media WhatsApp') };
    }
}


🟡 LEVEL 2: HIGH (UX & Scale Blockers)

3. Pagination "Offset" in Chat App = Disaster ✅ SUDAH DIREFIKTOR

File: src/app/actions/whatsapp.ts -> getPaginatedMessagesAction
Issue (SEBELUMNYA): Menggunakan .range(offset, offset + limit - 1) di real-time chat app berisiko. Jika ada 3 pesan baru masuk saat user scroll ke atas, offset bergeser. User bisa melihat pesan duplikat (React key error) atau kehilangan pesan lama.
Business Impact: Buggy UI. CS bisa kehilangan konteks saat membaca histori percakapan.
Solution (SAAT INI): getPaginatedMessagesAction sekarang mendukung cursor-based pagination berbasis sent_at:
- Server menerima parameter optional cursor (ISO date string).
- Query menambahkan kondisi sent_at < cursor untuk halaman berikutnya.
- Urutan tetap sent_at descending, sehingga batch berikut selalu lebih lama dari batch yang sudah di-load.
Catatan implementasi: Client WhatsApp (OptimizedWhatsAppClient & WhatsAppWebClient) sudah menggunakan sent_at pesan tertua sebagai cursor ketika melakukan "load more".

4. Blind Webhook Processing ✅ SUDAH DIKERAS-KAN

File: src/app/api/public/whatsapp/webhook/route.ts
Issue (SEBELUMNYA): Handler webhook memproses event WAHA secara sinkron dan melakukan banyak operasi berat (log ke wa_webhook_events, upsert wa_contacts/wa_chats/wa_messages, status log, media log) di dalam lifecycle request. Jika total waktu >10 detik, Vercel bisa memutus request (timeout) dan WAHA menganggap webhook gagal.
Solution (SAAT INI):
1. Route sekarang segera mengembalikan 200 OK setelah payload divalidasi dan di-parse:
   - Response NextResponse.json({ success: true }) dipersiapkan lebih dulu.
2. Seluruh pekerjaan berat (DB write, auto-reply) dijalankan di background dengan IIFE async yang tidak di-await:
   - Log ke wa_webhook_events dengan status 'received'.
   - Upsert wa_contacts, wa_chats, wa_messages, wa_message_media, wa_message_status_log, wa_sessions, wa_group_members.
3. Error di proses async dicatat via console.error tetapi tidak mempengaruhi response ke WAHA.
Catatan: Arsitektur ini tetap bisa ditingkatkan lagi dengan queue (Upstash QStash) atau Supabase Edge Function, tetapi versi sekarang sudah aman dari timeout dasar.

5. Supabase Realtime Over-fetching ✅ SUDAH DIKERAS-KAN

File: src/app/admin/whatsapp/components/OptimizedWhatsAppClient.tsx & src/app/admin/whatsapp/components/WhatsAppWebClient.tsx
Issue (SEBELUMNYA): Realtime client subscribe ke whatsapp_messages tanpa filter chat_id. OptimizedWhatsAppClient.tsx memakai { event: '*', schema: 'public', table: 'whatsapp_messages' }, dan WhatsAppWebClient.tsx hanya memfilter di client side. Akibatnya setiap agent menerima semua event.
Business Impact: Jika 50 agent online dan ada broadcast ke 10.000 user, semua browser agent menerima 10.000 event WebSocket sekaligus dan bisa freeze.
Solution (SAAT INI):
- OptimizedWhatsAppClient.tsx:
  - Channel 'wa_chats_changes' tetap memonitor whatsapp_chats untuk refresh daftar kontak.
  - Subscription ke whatsapp_messages sekarang memakai filter chat_id=eq.${selectedContactId} untuk INSERT, hanya ketika ada selectedContactId.
- WhatsAppWebClient.tsx:
  - Subscription INSERT/UPDATE ke whatsapp_messages kini menggunakan filter chat_id=eq.${selectedContactId} ketika chat aktif ada.
  - Hanya jika tidak ada selectedContactId, fallback ke subscription tanpa filter (mode lama).
Catatan implementasi: Satu channel global tetap dipakai untuk update unread count (via perubahan whatsapp_chats), sedangkan payload pesan individual dibatasi per chat_id yang sedang aktif.

End of Audit
