import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from '../page.module.css'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'New': { label: '🆕 Baru', color: 'badge_new' },
  'Surveyed': { label: '📏 Surveyed', color: 'badge_contacted' },
  'Quoted': { label: '💰 Ditawarkan', color: 'badge_quoted' },
  'Deal': { label: '✅ Deal', color: 'badge_closed' },
  'Lost': { label: '❌ Lost', color: 'badge_closed' },
  'Need Manual Quote': { label: '🎯 Manual Quote', color: 'badge_new' }
}

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch projects with zone and estimation data
  const { data: projects, error } = await supabase
    .from('erp_projects')
    .select(`
      *,
      zone:zone_id(name, markup_percentage, flat_fee),
      estimation:estimation_id(total_price, margin_percentage, markup_percentage)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Calculate stats
  const totalValue = projects?.reduce((sum, p) => sum + (p.estimation?.total_price || 0), 0) || 0
  const dealCount = projects?.filter(p => p.status === 'Deal').length || 0
  const manualQuoteCount = projects?.filter(p => p.status === 'Need Manual Quote').length || 0

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>🏗️ Kokohin</div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin" className={styles.navItem}>📊 Dashboard</Link>
          <Link href="/admin/leads" className={styles.navItem}>📋 Leads</Link>
          
          <div className={styles.navSeparator}>Mini‑ERP</div>
          <Link href="/admin/materials" className={styles.navItem}>📦 Material</Link>
          <Link href="/admin/catalogs" className={styles.navItem}>📁 Katalog</Link>
          <Link href="/admin/zones" className={styles.navItem}>🗺️ Zona</Link>
          <Link href="/admin/projects" className={`${styles.navItem} ${styles.active}`}>🏗️ Proyek</Link>
          
          <div className={styles.navSeparator}>Lainnya</div>
          <Link href="/" className={styles.navItem} target="_blank">🌐 Lihat Website ↗</Link>
        </nav>
        <form action={signOut} className={styles.sidebarFooter}>
          <button type="submit" className={styles.logoutBtn}>🚪 Keluar</button>
        </form>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Manajemen Proyek Mini‑ERP</h1>
            <p className={styles.sub}>Proyek kanopi dari kalkulator customer dengan status lengkap</p>
          </div>
          <Link href="/admin/projects/new" className="btn btn-primary">
            + Tambah Proyek Manual
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>🏗️</div>
            <div className={styles.statValue}>{projects?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Proyek</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>{formatCurrency(totalValue)}</div>
            <div className={styles.statLabel}>Total Nilai Proyek</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statValue}>{dealCount}</div>
            <div className={styles.statLabel}>Proyek Deal</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statValue}>{manualQuoteCount}</div>
            <div className={styles.statLabel}>Need Manual Quote</div>
          </div>
        </div>

        {/* Projects Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Proyek ({projects?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-outline-dark btn-sm">Export CSV</button>
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
                  <th>Customer</th>
                  <th>Telepon</th>
                  <th>Alamat</th>
                  <th>Zona</th>
                  <th>Total Harga</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects?.map(project => {
                  const statusConfig = STATUS_CONFIG[project.status] || { label: project.status, color: 'badge_closed' }
                  const zoneName = project.zone?.name || '—'
                  const totalPrice = project.estimation?.total_price || 0
                  
                  return (
                    <tr key={project.id}>
                      <td className={styles.bold}>{project.customer_name}</td>
                      <td>
                        <a 
                          href={`https://wa.me/${project.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {project.phone}
                        </a>
                      </td>
                      <td className={styles.muted} style={{ maxWidth: 180 }}>
                        {project.address}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${project.zone_id ? styles.badge_new : styles.badge_closed}`}>
                          {zoneName}
                        </span>
                      </td>
                      <td className={styles.bold}>
                        {totalPrice > 0 ? formatCurrency(totalPrice) : '—'}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[statusConfig.color]}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className={styles.muted}>{formatDate(project.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/admin/projects/${project.id}`} className="btn btn-outline-dark btn-sm">
                            Detail
                          </Link>
                          <Link href={`/admin/projects/${project.id}/edit`} className="btn btn-outline-dark btn-sm">
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!projects || projects.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada proyek. <Link href="/admin/projects/new">Tambah proyek pertama</Link></td></tr>
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
                <div className="text-2xl">🎯</div>
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
      </main>
    </div>
  )
}