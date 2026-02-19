🤖 TRAE AI / CURSOR AI DEVELOPMENT RULES

Project: Kokohin Web & Mini-ERP
Context: Next.js (App Router), Tailwind CSS, Supabase (Self-hosted).

🛑 STRICT DIRECTIVES (MANDATORY)

BACA ATURAN INI SEBELUM MENULIS SATU BARIS KODE PUN. PELANGGARAN ATURAN INI AKAN MENYEBABKAN KODE DITOLAK.

1. BRAND GUIDELINES & UI

FONT: WAJIB menggunakan font Montserrat secara eksklusif. Jangan pernah menggunakan font standar lain seperti Inter, Roboto, atau Arial.

COLORS: - Primary Red: #E30613 (Untuk CTA utama, highlight, aksen).

Primary Black: #1D1D1B (Untuk teks utama, bg gelap, elemen solid).

AESTHETICS: Gunakan padding/margin yang lega (banyak whitespace). Jangan membuat UI yang terlalu padat atau saling menempel (no cramped UI).

2. CODE REVISION STANDARDS (SANGAT KRITIKAL)

Jangan pernah berasumsi atau melakukan refactoring massal pada kode yang sudah berjalan (works) tanpa diminta.

Revisi Minor (1-2 baris): Berikan HANYA baris kode yang diubah disertai dengan petunjuk lokasi yang sangat spesifik (contoh: "Ganti baris 45 di dalam function X menjadi...").

Revisi Major (di dalam sebuah Function): Jika perubahan lebih dari 3 baris di dalam sebuah function, WAJIB berikan FULL FUNCTION tersebut agar developer manusia tinggal melakukan copy-paste-replace pada function-nya saja, tanpa membingungkan.

Revisi File: - Jika file berukuran < 500 lines: Diperbolehkan mencetak ulang seluruh isi file (full rewrite).

Jika file berukuran > 500 lines: DILARANG KERAS mencetak ulang seluruh file. Hanya cetak bagian function atau component yang mengalami perubahan.

3. BACKEND & LOGIC CONSTRAINTS

Waste Calculation (Sisa Material): Dalam menghitung kebutuhan material batangan atau lembaran utuh, WAJIB menggunakan Ceiling Math (Math.ceil()). Sisa potongan dibebankan ke customer. (Contoh: Butuh 14m besi, panjang per batang 6m. Maka: Math.ceil(14/6) = 3 batang).

Laser Cut Calculation: Material Plat Laser Cut dihitung berdasarkan Lembar Standar, BUKAN per meter lari/persegi.

Escape Hatch (Custom Request): Jika input user memiliki bendera jenis == 'custom', BYPASS (LEWATI) semua fungsi auto-kalkulasi harga. Flag project ini di Supabase dengan status Need Manual Quote. Jangan pernah me-return Rp NaN atau harga dummy ke UI.

4. WORKFLOW INJECTIONS

Saat diminta membuat UI/Komponen baru, selalu akhiri internal thought kamu dengan memastikan bahwa warna #E30613 dan font Montserrat sudah diaplikasikan via Tailwind classes.

Jangan meng-install library/package eksternal baru tanpa meminta persetujuan user terlebih dahulu (Kecuali standar esensial Next.js seperti lucide-react untuk icon).