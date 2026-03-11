# Panduan Patch Manual WAHA (WhatsApp HTTP API)

Dokumen ini berisi langkah-langkah detail untuk memperbaiki error `TypeError: group.getInviteCode is not a function` pada event `group.v2.update` di engine WAHA.

## 1. Masalah
Saat terjadi event `group.v2.update`, engine WAHA (yang berbasis `whatsapp-web.js`) mencoba mengambil invite code grup tanpa memastikan objek `group` atau metode `getInviteCode` tersedia. Hal ini menyebabkan crash dan webhook tidak terkirim.

**Error Log:**
```
TypeError: group.getInviteCode is not a function
    at ToGroupV2UpdateEvent (/app/dist/core/engines/webjs/groups.webjs.js:72:43)
```

## 2. Solusi (Patch Manual)
Anda perlu memodifikasi file di dalam container Docker WAHA.

### Langkah 1: Masuk ke Container WAHA
Gunakan perintah berikut di terminal server tempat Docker berjalan:

```bash
# Temukan ID container WAHA
docker ps | grep waha

# Masuk ke shell container (ganti <container_id> dengan ID sebenarnya)
docker exec -it <container_id> /bin/sh
```

### Langkah 2: Edit File Source Code
Di dalam container, gunakan text editor (seperti `vi` atau `nano` jika tersedia, atau `sed` jika tidak ada editor).

**Target File:** `/app/dist/core/engines/webjs/groups.webjs.js`

**Cari kode berikut (sekitar baris 72):**
```javascript
const inviteCode = await group.getInviteCode();
```

**Ganti menjadi:**
```javascript
const inviteCode = (group && typeof group.getInviteCode === 'function') 
    ? await group.getInviteCode().catch(() => null) 
    : null;
```

#### Cara Edit Menggunakan `sed` (Jika tidak ada nano/vi):
Jalankan perintah ini di dalam container:

```bash
sed -i 's/const inviteCode = await group.getInviteCode();/const inviteCode = (group \&\& typeof group.getInviteCode === "function") ? await group.getInviteCode().catch(() => null) : null;/g' /app/dist/core/engines/webjs/groups.webjs.js
```

### Langkah 3: Restart Container
Setelah file diedit, keluar dari container dan restart agar perubahan diterapkan.

```bash
exit
docker restart <container_id>
```

## 3. Verifikasi
Setelah patch diterapkan:
1. Picu update grup (misal: ubah deskripsi grup di WhatsApp).
2. Cek log WAHA, pastikan tidak ada error `TypeError`.
3. Cek tabel `wa_webhook_events` di Supabase, pastikan event `group.v2.update` masuk.

## 4. Alternatif (Custom Docker Image)
Jika Anda ingin solusi permanen (agar tidak hilang saat container dihapus/recreate), buat `Dockerfile` custom:

```dockerfile
FROM devlikeapro/waha:latest
# Copy script patch atau jalankan sed saat build
RUN sed -i 's/const inviteCode = await group.getInviteCode();/const inviteCode = (group \&\& typeof group.getInviteCode === "function") ? await group.getInviteCode().catch(() => null) : null;/g' /app/dist/core/engines/webjs/groups.webjs.js
```
Lalu build dan gunakan image ini.
