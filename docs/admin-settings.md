# Admin Settings - Branding & Kontak

Halaman: /admin/settings

- Akses: super_admin, admin_sales, admin_proyek (harus login)
- Fitur:
  - Upload Logo (disimpan di bucket storage 'settings' dan URL disimpan di tabel site_settings key 'logo_url')
  - Upload Background Login (key 'login_background_url')
  - Atur Nomor WhatsApp (key 'wa_number') dengan validasi format 62xxxxxxxxxx
  - Utilitas: hapus layanan “Membrane” dari database

Implementasi:
- Semua nilai disimpan ke tabel site_settings agar bisa diubah tanpa restart.
- Public pages (Home, Katalog, Layanan, Kalkulator) membaca wa_number secara dinamis via DB/API.

Catatan:
- Perubahan WA langsung diterapkan; tombol WhatsApp akan menggunakan nomor terbaru.
- Kebijakan RLS mengizinkan publik membaca site_settings, dan hanya admin yang dapat update.

