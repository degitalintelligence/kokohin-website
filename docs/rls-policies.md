RLS Policies — Kokohin

Services (public.services)
- Public read (least privilege): semua user (anon) dapat SELECT layanan yang aktif.
- Admin manage: role super_admin, admin_sales, admin_proyek dapat INSERT/UPDATE/DELETE.
- Tujuan: Konten layanan tampil publik; modifikasi dibatasi admin.

Site Settings (public.site_settings)
- Public read: semua user dapat SELECT (hanya field non-sensitif dipakai di aplikasi).
- Admin update: hanya admin yang boleh UPDATE value (mis. wa_number).
- Tujuan: Konfigurasi publik terbaca UI; perubahan dibatasi admin.

Storage Bucket “services” (storage.objects)
- Public read: objek dalam bucket services dapat diakses publik (thumbnail).
- Admin write: upload/update/delete hanya untuk admin.
- Tujuan: Gambar layanan dapat diakses publik; modifikasi dibatasi admin.

Leads, Projects, Estimations
- Read/write dibatasi user terautentikasi sesuai peran internal (tidak publik).
- Tujuan: Menjaga data operasional bisnis.

