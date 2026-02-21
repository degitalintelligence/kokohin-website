import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import GeneratePdfButton from '@/components/admin/GeneratePdfButton'

type EstimationRow = {
  id: string
  version_number: number | null
  total_selling_price: number | null
  margin_percentage: number | null
  created_at: string | null
}

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  
  if (!user && !bypass) redirect('/admin/login')

  // Fetch project with zone and estimations
  const { data: project, error } = await supabase
    .from('erp_projects')
    .select(`
      *,
      zone:zone_id(name),
      estimations:estimations(*)
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    console.error('Error fetching project:', error)
    return redirect('/admin/projects?error=Proyek%20tidak%20ditemukan')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      {/* Main */}
      <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Detail Proyek</h1>
            <p className={styles.sub}>{project.customer_name} - {project.status}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/projects" className="btn btn-outline-dark">
              ← Kembali
            </Link>
            <Link href={`/admin/projects/${project.id}/edit`} className="btn btn-primary">
              Edit Proyek
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Utama */}
          <div className="lg:col-span-2 space-y-6">
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Informasi Customer</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Customer</label>
                  <p className="font-bold text-lg">{project.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telepon</label>
                  <p className="font-bold text-lg">{project.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Alamat</label>
                  <p className="text-gray-800">{project.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Zona</label>
                  <p className="font-bold">{project.zone?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-bold bg-gray-100`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Catatan & Spesifikasi</h2>
              </div>
              <div className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border">
                  {project.custom_notes || 'Tidak ada catatan.'}
                </pre>
              </div>
            </div>
          </div>

          {/* Estimasi & Riwayat */}
          <div className="space-y-6">
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Riwayat Estimasi</h2>
              </div>
              <div className="p-0">
                {(project.estimations && project.estimations.length > 0) ? (
                  <ul className="divide-y divide-gray-100">
                    {((project.estimations ?? []) as EstimationRow[])
                      .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))
                      .map((est) => (
                      <li key={est.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm">Versi {est.version_number}</span>
                          <span className="text-xs text-gray-500">{formatDate(est.created_at)}</span>
                        </div>
                        <div className="font-bold text-[#E30613]">
                          {formatCurrency(est.total_selling_price || 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Margin: {est.margin_percentage}%
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Belum ada estimasi harga.
                  </div>
                )}
                <div className="p-4 border-t border-gray-100 space-y-3">
                  <button className="w-full btn btn-outline-dark text-sm" disabled>
                    + Buat Estimasi Baru (Coming Soon)
                  </button>
                  <GeneratePdfButton
                    projectId={project.id}
                    disabled={!project.estimations || project.estimations.length === 0}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
