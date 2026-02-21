import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle } from 'lucide-react'
import { updateCatalog } from '@/app/actions/catalogs'
import styles from '../../page.module.css'
import DeleteCatalogButton from '../components/DeleteCatalogButton'

export default async function AdminCatalogDetailPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }> 
}) {
  const { id } = await params
  const { error: errorMessage } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch catalog by ID
  const { data: catalog, error } = await supabase
    .from('catalogs')
    .select('*')
    .eq('id', id)
    .single()

  // Fetch materials for dropdowns
  const [{ data: atapList }, { data: rangkaList }] = await Promise.all([
    supabase.from('materials').select('id, name').eq('category', 'atap').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name').eq('category', 'frame').eq('is_active', true).order('name')
  ])

  if (error || !catalog) {
    return (
      <div className={`${styles.main} flex-1 h-full`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Katalog Tidak Ditemukan</h1>
            <p className={styles.sub}>Katalog dengan ID {id} tidak ditemukan</p>
          </div>
          <Link href="/admin/catalogs" className="btn btn-primary">
            ← Kembali ke Daftar Katalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Katalog</h1>
          <p className={styles.sub}>Ubah detail paket {catalog.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalogs" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center">
            ← Kembali
          </Link>
          <DeleteCatalogButton id={catalog.id} />
          <button type="submit" form="editCatalogForm" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors ml-auto">
            Simpan Perubahan
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

        <form id="editCatalogForm" action={updateCatalog} className="p-6 space-y-6">
          <input type="hidden" name="id" value={catalog.id} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Nama Paket *</label>
              <input
                type="text"
                name="title"
                defaultValue={catalog.title}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="Contoh: Paket Minimalis Atap Alderon"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Material Atap</label>
              <select 
                name="atap_id" 
                defaultValue={catalog.atap_id || ''}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">Pilih Atap...</option>
                {atapList?.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Material Rangka</label>
              <select 
                name="rangka_id" 
                defaultValue={catalog.rangka_id || ''}
                className="w-full px-4 py-2 border rounded-md"
              >
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
                defaultValue={catalog.base_price_per_m2}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Upload Gambar</label>
              {catalog.image_url && (
                <div className="mb-2">
                  <Image
                    src={catalog.image_url}
                    alt="Preview"
                    width={128}
                    height={128}
                    unoptimized
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <input type="hidden" name="current_image_url" value={catalog.image_url} />
                </div>
              )}
              <input
                type="file"
                name="image_file"
                accept="image/*"
                className="w-full px-4 py-2 border rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengubah gambar.</p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={catalog.is_active}
                  className="w-4 h-4"
                />
                <span className="text-sm">Aktifkan Katalog ini</span>
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
