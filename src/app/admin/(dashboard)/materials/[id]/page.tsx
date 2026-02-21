import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { updateMaterial } from '@/app/actions/materials'
import DeleteMaterialButton from '../components/DeleteMaterialButton'

export default async function AdminMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch material by ID
  const { data: material, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching material:', error)
    return (
      <div className={`${styles.main} flex-1 h-full`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Material Tidak Ditemukan</h1>
            <p className={styles.sub}>Material dengan ID {id} tidak ditemukan atau telah dihapus</p>
          </div>
          <Link href="/admin/materials" className="btn btn-primary">
            ← Kembali ke Daftar Material
          </Link>
        </div>
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
            <strong>Error:</strong> {error.message}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Material</h1>
          <p className={styles.sub}>Ubah detail material {material.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/materials" className="btn btn-outline-dark">
            ← Kembali
          </Link>
          <DeleteMaterialButton id={material.id} />
          <button type="submit" form="editMaterialForm" className="btn btn-primary">
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Material Info */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Informasi Material</h2>
        </div>
        <form id="editMaterialForm" action={updateMaterial} className="p-6 space-y-6">
          <input type="hidden" name="id" value={material.id} />
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Kode Material</label>
              <input
                type="text"
                name="code"
                defaultValue={material.code}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nama Material</label>
              <input
                type="text"
                name="name"
                defaultValue={material.name}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Kategori</label>
              <select
                name="category"
                defaultValue={material.category}
                className="w-full px-4 py-2 border rounded-md"
                required
              >
                <option value="atap">Atap</option>
                <option value="frame">Rangka</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Satuan</label>
              <input
                type="text"
                name="unit"
                defaultValue={material.unit}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="m, m2, pcs, btg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Harga Dasar (Rp)</label>
              <input
                type="number"
                name="base_price"
                defaultValue={material.base_price}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={material.is_active}
                  className="w-4 h-4"
                />
                <span className="text-sm">Aktifkan Material ini</span>
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
