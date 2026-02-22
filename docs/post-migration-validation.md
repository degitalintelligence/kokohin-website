Post-Migration Validation Checklist — Kokohin

Schema & Migrations
- [x] Semua migrations diterapkan berurutan (scripts/migrate-apply.js).
- [x] migration_history terisi untuk setiap file .sql.
- [x] Indexes & constraints aktif.

Synchronization
- [x] Laporan sinkronisasi dihasilkan (docs/db-sync-report.json).
- [x] Kolom kunci (services.*, site_settings.wa_number, estimations.version_number) sesuai.

RLS Policies
- [x] Services: public SELECT, admin INSERT/UPDATE/DELETE.
- [x] Site settings: public SELECT, admin UPDATE.
- [x] Storage bucket services: public READ, admin WRITE.

Tests
- [x] Test RLS publik vs admin lulus (npm test).
- [x] CRUD services dengan RLS aktif berfungsi.
- [x] Autentikasi Supabase (JWT) diverifikasi di middleware.

Performa
- [x] Query utama terindeks; halaman /layanan memuat data aktif via order.

Catatan
- Gunakan .env.local dengan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
- Jalankan: `npm run migrate:apply` → `npm run db:sync-report` → `npm test`.

