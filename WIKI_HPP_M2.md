# Dokumentasi Perhitungan HPP per m² (Katalog)

Dokumentasi ini menjelaskan perubahan pada sistem perhitungan **Harga Pokok Produksi (HPP)** di Kokohin Web & Mini-ERP untuk mendukung perhitungan berbasis luas standar (m²).

## 1. Latar Belakang
Sebelumnya, HPP dihitung berdasarkan akumulasi total material tanpa mempertimbangkan luas area yang dihasilkan. Hal ini menyebabkan nilai HPP menjadi tidak proporsional dibandingkan dengan harga jual per m².

## 2. Alur Perhitungan Baru

### Komponen Biaya
HPP kini terdiri dari tiga komponen utama:
1.  **Total Biaya Material**: Akumulasi `quantity * base_price_per_unit` dari semua material yang terdaftar di `catalog_hpp_components`.
2.  **Biaya Tukang (Labor Cost)**: Biaya jasa tenaga kerja yang dialokasikan untuk pembuatan produk.
3.  **Biaya Transport**: Biaya pengiriman/logistik material ke workshop atau lokasi.

### Formula Perhitungan
Jika `use_std_calculation` diaktifkan (true):
```
Total Biaya Dasar = (Sum(Material Qty * Harga Material)) + Biaya Tukang + Transport
HPP per m² = Total Biaya Dasar / Luas Standar (std_calculation)
```

Jika `use_std_calculation` dimatikan (false):
```
HPP per Unit = Total Biaya Dasar
```

## 3. Contoh Numerik
**Skenario: Pembuatan Kanopi Baja Ringan (Luas Standar 15 m²)**

*   **Material:**
    *   Baja Ringan: 10 batang @ Rp 80.000 = Rp 800.000
    *   Atap Spandek: 18 m @ Rp 50.000 = Rp 900.000
    *   Baut/Screws: 2 pack @ Rp 25.000 = Rp 50.000
    *   *Total Material: Rp 1.750.000*
*   **Biaya Tambahan:**
    *   Biaya Tukang: Rp 500.000
    *   Transport: Rp 250.000
*   **Total Biaya Dasar:** Rp 2.500.000

**Hasil Perhitungan:**
*   **HPP per m²:** Rp 2.500.000 / 15 m² = **Rp 166.667 / m²**
*   **Harga Jual (Margin 30%):** Rp 166.667 * 1.3 = **Rp 216.667 / m²**

## 4. Validasi & Keamanan (Guardrails)
Untuk menjaga profitabilitas, sistem menerapkan indikator warna pada UI Detail Katalog:
*   **Normal (Hijau/Hitam):** HPP ≤ 75% dari Harga Jual.
*   **Warning (Oranye):** HPP > 75% dari Harga Jual. Memberikan peringatan bahwa margin menipis.
*   **Critical (Merah):** HPP ≥ 80% dari Harga Jual. Menandakan risiko kerugian atau margin yang sangat rendah.

## 5. Audit Trail
Setiap perubahan yang memicu perhitungan ulang HPP akan dicatat ke tabel `catalog_hpp_log` dengan data:
*   `catalog_id`: ID Katalog terkait.
*   `hpp_per_m2`: Nilai HPP final yang dihasilkan.
*   `total_cost`: Total biaya dasar sebelum pembagian luas.
*   `calc_by`: ID User yang melakukan perubahan.
*   `calc_date`: Waktu perhitungan.

## 6. Dampak ke Laporan Margin
Perubahan ini memastikan bahwa laporan margin di Dashboard Admin mencerminkan profitabilitas per m², sehingga manajemen dapat mengambil keputusan harga yang lebih akurat untuk setiap tipe katalog produk.
