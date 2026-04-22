import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import CatalogEstimatePreview from '../components/CatalogEstimatePreview'
import CatalogBaseFields from '../components/CatalogBaseFields'
import CatalogAddonsEditor from '../components/CatalogAddonsEditor'
import ImageUpload from '../components/ImageUpload'
import styles from '../../page.module.css'
import { createCatalog } from '@/app/actions/catalogs'
import CatalogSaveButton from '../components/CatalogSaveButton'

export default async function AdminCatalogNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Hanya tampilkan material leaf (tanpa child) agar parent tidak salah dipilih untuk kalkulasi.
  const [{ data: allActiveMaterials }, { data: childRows }] = await Promise.all([
    supabase
      .from('materials')
      .select('id, name, variant_name, category, base_price_per_unit, unit')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('materials')
      .select('parent_material_id')
      .not('parent_material_id', 'is', null),
  ])
  const parentIdsWithChildren = new Set(
    (childRows ?? [])
      .map((row) => row.parent_material_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  )
  const allMaterials = (allActiveMaterials ?? []).filter((material) => !parentIdsWithChildren.has(material.id))

  const withPriority = (keywords: string[]) => {
    const match = (material: { name: string; category: string | null; variant_name?: string | null }) => {
      const haystack = `${material.category ?? ''} ${material.name} ${material.variant_name ?? ''}`.toLowerCase()
      return keywords.some((keyword) => haystack.includes(keyword))
    }
    const prioritized = allMaterials.filter(match)
    const rest = allMaterials.filter((item) => !match(item))
    return [...prioritized, ...rest]
  }

  // Tidak lagi strict enum category agar dropdown tetap aman meski kode kategori material berubah.
  const atapList = withPriority(['atap', 'roof'])
  const rangkaList = withPriority(['frame', 'rangka', 'struktur'])
  const finishingList = withPriority(['finishing', 'coating', 'cat'])
  const isianList = withPriority(['isian', 'infill'])
  const { data: catalogCategories } = await supabase
    .from('catalog_categories')
    .select('code, name, sort_order, require_atap, require_rangka, require_isian, require_finishing')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Katalog Baru</h1>
            <p className={styles.sub}>Buat paket kanopi/pagar standar baru</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/catalogs" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <CatalogSaveButton formId="newCatalogForm" label="Simpan Katalog" />
          </div>
        </div>

        {/* Catalog Form */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Katalog</h2>
          </div>

          {errorMessage && (
            <div className="mx-6 mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {decodeURIComponent(errorMessage)}
            </div>
          )}

          <form id="newCatalogForm" action={createCatalog} className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Nama Paket *</label>
                <input
                  type="text"
                  name="title"
                  className="input"
                  placeholder="Contoh: Paket Minimalis Atap Alderon"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Deskripsi Katalog</label>
                <textarea
                  name="description"
                  className="input min-h-[100px] py-3"
                  placeholder="Jelaskan keunggulan paket ini kepada pelanggan..."
                />
              </div>

              <CatalogBaseFields 
                atapList={atapList} 
                rangkaList={rangkaList} 
                finishingList={finishingList}
                isianList={isianList}
                categoryOptions={catalogCategories ?? []}
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label">Harga Dasar per Satuan (Rp) *</label>
                  <input
                    type="number"
                    name="base_price_per_m2"
                    className="input"
                    placeholder="0"
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                <div>
                  <label className="label">Satuan</label>
                  <select name="base_price_unit" className="input bg-white">
                    <option value="m2">m²</option>
                    <option value="m1">m¹</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500 col-span-3">Harga sebelum markup zona</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="label">Margin (%)</label>
                  <input
                    type="number"
                    name="margin_percentage"
                    className="input"
                    placeholder="0"
                    min="0"
                    step="1"
                    defaultValue={0}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <ImageUpload name="image_file" />
                <p className="text-[10px] text-gray-400 mt-2 italic font-medium">
                  * Gambar akan otomatis dioptimalkan ukurannya sebelum disimpan.
                </p>
              </div>

              <div className="md:col-span-2 pt-4 border-t space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    defaultChecked={true}
                    className="w-4 h-4 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613]"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Status Aktif (dipakai di backend)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_published"
                    id="is_published"
                    defaultChecked={true}
                    className="w-4 h-4 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613]"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Status Publish (ditampilkan di website)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t">
              <CatalogAddonsEditor materials={allMaterials} />
              <p className="text-xs text-gray-500 mt-2">
                Item bertanda opsional dapat dicentang oleh sales/customer di kalkulator.
              </p>
            </div>

            <CatalogEstimatePreview formId="newCatalogForm" />
          </form>
        </div>
    </div>
  )
}
