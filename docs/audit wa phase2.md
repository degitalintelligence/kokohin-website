WhatsApp CRM - Architecture Audit & Action Plan (PHASE 2)

Target Audience: Lead Developer / Fullstack Engineer
Objective: Eliminate Vercel execution timeouts, fix N+1 Database Queries, and secure public endpoints for High-Volume Scaling.

🚨 LEVEL 1: CRITICAL (Vercel Timeouts & Database Killers)

1. The N+1 Query Murderer in Group Sync ✅ SUDAH DIOPTIMALKAN

File: src/app/actions/whatsapp.ts -> syncGroupMembersForChat
Issue (SEBELUMNYA): Saat sinkronisasi grup WhatsApp, kode menjalankan for loop yang memanggil supabase.from('wa_contacts').upsert(...) dan wa_group_members.upsert(...) untuk setiap participant. Untuk 200 anggota, berarti ±400 call Supabase sequential dalam satu Server Action.
Business Impact: UI sangat lambat (10–20 detik untuk load), risiko tinggi Supabase connection pool exhaustion dan Vercel 504 timeout.
Solution (SAAT INI): Loop sudah direfactor menjadi bulk upsert:
- Satu upsert wa_contacts untuk seluruh anggota grup sekaligus.
- Satu upsert wa_group_members untuk seluruh relasi chat_id/contact_id.
Hasil: Jumlah query turun drastis (dari ratusan menjadi 2 query utama) dan sinkronisasi grup jauh lebih cepat dan aman terhadap timeout.
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

    // 2. Upsert the Group Chat
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

    // --- BULK UPSERT OPTIMIZATION START ---
    
    // Prepare all contacts data
    const validParticipants = participants.filter(p => typeof p.id === 'string' && p.id);
    const contactsData = validParticipants.map(p => {
        const jid = p.id as string;
        return {
            wa_jid: jid,
            phone: jid.split('@')[0]?.replace(/\D/g, '') || null,
        };
    });

    // 3. Bulk Upsert All Members to Contacts in ONE query
    const { data: upsertedContacts, error: bulkContactsError } = await supabase
        .from('wa_contacts')
        .upsert(contactsData, { onConflict: 'wa_jid' })
        .select('id, wa_jid');

    if (bulkContactsError || !upsertedContacts) {
        console.error('Bulk contacts upsert failed:', bulkContactsError);
        return { chatId: chatRow.id, membersSynced: 0 };
    }

    // Map JID to Database ID for quick lookup
    const jidToContactId = new Map(upsertedContacts.map(c => [c.wa_jid, c.id]));

    // Prepare all group members relational data
    const groupMembersData = validParticipants.map(p => {
        const jid = p.id as string;
        const role = p.isSuperAdmin === true ? 'superadmin' : p.isAdmin === true ? 'admin' : 'member';
        const contactId = jidToContactId.get(jid);
        
        if (!contactId) return null;
        
        return {
            chat_id: chatRow.id,
            contact_id: contactId,
            role,
        };
    }).filter(Boolean); // Remove nulls

    // 4. Bulk Upsert All Group Memberships in ONE query
    if (groupMembersData.length > 0) {
        const { error: bulkMembersError } = await supabase
            .from('wa_group_members')
            .upsert(groupMembersData, { onConflict: 'chat_id,contact_id' });

        if (bulkMembersError) {
            console.error('Bulk members upsert failed:', bulkMembersError);
            return { chatId: chatRow.id, membersSynced: 0 };
        }
    }

    return { chatId: chatRow.id, membersSynced: groupMembersData.length };
}


2. The Broadcast Time-Bomb ✅ DIARAHKAN KE JOB QUEUE

File: src/app/actions/whatsapp.ts -> sendBroadcastAction
Issue (SEBELUMNYA): Broadcast dieksekusi di dalam for loop di Server Action, dengan delay manual: await new Promise(resolve => setTimeout(resolve, 500)). Untuk 1.000 penerima, total waktu bisa mencapai 500 detik sehingga melebihi timeout Vercel. Proses bisa mati di tengah dan status kampanye tidak jelas.
Solution (SAAT INI):
- sendBroadcastAction hanya:
  - Membaca campaign dan filter segmentasi.
  - Mengubah status kampanye menjadi 'queued'.
  - Menulis satu record ke tabel wa_broadcast_jobs dengan payload (campaign_id, template, filters, status='pending').
- Tidak ada lagi loop pengiriman di dalam Server Action. Eksekusi broadcast actual diharapkan dijalankan oleh worker/job terpisah (Edge Function / background worker) yang membaca wa_broadcast_jobs.
Implikasi: Server Action jadi sangat cepat dan aman dari timeout; logic retry/rate limiting bisa diimplementasikan di level job processor.

🟡 LEVEL 2: SECURITY & DATA INTEGRITY

3. Unprotected Public Endpoints ✅ SUDAH DILIMIT RATE

File: /api/public/submit-lead-with-estimation/route.ts & /api/public/book-survey/route.ts
Issue (SEBELUMNYA): Kedua public route ini langsung insert ke database tanpa rate limiting. Bot bisa spam dan memenuhi leads / survey bookings.
Solution (SAAT INI):
- Menambahkan rate limiting berbasis IP menggunakan util createRateLimiter:
  - submit-lead-with-estimation: prefix 'submit-lead', window 3600 detik, max 5 request per IP.
  - book-survey: prefix 'book-survey', window 3600 detik, max 5 request per IP.
- Jika limit terlewati, API mengembalikan errorResponse dengan kode 'TOO_MANY_REQUESTS' dan HTTP 429.
Catatan: Logika rate limit memanfaatkan header x-forwarded-for; dapat disesuaikan lagi jika ada proxy/CDN di depan.

4. Idempotency Key Reuse Risk ✅ DIPAKSA DARI CLIENT

File: src/app/actions/whatsapp.ts -> sendMessageAction
Issue (SEBELUMNYA): Jika options?.idempotencyKey tidak diisi, server memakai fallback crypto.randomUUID(). Artinya setiap retry client menghasilkan UUID baru sehingga idempotency tidak tercapai.
Solution (SAAT INI):
- sendMessageAction:
  - Jika options.idempotencyKey tidak ada, langsung mengembalikan error: 'idempotencyKey wajib dikirim dari client'.
  - Tidak ada lagi fallback crypto.randomUUID di server.
- sendMediaMessageAction:
  - Wajib menerima payload.idempotencyKey; jika tidak ada, mengembalikan error yang sama.
- Client (WhatsAppWebClient/Broadcast, dst.) perlu memastikan selalu meng-generate idempotencyKey di browser sebelum memanggil Server Action.
Implikasi: Retry di sisi client dengan idempotencyKey yang sama akan benar-benar idempotent, karena server cek wa_messages.idempotency_key sebelum mengirim dan menyimpan pesan baru.
