# Checklist Interaksi Pengalaman Pengguna
## Versi 1.0 | Terakhir diperbarui: 2026-02-22

Checklist ini digunakan untuk memastikan semua interaksi pengguna bekerja dengan baik di berbagai device dan browser.

## ✅ **TOAST NOTIFICATION SYSTEM**
- [ ] Toast success muncul ketika form kontak berhasil dikirim
- [ ] Toast error muncul ketika form kontak gagal dikirim
- [ ] Toast error muncul ketika login gagal
- [ ] Toast success muncul ketika material berhasil dihapus
- [ ] Toast error muncul ketika penghapusan material gagal
- [ ] Toast memiliki styling konsisten dengan brand (#E30613, Montserrat)
- [ ] Toast bisa ditutup dengan klik tombol close
- [ ] Toast muncul di posisi top-right
- [ ] Toast tidak menumpuk berlebihan (max 3 toast)

## ✅ **LOADING STATES**
- [ ] Loading spinner muncul ketika form kontak diproses
- [ ] Loading spinner muncul ketika login diproses
- [ ] Loading state muncul ketika material dihapus
- [ ] Loading state muncul ketika kalkulator menghitung
- [ ] Loading state tidak menghalangi interaksi lain yang tidak terkait
- [ ] Loading spinner menggunakan warna primary brand (#E30613)
- [ ] Full page loader tersedia untuk halaman yang memuat data berat

## ✅ **FORM VALIDATION & FEEDBACK**
- [ ] Form kontak menampilkan error visual untuk field yang invalid
- [ ] Error message jelas dan informatif
- [ ] Field yang required ditandai dengan asterisk (*)
- [ ] Validasi client-side untuk format email (jika ada)
- [ ] Validasi client-side untuk format nomor telepon (jika ada)
- [ ] Error field memiliki border merah dan background merah terang
- [ ] Error message memiliki icon peringatan
- [ ] Error hilang ketika user mulai mengetik di field tersebut

## ✅ **ERROR HANDLING**
- [ ] Error network menampilkan pesan user-friendly
- [ ] Error unauthorized/forbidden menampilkan pesan yang sesuai
- [ ] Error server menampilkan pesan yang tidak teknis
- [ ] Error boundary tersedia untuk menangkap runtime error
- [ ] Error display konsisten di seluruh aplikasi
- [ ] Error bisa di-dismiss (jika applicable)

## ✅ **ANIMASI & TRANSISI**
- [ ] Form kontak memiliki animasi fade-in-up
- [ ] Form login memiliki animasi slide-in-right
- [ ] Toast memiliki animasi enter/leave
- [ ] Loading spinner memiliki animasi spin smooth
- [ ] Transisi halaman (jika ada) smooth
- [ ] Animasi tidak mengganggu performa
- [ ] Animasi dinonaktifkan untuk pengguna yang prefer reduced motion

## ✅ **USER JOURNEY UTAMA**
### 1. **Halaman Kalkulator**
- [ ] Input validation untuk semua field
- [ ] Loading state saat menghitung
- [ ] Error handling untuk kalkulasi gagal
- [ ] Toast notification untuk hasil
- [ ] PDF generation dengan feedback
- [ ] Responsif di mobile & tablet

### 2. **Halaman Kontak**
- [ ] Form validation real-time
- [ ] Loading state saat submit
- [ ] Success/error toast
- [ ] Form reset setelah success
- [ ] Responsif di semua device

### 3. **Admin Dashboard**
- [ ] Login form dengan validation
- [ ] Error handling untuk auth failed
- [ ] Loading state untuk semua CRUD operations
- [ ] Toast untuk semua actions (create, update, delete)
- [ ] Confirmation dialog untuk delete actions
- [ ] Responsif di desktop

### 4. **Halaman Katalog**
- [ ] Loading state untuk gambar
- [ ] Error handling untuk gambar gagal load
- [ ] Smooth scrolling
- [ ] Responsif grid layout

## ✅ **AKSESIBILITAS**
- [ ] Semua form field memiliki label yang proper
- [ ] Error messages memiliki aria-live atau aria-describedby
- [ ] Toast memiliki role="alert" atau role="status"
- [ ] Focus management yang baik
- [ ] Keyboard navigation support
- [ ] Color contrast memenuhi standar WCAG

## ✅ **PERFORMA & CROSS-BROWSER**
- [ ] Berfungsi di Chrome (latest)
- [ ] Berfungsi di Firefox (latest)
- [ ] Berfungsi di Safari (latest)
- [ ] Berfungsi di Edge (latest)
- [ ] Responsif di mobile (iPhone, Android)
- [ ] Responsif di tablet (iPad, Android tablet)
- [ ] Loading time acceptable (<3s untuk halaman utama)
- [ ] JavaScript bundle size optimal

## 📋 **TESTING SCENARIOS**
### Scenario 1: Form Kontak
1. Isi form dengan data valid → submit → toast success muncul
2. Isi form dengan data invalid (tanpa nama) → error field muncul
3. Submit saat offline → toast error network muncul
4. Submit dengan server error → toast error server muncul

### Scenario 2: Login Admin
1. Login dengan kredensial salah → toast error muncul
2. Login dengan kredensial benar → redirect ke dashboard
3. Login tanpa koneksi → toast error network muncul

### Scenario 3: CRUD Materials
1. Create material → toast success muncul
2. Update material → toast success muncul
3. Delete material → confirmation dialog → toast success
4. Delete gagal → toast error muncul

### Scenario 4: Kalkulator
1. Hitung dengan input valid → hasil muncul
2. Hitung dengan input invalid → error message
3. Generate PDF → loading → download
4. Simpan lead → toast success

## 🔧 **KOMPONEN YANG DIIMPLEMENTASI**
1. `Toaster` - Toast notification system
2. `LoadingSpinner`, `FullPageLoader`, `ButtonLoadingSpinner`
3. `InputField` - Form input dengan validation
4. `ErrorDisplay`, `ErrorFallback`, `getFriendlyErrorMessage`
5. `Transition`, `FadeIn`, `SlideUp`, `Scale` - Animasi components
6. `useFormValidation` hook untuk form validation

## 📝 **CATATAN TEKNIS**
- Semua komponen UI menggunakan font Montserrat
- Warna primary: #E30613, secondary: #1D1D1B
- Toast menggunakan library Sonner dengan custom styling
- Animasi menggunakan CSS transitions dan keyframes
- Error handling menggunakan utility function untuk user-friendly messages
- Form validation menggunakan custom hook dengan support untuk berbagai rule types

## 🚨 **ISSUES YANG PERLU DIPERHATIKAN**
1. **Cache Issue**: Pastikan revalidatePath('/kalkulator') sudah ditambahkan di actions/materials.ts
2. **DNS Loop**: Pastikan NEXT_PUBLIC_BASE_URL di-set di environment production untuk PDF generation
3. **Orphan Data**: Rollback logic sudah ditambahkan di Calculator.tsx untuk menghapus project jika estimation gagal

## 📊 **METRIK KEBERHASILAN**
- [ ] 100% interaksi memiliki feedback visual
- [ ] 0% interaksi yang broken atau buggy
- [ ] Waktu respon <2s untuk semua actions
- [ ] Error rate <1% untuk interaksi utama
- [ ] User satisfaction score >4.5/5 untuk UX

---
*Checklist ini harus diupdate setiap kali ada penambahan fitur atau perubahan interaksi.*