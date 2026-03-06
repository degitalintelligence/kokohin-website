# SOP Implementasi & Validasi Rules

Dokumen ini menjadi standar operasional untuk memastikan seluruh aturan di `project_rules.md` dapat diterapkan konsisten pada codebase Kokohin (Next.js App Router + Tailwind + Supabase self-hosted).

## 1) Baseline Kondisi Project Saat Ini

- Framework: Next.js 16.1.6 (App Router), React 19.
- Styling: Tailwind CSS 3.4, brand colors sudah di-extend.
- Backend/Auth/DB: Supabase (`@supabase/ssr`, `@supabase/supabase-js`).
- Quality gate tersedia sebagai script:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:business`
  - `npm run migrate:apply`

## 2) Ringkasan Validasi per Kelompok Rule

### Rule 1 — Brand Guidelines & UI

Status: **Compliant (dengan guard tambahan disarankan)**

- Montserrat sudah di-load global via `next/font/google` dan dipasang sebagai `font-sans`.
- Tailwind sudah memiliki token warna brand:
  - `#E30613` (`primary.DEFAULT`)
  - `#1D1D1B` (`primary.dark`)
- Pattern komponen sudah memakai kelas `btn-primary`, `text-primary`, dan layout dengan spacing cukup.

Implementasi wajib:

- Semua komponen baru gunakan `font-sans`.
- CTA utama wajib gunakan token `primary`.
- Hindari penggunaan warna hardcoded selain kebutuhan kasus khusus.

Contoh:

```tsx
<button className="btn btn-primary font-sans px-6 py-3">
  Simpan
</button>
```

Skenario tepat:

- Form submit, tombol aksi utama, badge status penting.

### Rule 2 — Code Revision Standards

Status: **Operational Rule (proses kerja), tidak bisa diverifikasi otomatis dari runtime**

Implementasi wajib:

- Minor change (1–2 baris): tampilkan patch minimal.
- Major change (dalam function): tampilkan full function yang berubah.
- File besar (>500 baris): tampilkan section terubah, bukan full file.

Skenario tepat:

- Bugfix kecil validasi input: patch 1–2 baris.
- Refactor logika kalkulasi: kirim full function.

### Rule 3 — Backend & Logic Constraints

Status: **Compliant (terverifikasi test bisnis)**

- Waste: `Math.ceil()` sudah dipakai untuk kebutuhan material.
- Laser cut: dihitung per lembar standar.
- Custom request: auto-pricing dibypass dan diarahkan ke manual quote.

Implementasi wajib:

- Jangan return harga dummy/NaN untuk `jenis = custom`.
- Simpan status `Need Manual Quote` saat penyimpanan project custom.

Contoh:

```ts
if (input.jenis === 'custom') {
  return {
    totalSellingPrice: 0,
    estimatedPrice: 0,
    breakdown: []
  }
}
```

Skenario tepat:

- User memilih desain custom + catatan spesifikasi unik.

### Rule 4 — Workflow Injections

Status: **Partial-Compliant**

- Larangan install package tanpa approval bersifat proses kerja.
- Penggunaan `lucide-react` sudah ada dan sesuai pengecualian.

Implementasi wajib:

- Saat tambah UI baru, cek brand token + a11y sebelum merge.
- Jika butuh package baru non-esensial, wajib approval terlebih dulu.

### Rule 5 — Build & Quality Gates

Status: **Compliant**

- `typecheck` dan `lint` tersedia dan dapat dijalankan.
- Hasil validasi saat audit:
  - `npm run typecheck` lulus.
  - `npm run lint` lulus dengan warning minor unused variable (non-blocking).

Implementasi wajib:

- Minimum gate sebelum merge:
  1. `npm run typecheck`
  2. `npm run lint`
  3. `npm run test:business`

### Rule 6 — Database Migrations

Status: **Compliant dengan catatan peningkatan idempotensi**

- Semua perubahan skema berada di `supabase/migrations/`.
- Mekanisme apply migration memakai `migration_history`.
- Banyak migrasi sudah idempoten (`IF NOT EXISTS` / `DO $$ ... IF NOT EXISTS`), namun belum seragam di semua file.

Implementasi wajib:

- Setiap migration baru:
  - idempoten untuk table/column/index/constraint;
  - aman dijalankan ulang;
  - tidak bergantung urutan manual selain sorting filename.

Contoh:

```sql
ALTER TABLE public.catalogs
ADD COLUMN IF NOT EXISTS base_price_unit text;
```

### Rule 7 — API, RLS & RBAC

Status: **Mostly Compliant, ada area hardening**

- RBAC helper sudah ada (`isRoleAllowed`, role constants).
- Endpoint admin mayoritas cek user + role.
- Endpoint publik mayoritas memfilter `is_active = true`.
- Beberapa endpoint publik menggunakan service role jika tersedia; ini harus dijaga ketat agar hanya expose field aman.

Implementasi wajib:

- Endpoint admin sensitif wajib:
  - auth user,
  - cek role dari `profiles`/metadata,
  - return 401/403 sesuai kasus.
- Endpoint publik hanya return kolom aman + data aktif.
- Jangan expose env secret ke response atau log.

### Rule 8 — Frontend Patterns & A11Y

Status: **Compliant**

- Tidak ditemukan penggunaan `window.alert/confirm/prompt`.
- Sudah ada `ConfirmModal` dengan `role="dialog"` dan `aria-*`.
- Penggunaan `next/image` sudah dominan.

Implementasi wajib:

- Semua dialog konfirmasi pakai modal konsisten.
- Input penting punya label dan state error yang jelas.
- Bullet list gunakan `items-start` untuk alignment saat multi-line.

### Rule 9 — Keamanan & Praktik Baik

Status: **Partial-Compliant**

- Secret tidak tampak disimpan di client code.
- Masih ada area peningkatan:
  - standar security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) belum terdokumentasi sebagai konfigurasi app.
  - masih banyak `console.*` untuk debug yang perlu policy sanitasi di produksi.

Implementasi wajib:

- Terapkan security headers di edge/server layer.
- Gunakan sanitasi error response (hindari detail sensitif dari exception DB).

### Rule 10 — Catatan Khusus Bisnis

Status: **Compliant**

- Selaras dengan Rule 3.
- `Need Manual Quote` untuk custom request sudah diimplementasikan.

### Rule 11 — Good Practices (Global)

Status: **Partial-Compliant**

- TypeScript strict mode aktif.
- Banyak validasi status code sudah tepat.
- Area peningkatan:
  - OpenAPI 3.1 belum tersedia.
  - Coverage target 80% unit test untuk modul kritikal belum dipublikasikan.
  - Standardized structured logging belum seragam.

### Rule 12 — International Standards References

Status: **Partial-Compliant**

- WCAG: praktik dasar cukup baik (aria/dialog/label).
- OWASP/ASVS/Security headers: butuh hardening policy teknis yang eksplisit.
- Timezone: helper Jakarta sudah ada, namun adopsi belum merata.
- ISO 8601 UTC sudah banyak dipakai (`toISOString()`), perlu konsolidasi util agar konsisten.

## 3) SOP Implementasi Rule (Wajib Dipakai)

### A. SOP Saat Menambah Feature

1. Verifikasi desain:
   - Font `font-sans` (Montserrat)
   - Token warna brand
   - spacing lega
2. Verifikasi backend:
   - endpoint public filter active
   - endpoint admin cek auth + role
3. Verifikasi business logic:
   - waste `Math.ceil()`
   - custom bypass auto-pricing
4. Jalankan quality gates:
   - typecheck, lint, business test
5. Validasi keamanan:
   - tidak expose secret
   - error response aman

### B. SOP Saat Menambah API Endpoint

1. Klasifikasi endpoint: public vs admin.
2. Definisikan skema response konsisten:
   - `{ code, message, details? }` untuk error (rekomendasi standar).
3. Tambahkan guard:
   - auth check,
   - RBAC check,
   - validasi body JSON.
4. Tambahkan test minimal:
   - unauthorized,
   - forbidden,
   - happy path.

### C. SOP Saat Menambah Migration

1. File baru di `supabase/migrations/`.
2. Tulis idempoten (`IF NOT EXISTS` / cek via `information_schema`).
3. Jalankan:
   - `npm run migrate:apply`
   - `npm run db:sync-report` (jika relevan)
4. Verifikasi query baca/tulis utama tidak rusak.

## 4) Mekanisme Validasi (Automation + Manual)

### Automation Minimum (lokal sebelum merge)

```bash
npm run typecheck
npm run lint
npm run test:business
```

### Validation Matrix

- Rule 1 (Brand): spot-check komponen baru + token tailwind.
- Rule 3 (Business): `test:business` wajib hijau.
- Rule 5 (Quality): typecheck + lint wajib jalan.
- Rule 6 (Migration): `migrate:apply` sukses + history tercatat.
- Rule 7 (RBAC): uji 401/403/200 untuk endpoint admin.
- Rule 8 (A11Y): uji keyboard + screen-reader labels untuk form/dialog.
- Rule 9/12 (Security): audit headers + sanitasi error response.

### Manual Security Checklist

- Tidak ada secret di response/log/client bundle.
- Tidak ada endpoint admin tanpa role-check.
- Tidak ada endpoint public yang expose data non-aktif/sensitif.
- Tidak ada `window.alert/confirm/prompt` pada UX final.

## 5) Checklist per Tahap Development

### Tahap 1 — Planning

- [ ] Scope perubahan tidak melakukan refactor massal tanpa kebutuhan.
- [ ] Rule bisnis terkait (waste/custom/laser cut) sudah diidentifikasi.
- [ ] Impact ke RLS/RBAC sudah dipetakan.

### Tahap 2 — Implementation

- [ ] UI menggunakan Montserrat + warna brand token.
- [ ] Endpoint admin memiliki auth + RBAC guard.
- [ ] Endpoint public hanya data aktif + field aman.
- [ ] Custom request bypass auto-pricing dan status manual quote.
- [ ] Migration baru idempoten.

### Tahap 3 — Verification

- [ ] `npm run typecheck` lulus.
- [ ] `npm run lint` lulus (warning dievaluasi).
- [ ] `npm run test:business` lulus.
- [ ] Skenario error utama mengembalikan status code tepat.

### Tahap 4 — Pre-Release

- [ ] Audit cepat security headers (CSP, HSTS, XCTO, Referrer-Policy).
- [ ] Validasi a11y kritikal (modal/form/nav).
- [ ] Validasi timezone: simpan UTC, tampilkan Jakarta.
- [ ] Tidak ada logging sensitif aktif di production path.

## 6) Prioritas Perbaikan Lanjutan (Gap Closure)

1. Standarkan error response API (`code/message/details`) agar konsisten dan siap OpenAPI.
2. Terapkan security headers terpusat di `next.config.ts`/middleware infra.
3. Buat OpenAPI 3.1 untuk endpoint publik dan admin prioritas.
4. Konsolidasikan formatting tanggal ke util Jakarta (`src/lib/datetime.ts`) agar tidak tersebar `new Date().toLocale...`.
5. Tambahkan policy lint/CI untuk menahan `console.*` sensitif di jalur produksi.
