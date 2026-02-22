import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../page.module.css'
import { addProjectPublic, deleteProjectPublic, toggleFeatured, togglePublish, updateProjectPublic, importFromErp } from '@/app/actions/projectsPublic'

export default async function AdminGalleryCurationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success: successMsg } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  type ServiceRow = { id: string; name: string }
  const { data: servicesRaw } = await supabase
    .from('services')
    .select('id, name')
    .order('name', { ascending: true })
  const services: ServiceRow[] = (servicesRaw ?? []) as unknown as ServiceRow[]

  // Coba ambil dengan kolom is_public; jika kolom belum ada, fallback tanpa kolom tersebut
  type ServiceRel = { id: string; name: string }
  type ProjectRow = {
    id: string
    title: string
    location: string | null
    year: number | null
    featured: boolean
    is_public?: boolean
    service?: ServiceRel | ServiceRel[] | null
  }
  const { data: projectsWithPublish, error: publishErr } = await supabase
    .from('projects')
    .select('id, title, location, year, featured, is_public, service:service_id(name, id)')
    .order('created_at', { ascending: false })
    .limit(100)
  const hasPublish = !publishErr
  const projects: ProjectRow[] = (projectsWithPublish as unknown as ProjectRow[]) ?? (await (async () => {
    const { data: fb } = await supabase
      .from('projects')
      .select('id, title, location, year, featured, service:service_id(name, id)')
      .order('created_at', { ascending: false })
      .limit(100)
    return (fb as unknown as ProjectRow[]) ?? []
  })()) as ProjectRow[]

  const getServiceName = (svc: ProjectRow['service']): string => {
    return Array.isArray(svc) ? (svc?.[0]?.name ?? '-') : (svc?.name ?? '-')
  }
  const getServiceId = (svc: ProjectRow['service']): string => {
    return Array.isArray(svc) ? (svc?.[0]?.id ?? '') : (svc?.id ?? '')
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kurasi Galeri</h1>
          <p className={styles.sub}>Tambah, ubah, dan atur proyek yang tampil di halaman galeri</p>
        </div>
        <form action={importFromErp}>
          <button className="btn btn-primary">Impor dari ERP</button>
        </form>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6">{successMsg}</div>
      )}

      <div className={styles.section}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Tambah Proyek</h2>
          <form action={addProjectPublic} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <input name="title" placeholder="Judul proyek" className="md:col-span-2 w-full px-4 py-2 border rounded-md" required />
            <input name="location" placeholder="Lokasi" className="md:col-span-1 w-full px-4 py-2 border rounded-md" />
            <input name="year" placeholder="Tahun" type="number" className="md:col-span-1 w-full px-4 py-2 border rounded-md" />
            <select name="service_id" className="md:col-span-1 w-full px-4 py-2 border rounded-md">
              <option value="">Pilih Layanan</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="md:col-span-1 flex items-center gap-4">
              {hasPublish && (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="is_public" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Publish</span>
                </label>
              )}
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="featured" className="w-4 h-4" />
                <span className="text-sm">Featured</span>
              </label>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <button className="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <div className={styles.section}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Daftar Proyek Terkurasi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Judul</th>
                  <th className="px-4 py-3 text-left">Layanan</th>
                  <th className="px-4 py-3 text-left">Lokasi</th>
                  <th className="px-4 py-3 text-left">Tahun</th>
                  {hasPublish && <th className="px-4 py-3 text-left">Publish</th>}
                  <th className="px-4 py-3 text-left">Featured</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(projects || []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.title}</td>
                    <td className="px-4 py-3">{getServiceName(p?.service)}</td>
                    <td className="px-4 py-3">{p.location ?? '-'}</td>
                    <td className="px-4 py-3">{p.year ?? '-'}</td>
                    {hasPublish && (
                      <td className="px-4 py-3">
                        <form action={togglePublish} className="inline">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="next" value={String(!Boolean(p.is_public))} />
                          <button className={`px-3 py-1 rounded-full text-xs font-bold ${p.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                            {p.is_public ? 'Published' : 'Draft'}
                          </button>
                        </form>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <form action={toggleFeatured} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="next" value={String(!p.featured)} />
                        <button className={`px-3 py-1 rounded-full text-xs font-bold ${p.featured ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                          {p.featured ? 'Ya' : 'Tidak'}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-primary">Edit</summary>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2">
                          <form action={updateProjectPublic} className="contents">
                            <input type="hidden" name="id" value={p.id} />
                            <input name="title" defaultValue={p.title} className="md:col-span-2 w-full px-3 py-2 border rounded-md" required />
                            <input name="location" defaultValue={p.location ?? ''} className="md:col-span-1 w-full px-3 py-2 border rounded-md" />
                            <input name="year" defaultValue={p.year ?? ''} type="number" className="md:col-span-1 w-full px-3 py-2 border rounded-md" />
                            <select name="service_id" defaultValue={getServiceId(p?.service)} className="md:col-span-1 w-full px-3 py-2 border rounded-md">
                              <option value="">Pilih Layanan</option>
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <div className="md:col-span-1 flex items-center gap-3">
                              {hasPublish && (
                                <label className="inline-flex items-center gap-2">
                                  <input type="checkbox" name="is_public" defaultChecked={Boolean(p.is_public)} className="w-4 h-4" />
                                  <span className="text-xs">Publish</span>
                                </label>
                              )}
                              <label className="inline-flex items-center gap-2">
                                <input type="checkbox" name="featured" defaultChecked={p.featured} className="w-4 h-4" />
                                <span className="text-xs">Featured</span>
                              </label>
                            </div>
                            <div className="md:col-span-6">
                              <button className="btn btn-primary">Simpan</button>
                            </div>
                          </form>
                          <div className="md:col-span-6">
                            <form action={deleteProjectPublic} className="inline">
                              <input type="hidden" name="id" value={p.id} />
                              <button className="btn btn-outline-dark">Hapus</button>
                            </form>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
                {(!projects || projects.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Belum ada proyek kurasi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
