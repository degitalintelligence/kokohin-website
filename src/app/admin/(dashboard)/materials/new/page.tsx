import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { createMaterial } from '@/app/actions/materials'

export default async function AdminMaterialNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Material Baru</h1>
            <p className={styles.sub}>Tambahkan material baru untuk perhitungan harga kanopi</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/materials" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <button type="submit" form="newMaterialForm" className="btn btn-primary">
              Simpan Material
            </button>
          </div>
        </div>

        {/* Material Form */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Material</h2>
          </div>
          <form id="newMaterialForm" action={createMaterial} className="p-6 space-y-6">
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                Gagal menyimpan material: {decodeURIComponent(errorMessage)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Kode Material *</label>
                <input
                  type="text"
                  name="code"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="MAT-001"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Kode unik untuk material</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nama Material *</label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Baja Ringan 0.75mm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kategori *</label>
                <select
                  name="category"
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  <option value="atap">Atap</option>
                  <option value="frame">Frame / Rangka</option>
                  <option value="aksesoris">Aksesoris</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Satuan *</label>
                <select
                  name="unit"
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="">Pilih Satuan</option>
                  <option value="batang">Batang</option>
                  <option value="lembar">Lembar</option>
                  <option value="m1">Meter Lari (m1)</option>
                  <option value="m2">Meter Persegi (m2)</option>
                  <option value="hari">Hari</option>
                  <option value="unit">Unit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Harga Dasar per Unit *</label>
                <input
                  type="number"
                  name="base_price_per_unit"
                  min="0"
                  step="1000"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Harga dasar sebelum markup zona</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Panjang per Unit (meter)</label>
                <input
                  type="number"
                  name="length_per_unit"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="6"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Kosongkan atau isi 1 untuk material satuan. Isi &gt;1 untuk material batang/lembar (waste calculation dengan Math.ceil())
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                defaultChecked={true}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm">Material aktif (dapat digunakan dalam perhitungan)</label>
            </div>
          </form>
        </div>

        {/* Waste Calculation Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Waste Calculation</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Batangan/Lembaran</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit &gt; 1</code> akan menggunakan <strong>Ceiling Math (Math.ceil())</strong> dalam perhitungan waste.
                  Contoh: Kebutuhan 14m besi, panjang per batang 6m = Math.ceil(14/6) = 3 batang.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Satuan</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit = 1</code> atau <code>null</code> dihitung per satuan tanpa waste.
                  Contoh: Paku, baut, cat, dll.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
