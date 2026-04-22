import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { createMaterial } from '@/app/actions/materials'
import CatalogSaveButton from '../../catalogs/components/CatalogSaveButton'

export default async function AdminMaterialNewPage({ searchParams }: { searchParams: Promise<{ error?: string; variant_of?: string }> }) {
  const { error: errorMessage, variant_of: variantOf } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: categoriesRaw } = await supabase
    .from('material_categories')
    .select('code, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: parentMaterial } = variantOf
    ? await supabase
      .from('materials')
      .select('id, code, name, category, unit, length_per_unit, is_laser_cut, requires_sealant, parent_material_id')
      .eq('id', variantOf)
      .maybeSingle()
    : { data: null }

  const categories = categoriesRaw ?? []
  const defaultCategory = parentMaterial?.category ?? ''
  const defaultUnit = parentMaterial?.unit ?? ''
  const defaultLength = parentMaterial?.length_per_unit ?? 1
  const defaultName = parentMaterial?.name ?? ''
  const defaultVariantName = parentMaterial ? 'Varian Baru' : 'Default'

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Material Baru</h1>
            <p className={styles.sub}>
              {parentMaterial?.parent_material_id
                ? 'Parent varian tidak valid. Pilih material utama dari daftar material.'
                : parentMaterial
                  ? `Tambah varian untuk ${parentMaterial.name}`
                  : 'Tambahkan material baru untuk perhitungan harga kanopi'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/materials" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <CatalogSaveButton formId="newMaterialForm" label="Simpan Material" />
          </div>
        </div>

        {/* Material Form */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Material</h2>
          </div>
          <form id="newMaterialForm" action={createMaterial} className="p-6 space-y-6">
            {parentMaterial && !parentMaterial.parent_material_id && (
              <input type="hidden" name="parent_material_id" value={parentMaterial.id} />
            )}
              {(errorMessage || (parentMaterial?.parent_material_id ? 'Parent varian tidak boleh varian lain.' : null)) && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                  Gagal menyimpan material:{' '}
                  {parentMaterial?.parent_material_id
                    ? 'Parent varian tidak boleh varian lain.'
                    : decodeURIComponent(errorMessage || '')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label">Kode Material</label>
                <input
                  type="text"
                  className="input bg-gray-50 text-gray-500"
                  value="Otomatis dari sistem saat disimpan"
                  readOnly
                  aria-readonly="true"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tidak perlu isi manual. Sistem akan membuat kode unik otomatis.
                </p>
              </div>
              <div>
                <label className="label">Nama Material *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  defaultValue={defaultName}
                  placeholder="Baja Ringan"
                  required
                />
              </div>
              <div>
                <label className="label">Nama Varian *</label>
                <input
                  type="text"
                  name="variant_name"
                  className="input"
                  defaultValue={defaultVariantName}
                  placeholder="0.75 mm"
                  required
                />
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select
                  name="category"
                  defaultValue={defaultCategory}
                  className="input"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Satuan *</label>
                <select
                  name="unit"
                  defaultValue={defaultUnit}
                  className="input"
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
                <label className="label">Harga Dasar per Unit *</label>
                <input
                  type="number"
                  name="base_price_per_unit"
                  min="0"
                  step="1000"
                  className="input"
                  placeholder="0"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Harga dasar sebelum markup zona</p>
              </div>
              <div>
                <label className="label">Panjang per Unit (meter)</label>
                <input
                  type="number"
                  name="length_per_unit"
                  min="0.01"
                  step="0.01"
                  className="input"
                  defaultValue={defaultLength}
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
            <div className="grid grid-cols-2 gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_laser_cut"
                  defaultChecked={Boolean(parentMaterial?.is_laser_cut)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Material Plat Laser Cut</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="requires_sealant"
                  defaultChecked={Boolean(parentMaterial?.requires_sealant)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Butuh Sealant (mis. kaca tempered)</span>
              </label>
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
