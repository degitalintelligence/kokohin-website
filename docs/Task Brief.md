
# 🛠️ Task Brief: Epic 4 - Perfect Modular Structure (Add-ons & Formulas)

**Context:** Kita akan membuat relasi *Many-to-Many* yang solid antara katalog dan material. Katalog kanopi tidak lagi hanya rangka + atap, tapi bisa memiliki banyak komponen tambahan (Talang, Plafond, Lampu) yang dihitung otomatis berdasarkan luas (m²).

**1. Database Migration (Supabase)**
Buat tabel baru `catalog_addons` sebagai *junction table* yang menghubungkan `catalogs` dan `materials`.

* **Kolom yang dibutuhkan:** * `id` (UUID, PK)
* `catalog_id` (UUID, FK to `catalogs`, cascade delete)
* `material_id` (UUID, FK to `materials`)
* `qty_per_m2` (Float/Decimal) -> Menentukan berapa banyak material ini dibutuhkan per m². Contoh: 1 m² kanopi butuh 1.5 meter talang air.
* `is_optional` (Boolean) -> Menentukan apakah item ini wajib (termasuk di harga dasar) atau opsional (bisa di-checklist oleh user/sales).



**2. Update Types (`src/lib/types.ts`)**
Tambahkan *interface* baru dan update `Catalog` agar bisa menangkap relasi ini. Terapkan tepat di bawah definisi `Catalog` saat ini.

```typescript
// Tambahkan di src/lib/types.ts
export interface CatalogAddon {
    id: string
    catalog_id: string
    material_id: string
    material?: Material
    qty_per_m2: number
    is_optional: boolean
}

// Update interface Catalog (gabungan dengan instruksi Epic 1 sebelumnya)
export interface Catalog {
    // ... (pertahankan field id, image_url, title, atap_id, rangka_id, is_active, created_at, updated_at)
    margin_percentage: number
    total_hpp_per_m2: number
    base_price_per_m2: number // Biarkan sementara untuk backward compatibility
    addons?: CatalogAddon[] 
}

```

**3. Update UI & Server Actions Admin**

* **UI (`src/app/admin/(dashboard)/catalogs/new/page.tsx` & `[id]/page.tsx`):** Tambahkan seksi "Komponen Tambahan". Buat UI dinamis (tombol *Add Row*) dimana Admin bisa memilih material dari *dropdown*, menentukan `qty_per_m2`, dan *toggle* apakah item ini opsional.
* **Actions (`src/app/actions/catalogs.ts`):** Rombak fungsi `createCatalog` dan `updateCatalog`. Pastikan sistem melakukan *insert/update* ke tabel `catalogs` terlebih dahulu untuk mendapatkan ID-nya, lalu iterasi data untuk *insert/delete/update* ke tabel `catalog_addons`.
* **🚨 Aturan Main:** Jika merubah logic di `createCatalog` / `updateCatalog` lebih dari 3 baris, **TULIS ULANG FULL FUNCTION**. Jangan biarkan kode berantakan atau *error handling* tertinggal.

**4. Core Calculator Logic Revamp (`src/lib/calculator.ts`)**
Di fungsi kalkulasi (misal `calculateCanopyPrice`), tambahkan *loop* untuk menghitung `catalog_addons` setelah menghitung Rangka dan Atap.

* **Logic HPP Addon:** `(addon.material.base_price_per_unit * addon.qty_per_m2) * luas kanopi`.
* Tambahkan biaya ini ke `Total HPP Keseluruhan`.
* Pastikan `Breakdown` me-return *list* komponen ini agar transparan di PDF penawaran.

---

**Blindspot Check & Actionable Insight:**
Dengan struktur ini, *backend* kamu sudah siap menangani perhitungan serumit apapun. Tapi, ada satu imbas ke sisi UI/UX *Frontend*:

Karena sekarang kita punya komponen `is_optional` (opsional), tampilan Kalkulator di halaman depan harus di-update agar memiliki *Checkbox*. Misalnya:

* [ ] Tambah Plafond PVC (+ Rp 200.000)
* [ ] Tambah Talang Air (+ Rp 150.000)

