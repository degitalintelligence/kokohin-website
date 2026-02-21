
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { updateZone } from '@/app/actions/zones'
import DeleteZoneButton from '../components/DeleteZoneButton'

export default async function AdminZoneEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: zone, error } = await supabase
    .from('zones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !zone) {
    notFound()
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Edit Zona</h1>
            <p className={styles.sub}>Perbarui detail zona markup</p>
          </div>
          <Link href="/admin/zones" className="btn btn-outline-dark">
            ← Kembali
          </Link>
        </div>

      {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {errorMsg}
          </div>
        )}

        <div className={styles.section}>
          <form action={updateZone} className="p-6 space-y-6">
            <input type="hidden" name="id" value={zone.id} />
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Zona *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={zone.name}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Contoh: Jakarta Selatan"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Markup (%) *</label>
                <input
                  type="number"
                  name="markup_percentage"
                  defaultValue={zone.markup_percentage}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Persentase tambahan harga dari base price</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Flat Fee (Rp)</label>
                <input
                  type="number"
                  name="flat_fee"
                  defaultValue={zone.flat_fee}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Biaya tambahan tetap (ongkir/akomodasi)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Urutan Tampil</label>
                <input
                  type="number"
                  name="order_index"
                  defaultValue={zone.order_index ?? 99}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Kota/Kecamatan (Opsional)</label>
                <textarea
                  name="cities"
                  defaultValue={zone.cities?.join(', ')}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Pisahkan dengan koma. Contoh: Kebayoran Baru, Cilandak, Jagakarsa"
                  rows={2}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  Digunakan untuk auto-detect zona dari alamat customer.
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Deskripsi (Opsional)</label>
                <textarea
                  name="description"
                  defaultValue={zone.description}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Catatan internal"
                  rows={2}
                ></textarea>
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={zone.is_active ?? true}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Aktifkan Zona ini</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <DeleteZoneButton id={zone.id} />
              
              <div className="flex gap-3">
                <Link href="/admin/zones" className="btn btn-outline-dark">
                  Batal
                </Link>
                <button type="submit" className="btn btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </form>
        </div>
    </div>
  )
}
