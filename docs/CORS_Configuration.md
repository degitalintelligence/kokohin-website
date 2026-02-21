# Konfigurasi CORS Supabase Self‑Hosted

Dokumen ini menjelaskan cara mengonfigurasi CORS (Cross‑Origin Resource Sharing) untuk Supabase self‑hosted yang dijalankan via Coolify.

## Latar Belakang

CORS diperlukan agar frontend (Next.js) yang berjalan di domain berbeda dapat mengakses API Supabase. Tanpa konfigurasi CORS yang tepat, Anda akan mendapatkan error seperti:

```
Access to fetch at 'https://supabase-host/auth/v1/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Default CORS di Supabase Self‑Hosted

Supabase self‑hosted (via Coolify) secara default menggunakan header:
```
Access-Control-Allow-Origin: *
```
Artinya, **semua origins diizinkan**. Ini bisa menjadi risiko keamanan jika Supabase terpapar ke internet.

## Verifikasi Konfigurasi Saat Ini

### 1. Cek Header CORS
Jalankan perintah berikut di terminal (ganti `SUPABASE_URL` dengan URL Supabase Anda):

```bash
# Linux/Mac
curl -I -X OPTIONS "http://supabasekong-u4kkkcgcoscooossgw4c04os.168.110.218.154.sslip.io/auth/v1/health"

# Windows PowerShell
Invoke-WebRequest -Uri "http://supabasekong-u4kkkcgcoscooossgw4c04os.168.110.218.154.sslip.io/auth/v1/health" -Method OPTIONS -UseBasicParsing | Select-Object -ExpandProperty Headers
```

Cari header `Access-Control-Allow-Origin`. Jika nilainya `*`, berarti CORS sudah mengizinkan semua origins.

### 2. Test dari Frontend
Buka browser DevTools (F12) → Network tab, lalu coba login. Lihat apakah request ke Supabase gagal dengan CORS error.

## Mengonfigurasi CORS via Coolify

Jika Anda ingin membatasi origins yang diizinkan (rekomendasi keamanan), ikuti langkah‑langkah berikut:

### 1. Buka Coolify Dashboard
   - Login ke Coolify di `http://<coolify-ip>:3000` (atau domain Anda).
   - Cari service **Supabase**.

### 2. Edit Environment Variables
   - Klik service Supabase → **Environment Variables**.
   - Tambah variable berikut:

| Variable | Nilai (Contoh) | Keterangan |
|----------|----------------|------------|
| `API_CORS_ORIGINS` | `http://localhost:3000,https://kokohin.com` | Daftar origins yang diizinkan, dipisahkan koma. |
| `SUPABASE_CORS_ORIGINS` | `http://localhost:3000,https://kokohin.com` | Alternatif (beberapa versi Supabase). |
| `SITE_URL` | `http://localhost:3000` | URL frontend default (untuk auth redirect). |

**Contoh lengkap:**
```
API_CORS_ORIGINS=http://localhost:3000,https://kokohin.com
SUPABASE_CORS_ORIGINS=http://localhost:3000,https://kokohin.com
SITE_URL=http://localhost:3000
```

### 3. Restart Service
   - Setelah mengubah environment variables, **restart service Supabase** dari Coolify dashboard.
   - Tunggu 1‑2 menit hingga service berjalan ulang.

### 4. Verifikasi Perubahan
   - Jalankan lagi perintah OPTIONS seperti di atas.
   - Sekarang header `Access-Control-Allow-Origin` seharusnya menampilkan origin yang spesifik (bukan `*`) untuk request yang berasal dari origin yang diizinkan.

## Origins yang Harus Diizinkan

Untuk pengembangan dan produksi, pastikan origins berikut ada dalam daftar:

1. **Development**: `http://localhost:3000`, `http://localhost:3001`
2. **Production**: `https://kokohin.com` (domain utama)
3. **Preview/Staging**: `https://staging.kokohin.com` (jika ada)

## Troubleshooting CORS

### Error: "No 'Access-Control-Allow-Origin' header"
   - Pastikan environment variable `API_CORS_ORIGINS` atau `SUPABASE_CORS_ORIGINS` sudah diset dan service telah direstart.
   - Cek apakah origin frontend Anda persis sama dengan yang ada di daftar (termasuk `http` vs `https`).

### Error: "Credentials mode not allowed"
   - Jika menggunakan credential (cookies, authorization header), pastikan `Access-Control-Allow-Credentials: true` muncul di response.
   - Supabase seharusnya sudah mengatur ini secara otomatis.

### CORS tetap error meski sudah dikonfigurasi
   - Coba clear cache browser.
   - Pastikan tidak ada typo di environment variable.
   - Coba tambahkan `*` sementara untuk testing (`API_CORS_ORIGINS=*`), lalu restart service.

## Konfigurasi Alternatif: Nginx Reverse Proxy

Jika Anda menggunakan Nginx sebagai reverse proxy di depan Supabase, Anda bisa menambahkan header CORS di konfigurasi Nginx:

```nginx
location / {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'http://localhost:3000';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
}
```

## Catatan Keamanan

1. **Jangan gunakan `*` di produksi** – ini membuka Supabase ke semua domain.
2. **Gunakan HTTPS** – pastikan frontend dan Supabase menggunakan HTTPS di produksi.
3. **Monitor logs** – Cek logs Supabase (via Coolify) untuk melihat request yang diblok CORS.

## Referensi
- [Supabase Self‑Hosting Documentation](https://supabase.com/docs/guides/self-hosting)
- [Coolify Documentation](https://coolify.io/docs)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---
*Dokumen ini dibuat otomatis oleh Trae AI.*