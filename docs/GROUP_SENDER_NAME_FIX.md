# Laporan Perbaikan: Nama Pengirim Grup Tidak Muncul di Bubble Chat

**Tanggal:** 2026-03-11
**Isu:** Nama pengirim di grup WhatsApp (bubble chat) tidak muncul atau kosong.

## 1. Analisis Root Cause
Masalah terletak pada cara aplikasi memparsing payload pesan dari WAHA.
- **Struktur Payload:** Payload pesan WAHA (`raw_payload`) memiliki properti `notifyName` dan `senderName` di level root, tetapi terkadang properti ini `undefined` atau `null`.
- **Data Tersembunyi:** Data nama pengirim yang valid sebenarnya tersimpan di dalam objek nested `_data` (misal: `raw_payload._data.notifyName`), namun logika lama tidak mengakses properti ini.
- **Dampak:** Fungsi `getGroupSenderLabel` mengembalikan `null`, sehingga UI tidak menampilkan nama pengirim.

## 2. Solusi
Telah dilakukan perbaikan pada logika ekstraksi nama pengirim.

### 2.1 Refactoring Code
Logika `getGroupSenderLabel` dipisahkan dari komponen UI ke file utility baru agar lebih modular dan mudah dites.
- **File Baru:** `src/app/admin/whatsapp/utils/message.ts`
- **File Terdampak:**
  - `src/app/admin/whatsapp/components/web-client/MessageBubble.tsx`
  - `src/app/admin/whatsapp/components/ChatWindow.tsx`

### 2.2 Perubahan Logika
Fungsi kini memeriksa properti nested `_data` sebagai fallback jika properti di root kosong.

```typescript
// Sebelum
const notifyName = typeof payload.notifyName === 'string' ? payload.notifyName : null;

// Sesudah
const data = (payload._data as Record<string, any>) || {};
const notifyName = typeof payload.notifyName === 'string' ? payload.notifyName : 
                   (typeof data.notifyName === 'string' ? data.notifyName : null);
```

## 3. Verifikasi
Script verifikasi `scripts/verify-sender-name-logic.ts` telah dijalankan dengan mock payload yang meniru struktur data asli (dimana root `notifyName` undefined tapi `_data.notifyName` ada).

**Hasil:**
```
Testing getGroupSenderLabel...
Result: Hawra Tustari
SUCCESS: Correctly extracted sender name from nested _data
```

## 4. Rekomendasi
- Pantau tampilan bubble chat di grup untuk memastikan nama pengirim muncul konsisten.
- Jika ada variasi payload lain di masa depan, update `src/app/admin/whatsapp/utils/message.ts`.
