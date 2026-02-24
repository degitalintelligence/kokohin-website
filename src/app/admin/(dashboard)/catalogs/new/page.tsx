import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import CatalogEstimatePreview from '../components/CatalogEstimatePreview'
import CatalogBaseFields from '../components/CatalogBaseFields'
import CatalogAddonsEditor from '../components/CatalogAddonsEditor'
import styles from '../../page.module.css'
import { createCatalog } from '@/app/actions/catalogs'

export default async function AdminCatalogNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch materials for dropdowns
  const [{ data: atapList }, { data: rangkaList }, { data: allMaterials }] = await Promise.all([
    supabase.from('materials').select('id, name').eq('category', 'atap').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name').eq('category', 'frame').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name, category, base_price_per_unit, unit').eq('is_active', true).order('name')
  ])

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Katalog Baru</h1>
            <p className={styles.sub}>Buat paket kanopi standar baru</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/catalogs" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <button type="submit" form="newCatalogForm" className="btn btn-primary">
              Simpan Katalog
            </button>
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
                <label className="block text-sm font-medium mb-2">Nama Paket *</label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                  placeholder="Contoh: Paket Minimalis Atap Alderon"
                  required
                />
              </div>

              <CatalogBaseFields atapList={atapList ?? []} rangkaList={rangkaList ?? []} />

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Harga Dasar per Satuan (Rp) *</label>
                  <input
                    type="number"
                    name="base_price_per_m2"
                    className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                    placeholder="0"
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Satuan</label>
                  <select name="base_price_unit" className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613] bg-white">
                    <option value="m2">m²</option>
                    <option value="m1">m¹</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500 col-span-3">Harga sebelum markup zona</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-2">Tenaga Kerja (Rp)</label>
                  <input
                    type="number"
                    name="labor_cost"
                    className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                    placeholder="0"
                    min="0"
                    step="1000"
                    defaultValue={0}
                  />
                  <p className="text-xs text-gray-500 mt-1">Mengikuti satuan harga dasar</p>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-2">Transport (Rp)</label>
                  <input
                    type="number"
                    name="transport_cost"
                    className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                    placeholder="0"
                    min="0"
                    step="1000"
                    defaultValue={0}
                  />
                  <p className="text-xs text-gray-500 mt-1">Biaya flat sekali proyek</p>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-2">Margin (%)</label>
                  <input
                    type="number"
                    name="margin_percentage"
                    className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                    placeholder="0"
                    min="0"
                    step="1"
                    defaultValue={0}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Upload Gambar (Opsional)</label>
                <input
                  type="file"
                  name="image_file"
                  accept="image/*"
                  className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                />
                <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WEBP (Max 2MB)</p>
              </div>

              <div className="md:col-span-2 flex items-center pt-4 border-t">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  defaultChecked={true}
                  className="w-4 h-4 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613]"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Katalog Aktif (Tampilkan di Website)
                </label>
              </div>
            </div>

            <div className="pt-6 border-t">
              <CatalogAddonsEditor materials={allMaterials ?? []} />
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
