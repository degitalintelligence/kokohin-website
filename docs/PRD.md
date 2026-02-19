🏗️ TECHNICAL BRIEF & PRD: KOKOHIN WEB & MINI-ERP

Status: 🟢 Approved for Development
Project: Website Company Profile, Lead Gen (Simulasi Harga), & Mini-ERP (Costing/RBAC)

1. 🛠️ TECH STACK & INFRASTRUCTURE

Framework: Next.js (App Router)

Database & Auth: Supabase (Self-hosted)

Deployment: VPS + Coolify

Styling: Tailwind CSS

PDF Generator: @react-pdf/renderer atau setara.

2. 🎨 BRAND GUIDELINES (WAJIB PATUH 100%)

Developer wajib mengimplementasikan UI sesuai Brand Guidelines:

Primary Font: Montserrat (Regular, Bold). Jangan gunakan font lain.

Primary Colors: * Red: #E30613 (Gunakan untuk aksen, tombol primary CTA, highlight)

Black: #1D1D1B (Gunakan untuk background gelap, teks utama, elemen solid)

White Space: Pastikan ada exclusion zone pada logo (padding seukuran logomark). Jangan mepet.

3. 🚨 DEVELOPER RULES & CODE REVISION STANDARD

CRITICAL: Aturan ini mutlak. Pelanggaran akan berakibat code ditolak.

Clear Instructions: Jangan mengubah/refactor sistem atau module yang sudah works tanpa diskusi dan approval.

Aturan Revisi Minor: Jika revisi hanya 1-2 baris, berikan baris kodenya saja disertai comment/petunjuk jelas di mana letak copy-paste-nya.

Aturan Revisi Major (Function): Jika revisi lebih dari 3 baris dalam satu function, wajib berikan full function tersebut. Jangan berikan potongan yang membingungkan.

Aturan Revisi File: Jika file < 500 lines, boleh berikan full file yang direvisi. Jika > 500 lines, WAJIB fokus berikan full function yang direvisi saja.

4. 🧠 ALGORITHMS & BUSINESS LOGIC (BACKEND)

A. Waste Material Calculation (Sisa Potongan)

Waste / sisa potongan wajib dibebankan ke customer. Gunakan ceiling math (pembulatan ke atas) berdasarkan ukuran standar material.

Formula: qty_charged = Math.ceil(qty_needed / length_per_unit) * length_per_unit

Contoh Kasus: Proyek Kanopi butuh Besi Hollow total 14 meter. Besi per batang panjangnya 6 meter.
Math.ceil(14 / 6) = 3 batang.
qty_charged yang dihitung ke costing adalah 3 batang (18 meter).

B. Dynamic Pricing & Costing

Total Harga Estimasi Jual (Customer Price) dihitung dinamis dengan formula:
Total Harga Jual = (Total HPP Material qty_charged) + (Biaya Tukang & Overhead) + Margin (%) + Markup Zona (%) + Flat Fee Zona

C. Satuan Perhitungan

Kanopi: Input P x L. Output perhitungan Area ($m^2$).

Pagar/Railing: Input Panjang (Tinggi diset standar atau dinamis). Output perhitungan Meter Lari ($m^1$).

D. ⚠️ Escape Hatch Strategy (Bypass Logic untuk Custom Request)

Tidak semua request bisa dihitung otomatis. Sistem harus memfasilitasi "Desain Custom" tanpa merusak akurasi harga standar.

Jika user memilih "Desain Custom", BYPASS semua kalkulasi otomatis.

Jangan tampilkan angka Rp NaN atau harga dummy.

Flagging di database (tabel projects): set status menjadi Need Manual Quote. Harga akan diinput manual oleh admin setelah konsultasi.

E. 🛡️ Auto-Upsell & Technical Constraints (Mitigasi Risiko)

Developer WAJIB memasukkan validasi kondisi (if-else) berikut pada sistem Costing Backend:

Bentangan Lebar (Anti-Sagging): JIKA jenis == 'kanopi' DAN dimensi Lebar > 4.5 meter, sistem WAJIB memberi flagging/warning kepada Admin Proyek dan secara otomatis menyarankan penambahan material "Tiang Tengah (V-Shape)" atau upgrade rangka ke profil lebih besar (misal: Hollow 5x10) di tabel estimation_items.

Kaca Tempered (Anti-Bocor/Pecah): JIKA material atap_id yang dipilih merujuk pada Kaca Tempered, sistem WAJIB otomatis mendeteksi dan menambahkan item material Sealant Karet Kaca (atau aksesoris pendukung kaca lainnya) ke dalam kalkulasi total_hpp.

Hitungan Plat Laser Cut: Berbeda dengan material pagar lain yang dihitung per meter lari ($m^1$), komponen HPP khusus Plat Laser Cut WAJIB dikalkulasi berdasarkan Lembar Plat Standar (misal: 1.2m x 2.4m) menggunakan metode Ceiling Math pembulatan ke atas (sama seperti perhitungan Waste batangan besi).

5. 🗄️ DATABASE SCHEMA (SUPABASE)

Terapkan Row Level Security (RLS) di setiap tabel berdasarkan roles.

users & roles

Roles: Super Admin (Owner), Admin Sales, Admin Proyek.

materials (Master Data)

Columns: id, code, name, category (atap, frame, dll), unit (batang, lembar, m1, m2), price, length_per_unit.

Feature: Wajib support Bulk Update via CSV.

catalogs (Master Pricelist / Paket Populer)

Columns: id, image_url, title, atap_id (relasi), rangka_id (relasi), base_price_per_m2, is_active.

Feature: Data ini di-render di halaman depan sebagai Pricelist/Katalog Inspirasi.

zones (Master Zona)

Columns: id, name, markup_percentage, flat_fee.

projects (Leads)

Columns: id, customer_name, phone, address, zone_id, custom_notes, status (New, Surveyed, Quoted, Deal, Lost, Need Manual Quote).

estimations (Header Costing)

Columns: id, project_id, version_number (V1, V2, dst - NO HARD OVERWRITE), total_hpp, margin_percentage, total_selling_price, status.

estimation_items (Detail Costing)

Columns: id, estimation_id, material_id, qty_needed, qty_charged, subtotal.

payment_terms (Termin Pembayaran)

Columns: id, estimation_id, term_name (DP, Termin 1, Pelunasan), percentage, amount_due.

6. 💻 FEATURE SPECS & FUNNELING

Frontend (Customer)

CMS Compro, Gallery & Katalog Pricelist: * Render statis / ISR dari Supabase.

Pricelist Catalog: Tampilkan kartu "Paket Populer" berisi foto, kombinasi material, dan Harga "Mulai dari Rp X / m²".

Auto-fill Kalkulator: Saat CTA di kartu katalog di-klik, sistem akan auto-scroll ke Kalkulator dan pre-fill dropdown Atap & Rangka sesuai paket yang dipilih.

Lead Generation Funnel (Kalkulator):

Step 1 (Input): P x L, Jenis Atap, Rangka Besi (Dropdown dinamis dari DB).

[CRITICAL] Flow Custom: Tambahkan opsi "Desain Custom / Khusus" di Jenis Konstruksi. Jika dipilih, sembunyikan input P x L dan pilihan material. Ganti dengan text-area "Deskripsi Ide".

Step 2 (Lead Capture): Minta Nama & No WA sebelum hasil keluar (Berlaku untuk alur Standar maupun Custom).

Step 3 (Result - Standar): Tampilkan Total Harga Saja. (DILARANG MENAMPILKAN QTY MATERIAL DETAIL).

Step 3 (Result - Custom): Tampilkan pesan khusus "Ide Anda Unik! Tim Engineer kami perlu menghitung material secara spesifik." dan ubah CTA menjadi konsultasi.

Disclaimer Text (Standar): "Estimasi Harga Transparan, Tanpa Biaya Siluman. Angka simulasi di atas adalah perkiraan awal berdasarkan ukuran dan spesifikasi material yang kamu pilih. Harga final yang fixed akan kami kunci ke dalam kontrak kerja setelah tim Kokohin melakukan survei ke lokasimu secara langsung."

CTA: Tombol "Book Jadwal Survei" (Redirect ke WA admin bawa ID Lead).

Backend (Mini-ERP)

Costing Dashboard: Admin membuat nomor estimasi. Perubahan spesifikasi/revisi harga customer wajib membuat version_number baru di database. Untuk lead yang memiliki status Need Manual Quote, admin membuat estimasi V1 sepenuhnya secara manual.

Generate PDF: Generate Quotation resmi berlogo Kokohin (Hitam/Merah) berdasarkan tabel estimations dan payment_terms.

7. 🤖 SOP PENGGUNAAN TRAE AI (AI ASSISTED DEVELOPMENT)

Untuk memastikan TRAE AI (atau AI assistant lainnya) tidak menghasilkan kode sampah (hallucination), menimpa fitur yang sudah jalan, atau mengabaikan business logic, ikuti SOP eksekusi berikut secara ketat:

Phase 1: Context Initialization (Wajib di Prompt Pertama)

Setiap membuka sesi chat/workspace baru di TRAE AI, WAJIB melakukan injeksi konteks.

Tindakan: Masukkan file prd_kokohin.md ini ke dalam knowledge/context window TRAE.

Initial Prompt Standard:

"Kamu adalah Senior Full-Stack Developer Next.js & Supabase. Baca dokumen PRD ini secara menyeluruh. Jangan menulis kode apapun dulu. Balas dengan 'KONTEKS DITERIMA' beserta rangkuman singkat dari struktur database dan aturan revisi kode yang diminta."

Phase 2: Modular Prompting (Jangan Minta Build Semua Sekaligus)

TRAE AI memiliki keterbatasan memori. Pecah pengerjaan menjadi instruksi atomic (kecil dan spesifik).

Langkah 1 (Database): "Buatkan script SQL untuk Supabase berdasarkan Section 5 di PRD. Pastikan RLS diaktifkan untuk setiap tabel."

Langkah 2 (UI Setup): "Buat setup awal Next.js App Router dan inject font Montserrat serta warna Brand (#E30613, #1D1D1B) ke dalam tailwind.config.js."

Langkah 3 (Katalog & Kalkulator): "Buat UI Katalog Pricelist dan Kalkulator. Hubungkan CTA Katalog agar melakukan scroll dan pre-fill state di Kalkulator. Gunakan Tailwind."

Langkah 4 (Costing Logic): "Implementasikan fungsi kalkulasi qty_charged (Sisa Potongan) menggunakan metode pembulatan ke atas (Math.ceil) persis seperti formula di Section 4.A PRD. Pastikan juga constraint Section 4.E diimplementasikan."

Phase 3: Penanganan Revisi & Debugging

Jika terjadi error atau perubahan logic, DILARANG meminta TRAE untuk "Fix all errors".

SOP Debugging:

Copy-paste error log dari terminal secara spesifik.

Prompt Constraint: "Ini ada error di file CostingLogic.ts. Perbaiki error ini, TETAPI patuhi aturan revisi Section 3 di PRD: Berikan hanya full function yang direvisi jika di atas 3 baris. JANGAN menyentuh atau merubah logic zonasi yang sudah berjalan."

🚨 AI Blindspots & Mitigasi

Hilang Ingatan Desain: TRAE sering lupa pakai font Montserrat atau warna brand di tengah jalan. Mitigasi: Selalu sertakan "Gunakan Tailwind dengan primary color #E30613 dan font-montserrat" di akhir prompt UI.

Overwriting Working Code: TRAE suka menghapus kode lama saat nge-generate fitur baru. Mitigasi: Selalu commit ke Git setiap 1 fitur selesai sebelum nge-prompt TRAE untuk fitur berikutnya. Gunakan prompt: "Tambahkan fitur X tanpa mengubah kode existing di luar fitur X."