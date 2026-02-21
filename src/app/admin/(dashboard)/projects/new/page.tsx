import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'

import { createProject } from '@/app/actions/projects'

export default async function AdminProjectNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('*')
    .order('name', { ascending: true })
  const { data: catalogs, error: catalogsError } = await supabase
    .from('catalogs')
    .select('id, title, is_active')
    .order('created_at', { ascending: false })
  if (zonesError) {
    console.error('Error fetching zones:', zonesError)
  }
  if (catalogsError) {
    console.error('Error fetching catalogs:', catalogsError)
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Proyek Baru</h1>
            <p className={styles.sub}>Buat proyek kanopi baru secara manual</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/projects" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <button type="submit" form="newProjectForm" className="btn btn-primary">
              Simpan Proyek
            </button>
          </div>
        </div>

      {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {errorMsg}
          </div>
        )}

        {/* Project Form */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Proyek</h2>
          </div>
          <form id="newProjectForm" action={createProject} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Customer *</label>
                <input
                  type="text"
                  name="customer_name"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Nama customer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telepon Customer</label>
                <input
                  type="tel"
                  name="customer_phone"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0812-3456-7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alamat *</label>
                <textarea
                  name="address"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Alamat lengkap lokasi proyek"
                  rows={3}
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Zona *</label>
                <select
                  name="zone_id"
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="">Pilih Zona</option>
                  {(zones ?? []).map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Pilih zona untuk perhitungan markup harga</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Panjang (meter) *</label>
                <input
                  type="number"
                  name="length"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  step="0.1"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Lebar (meter) *</label>
                <input
                  type="number"
                  name="width"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  step="0.1"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tinggi (meter)</label>
                <input
                  type="number"
                  name="height"
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Katalog</label>
                <select
                  name="catalog_id"
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="">Pilih Katalog (Opsional)</option>
                  {(catalogs ?? []).map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.title}{catalog.is_active ? '' : ' (Nonaktif)'}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Paket kanopi standar</p>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Catatan Tambahan</h3>
              <textarea
                name="notes"
                className="w-full px-4 py-2 border rounded-md"
                placeholder="Catatan khusus, permintaan custom, dll."
                rows={4}
              ></textarea>
            </div>
          </form>
        </div>
    </div>
  )
}
