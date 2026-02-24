import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HardHat, BadgeDollarSign, CheckCircle2, Target } from 'lucide-react'
import styles from '../page.module.css'
import ProjectRow from './components/ProjectRow'

const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const buildProjectsCsv = (projects: Array<{
  id: string
  customer_name: string
  phone: string
  address: string
  status: string
  created_at: string
  zone?: { name?: string | null } | null
  estimation?: { total_selling_price?: number | null; version_number?: number | null } | null
}>) => {
  const header = ['id', 'customer_name', 'phone', 'address', 'zone', 'total_selling_price', 'version_number', 'status', 'created_at']
  const rows = projects.map((project) => [
    escapeCsvValue(project.id),
    escapeCsvValue(project.customer_name),
    escapeCsvValue(project.phone),
    escapeCsvValue(project.address),
    escapeCsvValue(project.zone?.name ?? ''),
    escapeCsvValue(project.estimation?.total_selling_price ?? 0),
    escapeCsvValue(project.estimation?.version_number ?? 0),
    escapeCsvValue(project.status),
    escapeCsvValue(project.created_at)
  ])
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

//

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch projects with zone and estimation data
  const { data: rawProjects, error } = await supabase
    .from('erp_projects')
    .select(`
      *,
      zone:zone_id(name, markup_percentage, flat_fee),
      estimations:estimations(total_selling_price, margin_percentage, created_at, version_number, status)
    `)
    .order('created_at', { ascending: false })
    .order('version_number', { ascending: false, foreignTable: 'estimations' })
    .limit(100)

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const projects = (rawProjects ?? []).map(project => ({
    ...project,
    estimation: project.estimations?.[0] ?? null
  }))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  //

  // Calculate stats
  const totalValue = projects.reduce((sum, p) => sum + (p.estimation?.total_selling_price || 0), 0)
  const dealCount = projects.filter(p => p.status === 'Deal').length
  const manualQuoteCount = projects.filter(p => p.status === 'Need Manual Quote').length
  const csvContent = buildProjectsCsv(projects)
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className="flex-1 h-full p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-extrabold text-[#1D1D1B] tracking-tight leading-tight m-0">Manajemen Proyek Mini‑ERP</h1>
            <p className="text-sm text-gray-400 mt-1">Proyek kanopi dari kalkulator customer dengan status lengkap</p>
          </div>
          <Link href="/admin/projects/new" className="btn btn-primary">
            + Tambah Proyek Manual
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>
              <HardHat className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{projects.length}</div>
            <div className={styles.statLabel}>Total Proyek</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{formatCurrency(totalValue)}</div>
            <div className={styles.statLabel}>Total Nilai Proyek</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{dealCount}</div>
            <div className={styles.statLabel}>Proyek Deal</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Target className="w-5 h-5" />
            </div>
            <div className={styles.statValue}>{manualQuoteCount}</div>
            <div className={styles.statLabel}>Need Manual Quote</div>
          </div>
        </div>

        {/* Projects Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Proyek ({projects.length})
            </h2>
            <div className="flex gap-2">
              <a href={csvHref} download="projects.csv" className="btn btn-outline-dark btn-sm">Export CSV</a>
              <select className="btn btn-outline-dark btn-sm">
                <option>Filter Status</option>
                <option value="New">Baru</option>
                <option value="Surveyed">Surveyed</option>
                <option value="Quoted">Ditawarkan</option>
                <option value="Deal">Deal</option>
                <option value="Lost">Lost</option>
                <option value="Need Manual Quote">Manual Quote</option>
              </select>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Telepon</th>
                  <th className="hidden lg:table-cell">Alamat</th>
                  <th className="hidden md:table-cell">Zona</th>
                  <th>Total Harga</th>
                  <th className="hidden sm:table-cell">Versi</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="hidden md:table-cell">Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects?.map(project => (
                  <ProjectRow key={project.id} project={project} />
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={10} className={styles.empty}>Belum ada proyek. <Link href="/admin/projects/new">Tambah proyek pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Workflow Mini‑ERP</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">1. Kalkulator Customer</h3>
                <p className="text-gray-600 text-sm">
                  Customer memasukkan data di kalkulator → sistem membuat proyek dengan status <strong>&quot;New&quot;</strong>.
                  Jika custom request, status langsung <strong>&quot;Need Manual Quote&quot;</strong>.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">2. Survey & Quotation</h3>
                <p className="text-gray-600 text-sm">
                  Tim sales melakukan survey → update status menjadi <strong>&quot;Surveyed&quot;</strong>.
                  Kemudian membuat penawaran → status <strong>&quot;Quoted&quot;</strong>.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">3. Deal & Execution</h3>
                <p className="text-gray-600 text-sm">
                  Jika deal, status menjadi <strong>&quot;Deal&quot;</strong> dan proyek masuk ke tim produksi.
                  Jika gagal, status <strong>&quot;Lost&quot;</strong> dengan catatan alasan.
                </p>
              </div>
            </div>
            
            {/* Escape Hatch Note */}
            <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-primary-dark">Escape Hatch (Custom Request)</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Jika customer memilih <strong>&quot;Custom&quot;</strong> di kalkulator, sistem otomatis bypass auto‑calculation 
                    dan menandai proyek dengan status <strong>&quot;Need Manual Quote&quot;</strong>. Tim sales harus menghitung manual.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
