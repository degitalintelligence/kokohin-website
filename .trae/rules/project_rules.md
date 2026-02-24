🤖 TRAE AI / CURSOR AI DEVELOPMENT RULES

Project: Kokohin Web & Mini-ERP
Context: Next.js (App Router), Tailwind CSS, Supabase (Self-hosted).

🛑 STRICT DIRECTIVES (MANDATORY)

BACA ATURAN INI SEBELUM MENULIS SATU BARIS KODE PUN. PELANGGARAN ATURAN INI AKAN MENYEBABKAN KODE DITOLAK.

1. BRAND GUIDELINES & UI

FONT: WAJIB menggunakan font Montserrat secara eksklusif. Jangan pernah menggunakan font standar lain seperti Inter, Roboto, atau Arial.

COLORS: - Primary Red: #E30613 (Untuk CTA utama, highlight, aksen).

Primary Black: #1D1D1B (Untuk teks utama, bg gelap, elemen solid).

AESTHETICS: Gunakan padding/margin yang lega (banyak whitespace). Jangan membuat UI yang terlalu padat atau saling menempel (no cramped UI).

2. CODE REVISION STANDARDS (SANGAT KRITIKAL)

Jangan pernah berasumsi atau melakukan refactoring massal pada kode yang sudah berjalan (works) tanpa diminta.

Revisi Minor (1-2 baris): Berikan HANYA baris kode yang diubah disertai dengan petunjuk lokasi yang sangat spesifik (contoh: "Ganti baris 45 di dalam function X menjadi...").

Revisi Major (di dalam sebuah Function): Jika perubahan lebih dari 3 baris di dalam sebuah function, WAJIB berikan FULL FUNCTION tersebut agar developer manusia tinggal melakukan copy-paste-replace pada function-nya saja, tanpa membingungkan.

Revisi File: - Jika file berukuran < 500 lines: Diperbolehkan mencetak ulang seluruh isi file (full rewrite).

Jika file berukuran > 500 lines: DILARANG KERAS mencetak ulang seluruh file. Hanya cetak bagian function atau component yang mengalami perubahan.

3. BACKEND & LOGIC CONSTRAINTS

Waste Calculation (Sisa Material): Dalam menghitung kebutuhan material batangan atau lembaran utuh, WAJIB menggunakan Ceiling Math (Math.ceil()). Sisa potongan dibebankan ke customer. (Contoh: Butuh 14m besi, panjang per batang 6m. Maka: Math.ceil(14/6) = 3 batang).

Laser Cut Calculation: Material Plat Laser Cut dihitung berdasarkan Lembar Standar, BUKAN per meter lari/persegi.

Escape Hatch (Custom Request): Jika input user memiliki bendera jenis == 'custom', BYPASS (LEWATI) semua fungsi auto-kalkulasi harga. Flag project ini di Supabase dengan status Need Manual Quote. Jangan pernah me-return Rp NaN atau harga dummy ke UI.

4. WORKFLOW INJECTIONS

Saat membuat UI/Komponen baru, pastikan warna #E30613 dan font Montserrat diaplikasikan via Tailwind classes. Gunakan whitespace yang lega dan elemen aksesibel.

Jangan meng-install library/package eksternal baru tanpa meminta persetujuan user terlebih dahulu (Kecuali standar esensial Next.js seperti lucide-react untuk icon).

5. BUILD & QUALITY GATES

- Wajib menjalankan: `npm run typecheck` dan `npm run lint` sebelum PR/merge.
- Dilarang push code dengan error TypeScript atau linting.
- Ikuti pola Next.js App Router; hindari side effect yang mengganggu SSR/ISR.

6. DATABASE MIGRATIONS

- Semua perubahan skema database HARUS melalui file SQL di `supabase/migrations/`.
- Tulis migrasi yang idempoten: gunakan `IF NOT EXISTS` untuk kolom, index, constraint.
- Terapkan migrasi menggunakan:
  - Umum: `npm run migrate:apply` (mengelola `public.migration_history`).
  - Terarah (jika diperlukan): skrip `scripts/run-migration-*.js`.
- Prasyarat env: `.env.local` berisi `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
- DILARANG menjalankan DDL ad‑hoc di produksi tanpa file migrasi.

7. API, RLS & RBAC

- Gunakan Supabase server client dari `@/lib/supabase/server` pada route server.
- Endpoint publik hanya mengembalikan data aktif (misal `is_active = true`).
- Endpoint admin WAJIB cek role via tabel `profiles` dan `isRoleAllowed`:
  - Material/Zones sensitif: `ALLOWED_MATERIALS_ROLES = ['super_admin']`.
  - Admin umum: `ALLOWED_ADMIN_ROLES = ['super_admin','admin_sales','admin_proyek']`.
- Hormati RLS; jangan mem-bypass kecuali via service role di proses yang memang server‑side terkontrol.
- Jangan pernah melog atau mengekspos secret/key. DILARANG commit credential ke repository.

8. FRONTEND PATTERNS & A11Y

- Komponen harus aksesibel: gunakan `aria-label`, `aria-expanded`, `aria-controls`, caption tabel, dan manajemen fokus yang benar.
- Hindari `window.alert/confirm/prompt` untuk UX; gunakan modal konfirmasi yang konsisten (warna #E30613, Montserrat).
- List bullet: gunakan bullet kecil dan `items-start` agar sejajar atas dengan teks.
- Gambar: gunakan `next/image` dan domain yang terdaftar di `remotePatterns`. Tambah domain baru via `next.config.js` jika diperlukan.

9. KEAMANAN & PRAKTIK BAIK

- Jangan pernah menampilkan atau menyimpan key di client. Gunakan environment variables dan akses via server.
- Validasi input pada server; sanitasi body JSON; tangani error dengan aman (hindari bocor stack trace).
- Logging sensitif dimatikan di produksi.

10. CATATAN KHUSUS BISNIS (REF)

- Perhitungan biaya dan waste mengikuti poin di bagian 3.
- Untuk permintaan custom: set status project menjadi `Need Manual Quote` dan lewati seluruh auto‑pricing.

11. GOOD PRACTICES (GLOBAL)

- Commit & Versioning:
  - Ikuti Conventional Commits 1.0.0 (feat, fix, chore, refactor, docs, test).
  - Gunakan Semantic Versioning 2.0.0 untuk penomoran rilis internal.
- Kualitas Kode:
  - Kode modular, DRY, satu fungsi = satu tanggung jawab. Hindari fungsi > 60 baris.
  - Penamaan eksplisit dan konsisten; hindari singkatan tidak umum.
  - TypeScript: hindari `any`, gunakan tipe eksplisit untuk response/data publik.
- Penanganan Error:
  - Gunakan HTTP status tepat (4xx untuk client error, 5xx untuk server error).
  - Jangan bocorkan detail stack trace ke client; log aman di server.
- Logging & Observability:
  - Gunakan level log (error, warn, info, debug); matikan debug di produksi.
  - Jangan pernah menulis secret/token ke log.
- Testing:
  - Terapkan testing pyramid: unit > integration > e2e.
  - Target minimal coverage 80% untuk unit test pada modul kritikal bisnis.
  - Uji skenario akses (RBAC/RLS) dan error utama.
- Performance & UX:
  - Optimalkan Core Web Vitals (LCP, INP, CLS). Gunakan lazy-load & image optimization.
  - Terapkan cache yang tepat di API (etag/last-modified) dan aset statis.
- Dokumentasi:
  - Gunakan TSDoc/JSDoc pada fungsi/komponen publik.
  - Cantumkan asumsi, batasan, dan keputusan penting pada PR description.

12. INTERNATIONAL STANDARDS REFERENCES

- Aksesibilitas: Penuhi WCAG 2.1 AA untuk komponen dan alur utama.
- Keamanan:
  - Rujuk OWASP Top 10 (2021) dan ASVS Level 1 untuk kontrol minimum.
  - Gunakan header keamanan (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).
  - Cookie sensitif harus `HttpOnly`, `Secure`, `SameSite=Lax/Strict`.
- API:
  - Skema API terdokumentasi dengan OpenAPI 3.1. Versi endpoint (mis. /v1).
  - Gunakan pola error konsisten (code, message, details), idempoten untuk metode yang sesuai.
- Waktu & Format:
  - Base timezone: Asia/Jakarta (WIB, UTC+7) untuk interpretasi bisnis, cut‑off, SLA, dan laporan.
  - Simpan waktu dalam UTC, format ISO 8601/RFC 3339 pada wire protocol.
  - Konversi ke Asia/Jakarta di UI dan reporting secara default.
- Kualitas Perangkat Lunak:
  - Mengacu ISO/IEC 25010 untuk karakteristik kualitas (functional suitability, reliability, security, maintainability, usability, performance efficiency, compatibility, portability).
