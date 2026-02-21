import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createCatalog } from '@/app/actions/catalogs'
import styles from '../../page.module.css'

export default async function AdminCatalogNewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch materials for dropdowns
  const [{ data: atapList }, { data: rangkaList }] = await Promise.all([
    supabase.from('materials').select('id, name').eq('category', 'atap').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name').eq('category', 'frame').eq('is_active', true).order('name')
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

          <form id="newCatalogForm" action={createCatalog} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nama Paket *</label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Contoh: Paket Minimalis Atap Alderon"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Material Atap</label>
                <select name="atap_id" className="w-full px-4 py-2 border rounded-md">
                  <option value="">Pilih Atap...</option>
                  {atapList?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Material Rangka</label>
                <select name="rangka_id" className="w-full px-4 py-2 border rounded-md">
                  <option value="">Pilih Rangka...</option>
                  {rangkaList?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Harga Dasar per m² (Rp) *</label>
                <input
                  type="number"
                  name="base_price_per_m2"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Harga belum termasuk markup zona</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload Gambar (Opsional)</label>
                <input
                  type="file"
                  name="image_file"
                  accept="image/*"
                  className="w-full px-4 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WEBP (Max 2MB)</p>
              </div>

              <div className="md:col-span-2 flex items-center pt-4 border-t">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  defaultChecked={true}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Katalog Aktif (Tampilkan di Website)
                </label>
              </div>
            </div>
          </form>
        </div>
    </div>
  )
}
