
# Analisis & Perbaikan Event Webhook WhatsApp (WAHA)

**Tanggal:** 2026-03-11
**Topik:** Fix TypeError `group.getInviteCode` & Support 29 Event Types
**Status:** ✅ Resolved (Integration Side) / ⚠️ Pending (WAHA Internal Patch)

## 1. Root Cause Analysis (`TypeError: group.getInviteCode is not a function`)

Error ini terjadi di sisi **engine WAHA** (bukan di kode Next.js Kokohin), tepatnya pada file `/app/dist/core/engines/webjs/groups.webjs.js`.

**Penyebab:**
Fungsi `ToGroupV2UpdateEvent` mencoba memanggil `group.getInviteCode()` pada objek `group` yang kemungkinan `null`, `undefined`, atau belum terinisialisasi sepenuhnya saat event `group.v2.update` dipicu. Hal ini sering terjadi pada library `whatsapp-web.js` (basis engine WAHA) ketika sinkronisasi grup belum selesai atau terjadi race condition.

**Solusi (Manual Patch pada WAHA):**
Karena kode ini berada di dalam container/image WAHA, Anda perlu melakukan patch manual pada source code WAHA jika Anda menjalankannya dari source atau memiliki akses ke file tersebut di dalam volume Docker.

**Lokasi:** `/app/dist/core/engines/webjs/groups.webjs.js` (Baris ~72)

**Kode Sebelum:**
```javascript
const inviteCode = await group.getInviteCode();
```

**Kode Sesudah (Fix):**
```javascript
// Tambahkan pengecekan null safety
const inviteCode = (group && typeof group.getInviteCode === 'function') 
    ? await group.getInviteCode().catch(() => null) 
    : null;
```

> **Catatan:** Jika Anda menggunakan image Docker pre-built, disarankan untuk mengupdate ke versi WAHA terbaru atau melaporkan issue ini ke maintainer WAHA.

## 2. Dukungan 29 Event Tipe

Telah dilakukan update pada kode registrasi webhook di `src/app/actions/whatsapp.ts` untuk mendaftarkan **seluruh 29 tipe event** yang diminta agar dikirimkan oleh WAHA ke endpoint Kokohin.

**Daftar Event:**
1. `session.status`
2. `message`
3. `message.any`
4. `message.reaction`
5. `message.ack`
6. `message.ack.group`
7. `message.waiting`
8. `message.revoked`
9. `message.edited`
10. `chat.archive`
11. `group.v2.join`
12. `group.v2.leave`
13. `group.v2.update`
14. `group.v2.participants`
15. `group.join`
16. `group.leave`
17. `presence.update`
18. `poll.vote`
19. `poll.vote.failed`
20. `call.received`
21. `call.accepted`
22. `call.rejected`
23. `label.upsert`
24. `label.deleted`
25. `label.chat.added`
26. `label.chat.deleted`
27. `event.response`
28. `event.response.failed`
29. `engine.event`

## 3. Verifikasi Handler Webhook

Endpoint `/api/public/whatsapp/webhook` telah diverifikasi memiliki mekanisme **catch-all logging**. Artinya, semua event di atas akan otomatis tersimpan ke tabel `wa_webhook_events` meskipun belum ada business logic spesifik untuk setiap event.

**Hasil Test:**
Script simulasi `scripts/test-all-events.ts` berhasil mengirimkan ke-29 tipe event tersebut dan memverifikasi bahwa semuanya sukses tersimpan di database (`wa_webhook_events`) dan endpoint mengembalikan `200 OK`.

```bash
# Cara menjalankan verifikasi ulang
npx tsx scripts/test-all-events.ts
```

## 4. Rekomendasi Selanjutnya

1.  **Pantau Log:** Cek tabel `wa_webhook_events` untuk melihat payload asli dari event-event baru (seperti `poll.vote` atau `call.received`) guna merancang fitur masa depan.
2.  **Handling Spesifik:** Jika di masa depan dibutuhkan logika khusus (misal: notifikasi saat ada `call.missed`), tambahkan blok `if (event === 'call.missed')` di `src/app/api/public/whatsapp/webhook/route.ts`.
