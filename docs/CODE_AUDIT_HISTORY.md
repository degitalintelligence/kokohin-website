# Laporan Perbaikan Audit Kode Kokohin Web & Mini-ERP

Dokumen ini mencatat history perubahan yang dilakukan berdasarkan hasil audit PRD, fungsionalitas, dan UI/UX.

## 2026-02-22 — Batch Perbaikan 1

### 1. Nomor WhatsApp Admin di Kalkulator

- **Kategori**: Medium (Konfigurasi)
- **Deskripsi**: Nomor WhatsApp admin untuk CTA "Book Jadwal Survei" dan "Konsultasi Custom" sebelumnya hardcoded di komponen kalkulator publik.
- **Perubahan**:
-  - Menambahkan konstanta `KOKOHIN_WA` yang membaca nomor WA dari `site_settings` (key `wa_number`) dengan fallback default aman jika belum terisi.
  - Mengganti penggunaan nomor WA hardcoded di fungsi `handleBookSurvey` dan `handleCustomConsultation` agar selalu menggunakan `KOKOHIN_WA`.
- **File Terkait**:
  - `src/components/calculator/Calculator.tsx`

### 2. Guard Performa Dashboard Admin (Leads & Projects)

- **Kategori**: High (Performa jangka panjang)
- **Deskripsi**: Query ke tabel `leads` dan `erp_projects` di dashboard admin tidak memiliki batas, berpotensi melambat jika data membesar.
- **Perubahan**:
  - Menambahkan `.limit(100)` pada query:
    - `erp_projects` di halaman `AdminProjectsPage`.
    - `leads` di halaman `AdminLeadsPage`.
- **File Terkait**:
  - `src/app/admin/(dashboard)/projects/page.tsx`
  - `src/app/admin/(dashboard)/leads/page.tsx`

### 3. Perbaikan Aksesibilitas Alt Text Avatar Admin

- **Kategori**: Low (Aksesibilitas)
- **Deskripsi**: Gambar avatar admin di header halaman leads menggunakan alt text generik `"User"`.
- **Perubahan**:
  - Mengganti alt text menjadi `"Avatar Admin Proyek"` agar lebih deskriptif untuk screen reader.
- **File Terkait**:
  - `src/app/admin/(dashboard)/leads/page.tsx`

### 4. Status Build & Quality Gate

- **Perintah Dijalankan**:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- **Status**:
  - Seluruh perintah di atas berhasil tanpa error setelah perubahan ini diterapkan.

## 2026-02-22 — Batch Perbaikan 2

### 1. Branding & Kontak di PDF Quotation Mini‑ERP

- **Kategori**: Medium (Branding & Konsistensi Kontak)
- **Deskripsi**: Bagian footer di PDF quotation Mini‑ERP masih menggunakan alamat dan nomor WhatsApp placeholder yang tidak sinkron dengan konfigurasi kontak resmi di environment.
- **Perubahan**:
  - Menambahkan konstanta `COMPANY_WEBSITE` yang membaca `process.env.NEXT_PUBLIC_COMPANY_WEBSITE` dengan fallback `www.kokohin.com`.
  - Mengganti teks footer menjadi dinamis menggunakan `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, dan `COMPANY_WEBSITE` sehingga seluruh informasi kontak di header dan footer bersumber dari konfigurasi yang sama.
- **File Terkait**:
  - `src/lib/pdf-generator.tsx`

### 2. Validasi & Sinkronisasi Payment Terms Default di PDF

- **Kategori**: Medium (PRD Compliance)
- **Deskripsi**: Default payment terms di `pdf-generator` diverifikasi agar konsisten dengan fallback payment terms yang digunakan di tombol admin `GeneratePdfButton` serta dengan PRD Fase 2 (syarat pembayaran dinamis).
- **Perubahan**:
  - Memastikan `paymentTerms` di `PdfQuotationData` selalu mengutamakan data dari tabel `payment_terms` (melalui `GeneratePdfButton`), dan hanya menggunakan `defaultPaymentTerms` ketika data tidak tersedia.
  - Menyelaraskan isi `defaultPaymentTerms` dengan fallback yang digunakan di `GeneratePdfButton` (DP 50%, pelunasan 50%, metode transfer bank, masa berlaku 14 hari, PPN 11%, dan garansi 2/5 tahun).
- **File Terkait**:
  - `src/lib/pdf-generator.tsx`
  - `src/components/admin/GeneratePdfButton.tsx`

## 2026-02-22 — Batch Perbaikan 3

### 1. Disclaimer Harga di PDF Quotation Mini‑ERP

- **Kategori**: High (Transparansi Harga & Ekspektasi Customer)
- **Deskripsi**: PDF quotation Mini‑ERP belum memiliki blok disclaimer eksplisit yang menegaskan bahwa harga masih dapat berubah setelah survei lapangan, padahal ini sudah dijelaskan di PDF kalkulator publik.
- **Perubahan**:
  - Menambahkan gaya `disclaimerBox`, `disclaimerTitle`, dan `disclaimerText` di `StyleSheet` PDF Mini‑ERP dengan tema warna merah utama (#E30613) dan latar merah muda lembut.
  - Menambahkan blok teks "SYARAT & KETENTUAN (WAJIB DIBACA)" di bawah bagian "Syarat Pembayaran" yang berisi poin:
    1) harga adalah estimasi awal berdasarkan data sistem,
    2) harga final/kontrak dapat berubah setelah survei lokasi aktual,
    3) masa berlaku penawaran 14 hari atau sesuai kesepakatan tertulis.
- **File Terkait**:
  - `src/lib/pdf-generator.tsx`
