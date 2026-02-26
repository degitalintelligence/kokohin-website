# Wiki: Perhitungan HPP per m² (Katalog)

Dokumen ini menjelaskan alur perhitungan Harga Pokok Produksi (HPP) per meter persegi (atau satuan standar lainnya) pada modul Katalog Kokohin.

## 1. Alur Perhitungan

Sistem menghitung HPP katalog secara otomatis setiap kali ada perubahan pada komponen HPP (material, labor, transport) atau pengaturan standar luas.

### Langkah-langkah:
1. **Akumulasi Biaya (Total Cost):**
   - **Material:** Mengambil semua material yang terdaftar di `catalog_hpp_components`. Jumlah yang dihitung menggunakan *Ceiling Math* (pembulatan ke atas) sesuai panjang/unit material standar.
   - **Labor & Transport:** Ditambahkan dari field `labor_cost` dan `transport_cost` pada master katalog.
   - `Total Cost = (Sum of Material Costs) + Labor Cost + Transport Cost`

2. **Aplikasi Standar Luas (std_calculation):**
   - Jika flag `use_std_calculation` aktif (**true**):
     - `HPP per m² = Total Cost / std_calculation`
   - Jika flag tidak aktif (**false**):
     - `HPP per m² = Total Cost` (Legacy mode)

3. **Audit Trail (Logging):**
   - Setiap perhitungan baru akan dicatat ke tabel `catalog_hpp_log` untuk memantau histori perubahan HPP, mencakup nilai HPP per m², total cost, dan user yang melakukan perubahan.

---

## 2. Contoh Numerik

### Skenario: Paket Kanopi Standard (Luas 15 m²)
- **Biaya Material (Ceiling Math applied):** Rp 9.000.000
- **Biaya Tukang (Labor):** Rp 1.500.000
- **Biaya Transport:** Rp 750.000
- **Total Biaya Dasar:** Rp 11.250.000

**A. Mode Legacy (use_std_calculation = false):**
- **HPP Terhitung:** Rp 11.250.000 (Nilai total proyek, bukan per m²)
- **Masalah:** Jika harga jual diset Rp 1.000.000/m², margin akan terlihat sangat negatif.

**B. Mode Baru (use_std_calculation = true, std_calculation = 15):**
- **HPP per m²:** 11.250.000 / 15 = **Rp 750.000 / m²**
- **Harga Jual:** Rp 1.000.000 / m²
- **Rasio HPP:** 75% (Status: Warning Orange)
- **Margin:** Rp 250.000 / m² (25%)

---

## 3. Dampak ke Laporan Margin

- **Akurasi Profitabilitas:** Margin kini dihitung berdasarkan satuan unit yang sama dengan harga jual (per m²), sehingga data di dashboard admin mencerminkan keuntungan riil per satuan luas.
- **Sistem Peringatan (Guardrails):**
  - **HPP > 75% Harga Jual:** Muncul peringatan warna **Orange** (Margin menipis).
  - **HPP > 80% Harga Jual:** Muncul peringatan warna **Merah** (Kritis, margin di bawah target minimal perusahaan).
- **Audit Compliance:** Perubahan harga material di pasar yang mempengaruhi HPP dapat ditelusuri lewat `catalog_hpp_log`, memudahkan evaluasi kenaikan harga jual di masa depan.

---

## 4. Teknis Database

- **Tabel Utama:** `catalogs` (kolom `std_calculation`, `use_std_calculation`)
- **Tabel Log:** `catalog_hpp_log` (audit trail)
- **API Response:** `GET /api/public/catalogs` sekarang menyertakan field `hpp_per_m2` dan `total_cost`.
