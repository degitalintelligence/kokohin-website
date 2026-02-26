import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../../page.module.css'
import { updateProject } from '@/app/actions/projects'

export default async function AdminProjectEditPage({
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

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('erp_projects')
    .select('*')
    .eq('id', id)
    .eq('status', 'Deal')
    .single()

  if (projectError || !project) {
    console.error('Error fetching project:', projectError)
    return redirect('/admin/projects?error=Proyek%20tidak%20ditemukan')
  }

  // Fetch zones
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Proyek</h1>
          <p className={styles.sub}>Update informasi proyek dan status</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/projects" className="btn btn-outline-dark">
            ← Kembali
          </Link>
          <button type="submit" form="editProjectForm" className="btn btn-primary">
            Simpan Perubahan
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
        <form id="editProjectForm" action={updateProject} className="p-6 space-y-6">
          <input type="hidden" name="id" value={project.id} />
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Customer *</label>
              <input
                type="text"
                name="customer_name"
                defaultValue={project.customer_name}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telepon Customer</label>
              <input
                type="tel"
                name="customer_phone"
                defaultValue={project.phone}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alamat *</label>
              <textarea
                name="address"
                defaultValue={project.address}
                className="w-full px-4 py-2 border rounded-md"
                rows={3}
                required
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Zona *</label>
              <select
                name="zone_id"
                defaultValue={project.zone_id}
                className="w-full px-4 py-2 border rounded-md"
                required
              >
                <option value="">Pilih Zona</option>
                {(zones ?? []).map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Catatan & Spesifikasi</h3>
            <p className="text-sm text-gray-500 mb-2">
              Format catatan ini dibuat otomatis saat input awal. Anda bebas mengeditnya.
            </p>
            <textarea
              name="custom_notes"
              defaultValue={project.custom_notes}
              className="w-full px-4 py-2 border rounded-md font-mono text-sm"
              rows={10}
            ></textarea>
          </div>
        </form>
      </div>
    </div>
  )
}
