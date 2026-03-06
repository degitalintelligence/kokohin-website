# 🤖 Kokohin Engineering Rules

Dokumen ini adalah **standar wajib** untuk AI agent dan developer manusia pada project **Kokohin Web & Mini-ERP**.

- **Stack utama:** Next.js (App Router), Tailwind CSS, Supabase (self-hosted)
- **Tujuan:** menjaga stabilitas sistem, konsistensi kualitas, dan keamanan perubahan
- **Status aturan:** seluruh poin di bawah ini bersifat **mandatory** kecuali ditandai sebagai rekomendasi

---

## 0. Prinsip Eksekusi Wajib

1. Jangan refactor besar pada modul yang sudah stabil tanpa instruksi eksplisit.
2. Setiap perubahan harus bisa dijelaskan, diuji, dan ditelusuri.
3. Utamakan perubahan kecil, terukur, dan aman terhadap data produksi.
4. Jangan pernah mengekspos secret, token, atau credential ke client/log/repository.

---

## 1. Brand Guidelines & UI

### 1.1 Font

- Wajib gunakan **Montserrat** secara eksklusif.
- Dilarang mengganti ke Inter, Roboto, Arial, atau font lain untuk UI utama.

### 1.2 Warna Brand

- **Primary Red:** `#E30613` untuk CTA, highlight, aksen utama.
- **Primary Black:** `#1D1D1B` untuk teks utama, background gelap, elemen solid.

### 1.3 Tata Letak

- Gunakan whitespace yang lega.
- Hindari UI padat, rapat, dan saling menempel.

### 1.4 Contoh Implementasi

```tsx
<button className="btn btn-primary font-sans px-6 py-3">
  Simpan Perubahan
</button>
```

---

## 2. Standar Revisi Kode

### 2.1 Larangan Utama

- Dilarang berasumsi lalu mengubah alur bisnis yang sudah berjalan.

### 2.2 Format Penyajian Revisi

- **Revisi minor (1–2 baris):** tampilkan hanya baris yang berubah + lokasi spesifik.
- **Revisi mayor dalam function (>3 baris):** tampilkan full function.
- **Revisi file:**
  - Jika file `< 500` baris: boleh full rewrite.
  - Jika file `> 500` baris: tampilkan hanya section/function/component yang berubah.

---

## 3. Backend & Business Logic Constraints

### 3.1 Waste Calculation (Wajib Math.ceil)

- Semua material batangan/lembaran utuh wajib dibulatkan ke atas.
- Sisa potongan dibebankan ke customer.

```ts
const batang = Math.ceil(kebutuhanMeter / panjangPerBatang)
```

### 3.2 Laser Cut Calculation

- Material plat laser cut dihitung berdasarkan **lembar standar**, bukan per meter lari/persegi.

```ts
const sheetArea = 1.22 * 2.44
const sheetNeeded = Math.ceil(areaNeeded / sheetArea)
```

### 3.3 Escape Hatch untuk Custom Request

- Jika `jenis === 'custom'`, bypass seluruh auto-pricing.
- Simpan status project: `Need Manual Quote`.
- Jangan return harga dummy atau `NaN` ke UI.

```ts
if (input.jenis === 'custom') {
  return { estimatedPrice: 0, totalSellingPrice: 0, breakdown: [] }
}
```

---

## 4. Workflow Injections

- Saat membuat komponen baru, pastikan Montserrat + warna brand sudah diterapkan.
- Dilarang install package eksternal baru tanpa persetujuan user.
- Pengecualian: library esensial ekosistem Next.js seperti `lucide-react`.

---

## 5. Build & Quality Gates

Sebelum merge/publish, wajib jalankan:

```bash
npm run typecheck
npm run lint
```

Aturan:

- Dilarang merge jika ada error TypeScript.
- Dilarang merge jika lint error.
- Ikuti pola Next.js App Router dan hindari side effect yang mengganggu SSR/ISR.

---

## 6. Database Migrations

### 6.1 Aturan Inti

- Semua perubahan schema harus melalui `supabase/migrations/`.
- Migration wajib idempoten (`IF NOT EXISTS`, `ON CONFLICT`, atau guard `information_schema`).
- Dilarang DDL ad-hoc di produksi tanpa file migration.

### 6.2 Perintah Eksekusi

```bash
npm run migrate:apply
```

Jika perlu eksekusi terarah, gunakan skrip `scripts/run-migration-*.js`.

### 6.3 Prasyarat Environment

- `.env.local` wajib memiliki:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 6.4 Contoh Migration Idempoten

```sql
ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS base_price_unit text;
```

---

## 7. API, RLS & RBAC

### 7.1 Client Supabase

- Route server wajib menggunakan `@/lib/supabase/server`.

### 7.2 Aturan Endpoint

- Endpoint publik hanya boleh return data aktif (`is_active = true`).
- Endpoint admin wajib cek role via `profiles` + `isRoleAllowed`.

Role yang wajib dipakai:

- `ALLOWED_MATERIALS_ROLES = ['super_admin']`
- `ALLOWED_ADMIN_ROLES = ['super_admin','admin_sales','admin_proyek']`

### 7.3 Error Response API

- Gunakan pola konsisten: `code`, `message`, `details`.

```json
{
  "code": "FORBIDDEN",
  "message": "Forbidden",
  "details": null
}
```

### 7.4 Keamanan Data

- Hormati RLS.
- Bypass hanya melalui service role di proses server-side yang terkontrol.
- Dilarang mengekspos secret/key pada response, log, atau client bundle.

---

## 8. Frontend Patterns & A11Y

- Gunakan atribut aksesibilitas (`aria-label`, `aria-expanded`, `aria-controls`, `aria-describedby`) sesuai konteks.
- Gunakan modal konfirmasi, bukan `window.alert/confirm/prompt`.
- Bullet list gunakan style yang menjaga alignment atas (`items-start`).
- Semua gambar gunakan `next/image` dan domain valid di `remotePatterns` (`next.config.ts`).

---

## 9. Keamanan & Praktik Baik

- Jangan simpan key di client.
- Validasi input di server.
- Sanitasi body JSON.
- Tangani error tanpa membocorkan stack trace internal.
- Logging sensitif harus nonaktif di production.
- Terapkan security headers minimal:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Referrer-Policy`

---

## 10. Catatan Khusus Bisnis

- Formula costing dan waste mengikuti bagian 3.
- Untuk request custom:
  - bypass auto pricing
  - status project: `Need Manual Quote`

---

## 11. Good Practices (Global)

### 11.1 Commit & Versioning

- Gunakan Conventional Commits 1.0.0 (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`).
- Gunakan Semantic Versioning 2.0.0 untuk penomoran rilis internal.

### 11.2 Kualitas Kode

- Kode modular, DRY, satu fungsi satu tanggung jawab.
- Hindari fungsi melebihi 60 baris bila memungkinkan.
- Gunakan penamaan eksplisit dan konsisten.
- Hindari `any`; gunakan tipe eksplisit untuk data publik.

### 11.3 Error Handling

- Gunakan HTTP status tepat (4xx/5xx).
- Jangan bocorkan detail internal ke client.

### 11.4 Testing

- Terapkan testing pyramid: unit > integration > e2e.
- Target minimal 80% unit coverage untuk modul bisnis kritikal.
- Uji skenario RBAC/RLS dan skenario gagal utama.

### 11.5 Performance & UX

- Optimalkan Core Web Vitals (LCP, INP, CLS).
- Terapkan lazy loading dan optimasi image.
- Gunakan cache API/aset secara tepat.

### 11.6 Dokumentasi

- Gunakan TSDoc/JSDoc untuk fungsi/komponen publik.
- Cantumkan asumsi, batasan, dan keputusan penting pada deskripsi PR.

---

## 12. International Standards References

- **Aksesibilitas:** WCAG 2.1 AA.
- **Keamanan:** OWASP Top 10 (2021), OWASP ASVS Level 1.
- **API:** OpenAPI 3.1, versi endpoint (misal `/v1`), error schema konsisten.
- **Waktu & Format:**
  - timezone bisnis default: Asia/Jakarta (WIB, UTC+7)
  - simpan waktu dalam UTC (ISO 8601 / RFC 3339)
  - tampilkan default UI/reporting dalam Asia/Jakarta
- **Kualitas perangkat lunak:** ISO/IEC 25010.

---

## 13. Checklist Wajib Per Tahap

### 13.1 Planning

- Scope perubahan jelas dan tidak refactor massal tanpa kebutuhan.
- Dampak ke RLS/RBAC dan migration teridentifikasi.
- Rule bisnis yang terdampak sudah dipetakan.

### 13.2 Implementation

- Brand guideline dipatuhi.
- Endpoint admin memiliki auth + role guard.
- Endpoint publik hanya mengembalikan data aktif dan aman.
- Logic custom request mengikuti escape hatch.

### 13.3 Verification

- `npm run typecheck` lulus.
- `npm run lint` lulus.
- Test bisnis relevan lulus.
- Tidak ada secret pada response/log.

### 13.4 Pre-Release

- Security headers aktif.
- Error response konsisten.
- Timezone UTC/Jakarta konsisten.
- Tidak ada logging sensitif pada jalur production.

---

## 14. Definition of Done untuk Perubahan

Perubahan dianggap selesai hanya jika:

1. Mematuhi seluruh aturan mandatory di dokumen ini.
2. Lolos quality gates.
3. Tidak menurunkan keamanan, stabilitas, dan integritas data.
4. Dapat direview dengan jelas oleh tim.

---

## 15. Riwayat Perubahan Dokumen

- **2026-03-05**
  - Restrukturisasi total dokumen agar lebih terorganisasi.
  - Normalisasi format markdown, heading, dan checklist.
  - Penambahan contoh implementasi untuk waste, laser cut, custom bypass, migration, dan error response API.
  - Penajaman aturan keamanan (security headers, sanitasi error, perlindungan secret).
  - Penambahan checklist eksekusi lintas tahap untuk konsistensi tim.
