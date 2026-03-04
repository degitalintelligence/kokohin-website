# Laporan Audit UX - Manajemen Katalog Admin

**Tanggal:** 4 Maret 2026
**Auditor:** Gemini
**Area:** `/admin/catalogs` dan `/admin/catalogs/[id]`

## Ringkasan Eksekutif

Audit ini mengidentifikasi beberapa masalah kritis dan signifikan yang memengaruhi pengalaman pengguna (UX), skalabilitas, dan integritas data pada fitur manajemen katalog admin. Rekomendasi utama berfokus pada perbaikan arsitektur data untuk performa, penyederhanaan alur kerja penyimpanan untuk mencegah kehilangan data, dan restrukturisasi antarmuka untuk mengurangi beban kognitif pengguna.

Implementasi rekomendasi ini diproyeksikan akan secara drastis meningkatkan efisiensi operasional, mengurangi tingkat kesalahan pengguna, dan membangun fondasi yang kuat untuk pertumbuhan data di masa depan.

---

## Temuan Utama & Rekomendasi

### 1. Arsitektur Data Tidak Skalabel (Halaman Daftar)

*   **Temuan:** Halaman daftar katalog (`/admin/catalogs`) memuat **seluruh data (hingga 500 item) ke sisi klien** dan melakukan semua operasi (pencarian, penyaringan, paginasi) di browser.
*   **Severity:** **Kritis** 🔴
*   **Dampak:**
    *   **Performa Buruk:** Waktu muat akan meningkat secara linear dengan jumlah katalog, menyebabkan kelambatan signifikan.
    *   **UI Tidak Responsif:** Browser akan terbebani, berisiko *crash* atau *freeze* saat data bertambah.
    *   **Batas Maksimum:** Terbatas hanya pada 500 item, tidak bisa menampilkan lebih dari itu.
*   **Rekomendasi:**
    1.  **Implementasikan Paginasi, Pencarian, & Penyaringan di Sisi Server (*Server-Side*).**
    2.  Ubah komponen `CatalogsListClient` agar mengirimkan parameter `page`, `query`, `sortKey`, dan `categoryFilter` ke *server action* atau API *route*.
    3.  Server harus melakukan kueri ke *database* dengan `LIMIT`, `OFFSET`, `WHERE`, dan `ORDER BY` yang sesuai, dan hanya mengembalikan data untuk halaman yang diminta.
*   **Success Metrics:**
    *   Waktu muat halaman daftar katalog tetap di bawah 2 detik bahkan dengan >10.000 item.
    *   Penggunaan memori browser oleh klien tetap stabil terlepas dari jumlah total katalog.

### 2. Alur Penyimpanan Data yang Membingungkan (Halaman Detail)

*   **Temuan:** Halaman detail (`/admin/catalogs/[id]`) memiliki **dua mekanisme penyimpanan yang kontradiktif**: tombol "Simpan" manual dan indikator "Autosave" yang tidak fungsional.
*   **Severity:** **Kritis** 🔴
*   **Dampak:**
    *   **Risiko Kehilangan Data:** Pengguna dapat dengan mudah kehilangan pekerjaan karena mereka percaya data sudah tersimpan otomatis.
    *   **Kebingungan Pengguna:** Menciptakan ketidakpastian tentang status data mereka.
*   **Rekomendasi:**
    1.  **Pilih Satu Pola Penyimpanan.**
    2.  **Opsi A (Disarankan): Terapkan *Autosave* Penuh.** Hapus tombol "Simpan". Jadikan `CatalogAutosaveIndicator` benar-benar menyimpan perubahan ke *database* secara otomatis (dengan *debounce*) saat pengguna berhenti mengetik.
    3.  **Opsi B (Alternatif): Gunakan Simpan Manual.** Hapus `CatalogAutosaveIndicator`. Andalkan sepenuhnya tombol "Simpan" dan tambahkan dialog konfirmasi "Anda memiliki perubahan yang belum disimpan" jika pengguna mencoba navigasi keluar.
*   **Success Metrics:**
    *   Zero laporan dari pengguna mengenai kehilangan data setelah melakukan edit.
    *   Peningkatan kepuasan pengguna dalam survei internal terkait alur kerja edit.

### 3. Struktur Halaman yang Kompleks & Padat (Halaman Detail)

*   **Temuan:** Halaman detail adalah sebuah *form* vertikal yang sangat panjang, menggabungkan beberapa bagian logis (Info, HPP, Harga, Addons) menjadi satu.
*   **Severity:** **Tinggi** 🟠
*   **Dampak:**
    *   **Beban Kognitif Tinggi:** Pengguna merasa kewalahan dan sulit fokus pada tugas spesifik.
    *   **Navigasi yang Sulit:** Meskipun ada navigasi jangkar, pengguna masih harus banyak menggulir.
*   **Rekomendasi:**
    1.  **Restrukturisasi Halaman Menggunakan Antarmuka Tab.**
    2.  Ubah `CatalogTabs` menjadi komponen tab yang sebenarnya, di mana setiap bagian utama menjadi panel tab terpisah.
*   **Mockup/Wireframe:**
    ```
    +-------------------------------------------------------------------+
    | Edit Katalog: [Nama Katalog]                                      |
    +-------------------------------------------------------------------+
    | [ Info Dasar ] [ Formulasi HPP ] [ Harga Jual ] [ Komponen Addons ] |
    +===================================================================+
    |                                                                   |
    | Konten untuk "Info Dasar" akan ditampilkan di sini.               |
    |                                                                   |
    | - Judul                                                           |
    | - Kategori                                                        |
    | - Gambar                                                          |
    | - Status Aktif                                                    |
    |                                                                   |
    |                                                                   |
    +-------------------------------------------------------------------+
    ```
*   **Success Metrics:**
    *   Waktu yang dihabiskan pengguna untuk menyelesaikan pengeditan katalog berkurang 20%.
    *   Penurunan jumlah *error* validasi yang disebabkan oleh pengisian data yang tidak lengkap.

### 4. Umpan Balik Pengguna yang Usang

*   **Temuan:** Notifikasi sukses dan *error* disampaikan melalui parameter URL (`searchParams`).
*   **Severity:** **Sedang** 🟡
*   **Dampak:**
    *   Pengalaman pengguna terasa ketinggalan zaman.
    *   URL menjadi tidak bersih dan sulit dibagikan.
*   **Rekomendasi:**
    1.  **Gunakan Sistem Notifikasi *Toast*.**
    2.  Integrasikan *library* seperti `react-hot-toast` untuk menampilkan pesan umpan balik secara *overlay* tanpa mengganggu alur kerja pengguna.
*   **Success Metrics:**
    *   Peningkatan umpan balik positif dari pengguna mengenai kejelasan status sistem.

### 5. Fungsionalitas Ganda yang Redundan

*   **Temuan:** Terdapat dua kolom pencarian di halaman daftar, di mana salah satunya (di *header*) tidak berfungsi.
*   **Severity:** **Rendah** 🟢
*   **Dampak:** Menciptakan kebingungan minor.
*   **Rekomendasi:**
    1.  **Hapus Kolom Pencarian yang Tidak Berfungsi** di *header* `page.tsx`.
    2.  Jadikan kolom pencarian di atas tabel sebagai satu-satunya sumber pencarian, dan pastikan ia terintegrasi dengan pencarian *server-side* yang direkomendasikan di poin #1.
*   **Success Metrics:**
    *   Menghilangkan elemen UI yang membingungkan.

---

## Analisis Tambahan

*   **Aksesibilitas (WCAG 2.1):** **Baik.** Penggunaan atribut `aria-*`, manajemen fokus, dan semantik HTML sudah sangat baik. Tidak ada masalah aksesibilitas mayor yang ditemukan.
*   **Konsistensi Desain:** **Baik.** Penggunaan warna, tipografi (Montserrat), dan *spacing* sudah konsisten dengan *design system* yang didefinisikan dalam `project_rules.md`.
*   **Penanganan Error:** **Cukup.** Halaman sudah menangani kasus di mana data tidak ditemukan. Namun, seperti yang disebutkan, umpan balik *error* bisa ditingkatkan dengan notifikasi *toast*.
