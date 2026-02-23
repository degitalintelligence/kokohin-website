### 🎯 Sprint Task: Core System Optimization & Funnel Protection

**To: Engineering Team**
**Priority: High**

Konteks umum: Kita punya struktur *auto-upsell* yang bagus untuk menaikkan AOV, tapi ada beberapa *bottleneck* di level fundamental yang bisa merusak *unit economics* (server cost bengkak) dan *conversion rate* (sales buang waktu urus data sampah).

Tolong eksekusi 4 objektif di bawah ini. *Code implementation* diserahkan ke kalian, pastikan logic-nya *clean* dan *scalable*.

#### 1. Task: Dynamic RBAC (Role-Based Access Control)

* **Target File:** `src/lib/rbac.ts`
* **Context:** Saat ini email *Super Admin* di-hardcode di dalam file. Ini sangat tidak *scalable*. Kalau ada pergantian tim, kita tidak boleh melakukan *full redeploy* hanya untuk ganti satu baris teks.
* **Goal:** Pindahkan konfigurasi `SUPER_ADMIN_EMAILS` ke *Environment Variables* (`.env`).
* **Requirement:** Sistem harus bisa membaca multi-email (misal dipisah koma) dan pastikan ada sanitasi data (otomatis *trim* dan *lowercase*) agar tidak ada *bug* karena *typo* spasi.

#### 2. Task: Lead Quality Control (Funnel Protection)

* **Target File:** `src/app/actions/leads.ts`
* **Context:** Validasi nomor telepon saat ini terlalu longgar (hanya mengecek *length < 9*). Mengingat kita akan *scale* trafik, form ini rentan diisi nomor *dummy* (123456789) atau diserang bot. Ini akan menghancurkan rasio konversi Sales dan bikin *cost per lead* (CPL) di *Ads* jadi tidak akurat.
* **Goal:** Perketat *barrier-to-entry* di form pengumpulan *lead*.
* **Requirement:** Implementasikan Regex khusus untuk validasi nomor telepon Indonesia (wajib dimulai dengan `08`, `628`, atau `+628` dengan panjang digit rasional). *Reject* semua input yang tidak sesuai *pattern* ini dan kembalikan *error message* yang humanis.

#### 3. Task: Basmi N+1 Query Waterfall di Kalkulator

* **Target File:** `src/lib/calculator.ts` (terutama di dalam `calculateCanopyPrice`)
* **Context:** Saat memvalidasi *auto-upsell* (misal: fitur *anti-sagging*), terdapat *looping* yang melakukan *fetch* harga material (`getMaterialPriceByName`) secara sekuensial menggunakan `await` di dalam `for...of`. Ini menciptakan N+1 *query problem*. UI akan *freeze* menunggu tiap *query* selesai satu per satu.
* **Goal:** Optimasi performa kalkulasi agar *response time* tetap instan meskipun ada 10 *item upsell*.
* **Requirement:** Refaktor proses *fetching* di dalam *loop* tersebut. Gunakan eksekusi paralel (seperti `Promise.all`) agar semua harga material di-fetch secara bersamaan ke *database*.

#### 4. Task: Hapus Ilusi In-Memory Cache

* **Target File:** `src/middleware.ts`
* **Context:** Penggunaan `new Map()` sebagai *cache* untuk menyimpan `userRole` (`ROLE_CACHE`) tidak relevan di *serverless environment* (Next.js/Vercel). Setiap *cold start*, memori ini akan kereset. Ini menambah kompleksitas tanpa memberikan *impact* performa yang nyata.
* **Goal:** Bersihkan *technical debt* di level *middleware*.
* **Requirement:** Hapus implementasi in-memory cache tersebut. Jika memang butuh *caching* untuk *role/auth*, evaluasi penggunaan *JWT Claims* bawaan Supabase agar validasi *role* bisa dilakukan tanpa *hit* database sama sekali di level *middleware*.

---

### 🔍 Blind Spots & Strategic Options (Untuk di-review bersama):

1. **Harga Default di Code:** Di fungsi *tempered glass*, ada asumsi harga *sealant* (Rp 10.000). HPP itu dinamis. Pertimbangkan untuk wajib *fetch* dari database berdasarkan ID material, bukan asumsi nama/harga statis agar *margin profit* tidak bocor.
2. **Keamanan Endpoint:** Saat ini belum ada proteksi bot di UI (seperti Cloudflare Turnstile). Jika kita mulai *running Ads* dengan *budget* besar, kompetitor bisa nge-klik CTA dan kirim form palsu.
3. **Supabase RLS:** Pastikan *Row Level Security* di tabel *leads* dan *materials* sudah dikunci ketat. Middleware hanya melindungi rute *frontend*, bukan API database itu sendiri.

**Actionable Insight:** Kerjakan Task 1 dan Task 2 terlebih dahulu hari ini karena berdampak langsung pada operasional dan perlindungan *budget marketing*. Sisanya bisa masuk ke *sprint* optimasi performa.