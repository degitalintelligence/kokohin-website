
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { createZone } from '@/app/actions/zones'
import CatalogSaveButton from '../../catalogs/components/CatalogSaveButton'

export default async function AdminZoneNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Tambah Zona Baru</h1>
            <p className={styles.sub}>Buat zona markup baru</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/zones" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <CatalogSaveButton formId="newZoneForm" label="Simpan Zona" />
          </div>
        </div>

      {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {errorMsg}
          </div>
        )}

        <div className={styles.section}>
          <form id="newZoneForm" action={createZone} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label">Nama Zona *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  placeholder="Contoh: Jakarta Selatan"
                  required
                />
              </div>
              
              <div>
                <label className="label">Markup (%) *</label>
                <input
                  type="number"
                  name="markup_percentage"
                  className="input"
                  placeholder="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Persentase tambahan harga dari base price</p>
              </div>

              <div>
                <label className="label">Flat Fee (Rp)</label>
                <input
                  type="number"
                  name="flat_fee"
                  className="input"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Biaya tambahan tetap (ongkir/akomodasi)</p>
              </div>

              <div>
                <label className="label">Urutan Tampil</label>
                <input
                  type="number"
                  name="order_index"
                  className="input"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="col-span-2">
                <label className="label">Kota/Kecamatan (Opsional)</label>
                <textarea
                  name="cities"
                  className="input"
                  placeholder="Pisahkan dengan koma. Contoh: Kebayoran Baru, Cilandak, Jagakarsa"
                  rows={2}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  Digunakan untuk auto-detect zona dari alamat customer.
                </p>
              </div>

              <div className="col-span-2">
                <label className="label">Deskripsi (Opsional)</label>
                <textarea
                  name="description"
                  className="input"
                  placeholder="Catatan internal"
                  rows={2}
                ></textarea>
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Aktifkan Zona ini</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/zones" className="btn btn-outline-dark">
                Batal
              </Link>
            </div>
          </form>
        </div>
    </div>
  )
}
