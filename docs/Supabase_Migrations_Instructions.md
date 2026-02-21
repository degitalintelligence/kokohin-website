# Instruksi Migrasi Supabase

File ini menjelaskan cara menjalankan migrasi database di Supabase self-hosted untuk proyek Kokohin.

## Latar Belakang

Kode aplikasi membutuhkan tabel database yang telah dibuat. Migrasi disimpan di folder `supabase/migrations/`:

1. **001_initial_schema.sql** – Tabel untuk website (services, projects, testimonials, leads)
2. **002_mini_erp_schema.sql** – Tabel untuk mini‑ERP (profiles, materials, catalogs, zones, erp_projects, estimations, dll) – **bergantung pada tabel `auth.users` yang disediakan oleh Supabase Auth**.
3. **003_mini_erp_fallback.sql** – Tabel untuk mini‑ERP yang **tidak bergantung pada `auth.users`** (fallback jika auth schema belum siap).

## Langkah‑langkah

### 1. Buka Dashboard Supabase
   - Buka URL Supabase self‑hosted Anda (biasanya `http://<ip-server>:8000` atau `https://supabase-host:8000`).
   - Login dengan credential admin Coolify / Supabase.

### 2. Buka SQL Editor
   - Di sidebar kiri, klik **SQL Editor**.

### 3. Jalankan Migrasi Satu per Satu

#### Migrasi 001 (Website)
   - Klik **New query**.
   - Copy seluruh isi file [001_initial_schema.sql](../supabase/migrations/001_initial_schema.sql) dan paste ke editor.
   - Klik **Run** atau tekan `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac).
   - Pastikan tidak ada error.

#### Migrasi 002 (Mini‑ERP dengan Auth)
   - Buat query baru.
   - Copy seluruh isi file [002_mini_erp_schema.sql](../supabase/migrations/002_mini_erp_schema.sql) dan paste.
   - Jalankan query.
   - **Jika muncul error tentang `auth.users` tidak ditemukan**, artinya Supabase Auth service belum diinisialisasi. Lewati migrasi ini dan lanjut ke migrasi 003 (fallback).

#### Migrasi 003 (Mini‑ERP tanpa Auth – Fallback)
   - Buat query baru.
   - Copy seluruh isi file [003_mini_erp_fallback.sql](../supabase/migrations/003_mini_erp_fallback.sql) dan paste.
   - Jalankan query.
   - Pastikan tidak ada error.

### 4. Verifikasi Tabel
   - Setelah migrasi berjalan, buka tab **Table Editor** di sidebar.
   - Cari tabel‑tabel berikut (minimal):
     - `services`
     - `projects` (gallery)
     - `testimonials`
     - `leads`
     - `materials`
     - `zones`
     - `catalogs`
     - `erp_projects`
     - `estimations`

   - Jika tabel `auth.users` **tidak ada**, berarti Supabase Auth belum aktif. Lihat bagian **Inisialisasi Supabase Auth** di bawah.

## Inisialisasi Supabase Auth (Jika `auth.users` Tidak Ada)

Supabase self‑hosted melalui Coolify kadang memerlukan inisialisasi manual untuk service Auth.

### Opsi A: Via Coolify Dashboard
   1. Buka Coolify dashboard.
   2. Cari service Supabase.
   3. Cek environment variables, pastikan ada:
      - `AUTH_ENABLED=true`
      - `SITE_URL=http://localhost:3000` (atau URL frontend Anda)
      - `API_EXTERNAL_URL=https://supabase-host:8000` (URL eksternal Supabase)
   4. Restart service Supabase.

### Opsi B: Via Supabase CLI (Jika Terpasang)
   ```bash
   # Login ke Supabase lokal
   supabase login

   # Inisialisasi auth schema
   supabase db push --schema auth
   ```

   Namun, untuk self‑hosted via Coolify, Opsi A lebih direkomendasikan.

## Troubleshooting

### Error: "relation auth.users does not exist"
   - Artinya Supabase Auth belum diinisialisasi.
   - Solusi:
     1. Pastikan environment variable `AUTH_ENABLED=true` di Coolify.
     2. Restart service Supabase.
     3. Jika masih tidak ada, jalankan **hanya migrasi 003** (fallback) agar aplikasi bisa berjalan tanpa auth untuk sementara.

### Error: "permission denied for schema auth"
   - Gunakan service role key (bukan anon key) untuk koneksi admin.
   - Di SQL Editor, pastikan Anda login sebagai user dengan hak akses penuh.

### Error: "duplicate table"
   - Beberapa tabel mungkin sudah ada. Gunakan `create table if not exists` di migrasi, sehingga error ini bisa diabaikan.

## Verifikasi via API
   Setelah migrasi, uji endpoint `GET /api/test-db`. Response seharusnya:
   ```json
   {
     "status": "ok",
     "tables": {
       "materials": true,
       "zones": true,
       "catalogs": true,
       "auth.users": true  // atau false jika auth belum siap
     }
   }
   ```

## Catatan Penting
- Migrasi 002 bergantung pada `auth.users`. Jika auth belum siap, aplikasi **tetap bisa berjalan** dengan migrasi 003 (fallback) untuk fitur non‑auth.
- Setelah auth siap, Anda bisa menjalankan migrasi 002 (atau menjalankan ulang dengan `DROP TABLE` terlebih dahulu jika diperlukan).
- Pastikan environment variable `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` sudah benar.

## Langkah Selanjutnya
1. Setelah migrasi berhasil, coba login di halaman `/admin/login`.
2. Jika masih gagal, periksa konfigurasi CORS (lihat [CORS Configuration](./CORS_Configuration.md) – belum dibuat).
3. Uji fitur admin (materials, catalogs, zones, leads).

---
*Dokumen ini dibuat otomatis oleh Trae AI.*