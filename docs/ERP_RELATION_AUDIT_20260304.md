# ERP Relation Audit — 2026-03-04

## Ringkasan Temuan

1. **Alamat customer tidak konsisten tersimpan**
   - Auto-save metadata di editor ERP mengupdate `erp_customer_profiles` berbasis `phone` saja.
   - Data alamat pada tabel `leads.location` tidak ikut disinkronkan saat user mengubah alamat di editor.
   - Akibatnya PDF dan tampilan lain yang membaca alamat dari `leads` bisa menampilkan alamat lama/kosong.

2. **Arah relasi customer-profile berpotensi terbalik**
   - Trigger `sync_lead_to_customer_profile()` memakai `ON CONFLICT (phone)` dan menimpa `lead_id`.
   - Pada kasus nomor telepon sama, `lead_id` profile bisa berpindah ke lead terbaru, menyebabkan asosiasi historis bergeser.

3. **Constraint delete tidak sesuai alur bisnis**
   - FK `erp_customer_profiles.lead_id` awalnya tidak eksplisit `ON DELETE SET NULL`.
   - Ini berpotensi menahan operasi hapus data terkait customer (lead), padahal profile seharusnya tidak memblokir lifecycle quotation.

## Perbaikan yang Diterapkan

### 1) Perbaikan struktur relasi dan constraint

Migration baru:
- `supabase/migrations/20260304_fix_customer_quote_relations_and_delete_constraints.sql`

Isi utama:
- Menetapkan FK `erp_customer_profiles.lead_id -> leads.id ON DELETE SET NULL`.
- Menambahkan `UNIQUE (lead_id)` untuk menjaga satu profile per lead.
- Menambahkan index:
  - `idx_erp_quotations_lead_id`
  - `idx_erp_customer_profiles_lead_id`
- Memperbaiki trigger `sync_lead_to_customer_profile()` agar:
  - tetap conflict by `phone`,
  - **tidak membalik lead_id** (`lead_id = COALESCE(existing.lead_id, excluded.lead_id)`),
  - mengisi alamat awal dari `leads.location` bila profile masih kosong.

### 2) Perbaikan logic aplikasi untuk penyimpanan alamat

File:
- `src/components/admin/erp/editor/hooks/useErpMetadata.ts`

Perubahan utama:
- Menambahkan `leadIdForCustomer` agar sinkronisasi profile berbasis `lead_id` menjadi deterministik.
- Auto-save sekarang:
  - update/insert `erp_customer_profiles` dengan `address`, `email`, `name`, `phone`,
  - sinkronkan `leads.location` dari `customerAddress`.
- Fetch metadata untuk quotation/contract/invoice kini ambil profile via query langsung ke `erp_customer_profiles` berdasarkan `lead_id` (bukan nested relation semu).

### 3) Konsistensi alamat pada PDF penawaran

File:
- `src/components/admin/GeneratePdfButton.tsx`

Perubahan utama:
- Menambahkan enrichment profile (`erp_customer_profiles.address`) saat menyiapkan data PDF.
- Prioritas alamat PDF menjadi:
  1) `customer_profile.address`
  2) `leads.location`
  3) `quotation.client_address`

## Dampak pada Rule Bisnis

- Relasi utama tetap: **1 customer (lead/profile) -> banyak quotation** melalui `erp_quotations.lead_id`.
- Penghapusan quotation tidak mensyaratkan penghapusan customer profile.
- Operasi CRUD tidak lagi rentan constraint violation karena relasi profile ke lead bersifat `SET NULL` saat lead dihapus.
