import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from '../page.module.css'

export default async function AdminCatalogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch catalogs with related materials
  const { data: catalogs, error } = await supabase
    .from('catalogs')
    .select(`
      *,
      atap:atap_id(name, category),
      rangka:rangka_id(name, category)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching catalogs:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCatalogType = (catalog: { atap_id: string | null, rangka_id: string | null }) => {
    if (catalog.atap_id && catalog.rangka_id) return 'Paket Lengkap'
    if (catalog.atap_id) return 'Hanya Atap'
    if (catalog.rangka_id) return 'Hanya Rangka'
    return 'Custom'
  }

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
          <Link href="/admin/catalogs" className={`${styles.navItem} ${styles.active}`}>📁 Katalog</Link>
          <Link href="/admin/zones" className={styles.navItem}>🗺️ Zona</Link>
          <Link href="/admin/projects" className={styles.navItem}>🏗️ Proyek</Link>
          
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
            <h1 className={styles.title}>Manajemen Katalog Paket</h1>
            <p className={styles.sub}>Paket kanopi standar yang ditawarkan ke customer</p>
          </div>
          <Link href="/admin/catalogs/new" className="btn btn-primary">
            + Buat Paket Baru
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>📁</div>
            <div className={styles.statValue}>{catalogs?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Paket</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>
              {formatCurrency(catalogs?.reduce((sum, c) => sum + (c.base_price_per_m2 || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Nilai per m²</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statValue}>
              {catalogs?.filter(c => c.is_active).length ?? 0}
            </div>
            <div className={styles.statLabel}>Paket Aktif</div>
          </div>
        </div>

        {/* Catalogs Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Paket ({catalogs?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-outline-dark btn-sm">Export CSV</button>
              <button className="btn btn-outline-dark btn-sm">Filter</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Paket</th>
                  <th>Jenis</th>
                  <th>Atap</th>
                  <th>Rangka</th>
                  <th>Harga per m²</th>
                  <th>Estimasi 10m²</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {catalogs?.map(catalog => {
                  const estimatedPrice = (catalog.base_price_per_m2 || 0) * 10
                  return (
                    <tr key={catalog.id}>
                      <td className={styles.bold}>{catalog.title}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badge_new}`}>
                          {getCatalogType(catalog)}
                        </span>
                      </td>
                      <td>{catalog.atap?.name || '—'}</td>
                      <td>{catalog.rangka?.name || '—'}</td>
                      <td className={styles.bold}>{formatCurrency(catalog.base_price_per_m2)}</td>
                      <td>{formatCurrency(estimatedPrice)}</td>
                      <td>
                        <span className={`${styles.badge} ${catalog.is_active ? styles.badge_quoted : styles.badge_closed}`}>
                          {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/admin/catalogs/${catalog.id}`} className="btn btn-outline-dark btn-sm">
                            Edit
                          </Link>
                          <button className="btn btn-outline-danger btn-sm">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!catalogs || catalogs.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada paket katalog. <Link href="/admin/catalogs/new">Buat paket pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cara Kerja Paket Katalog</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">1. Paket Standar</h3>
                <p className="text-gray-600 text-sm">
                  Kombinasi material atap + rangka dengan harga per m² yang fixed. 
                  Customer dapat menghitung estimasi langsung di kalkulator.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">2. Escape Hatch</h3>
                <p className="text-gray-600 text-sm">
                  Jika customer memilih &apos;Custom&apos; di kalkulator, sistem akan bypass auto‑calculation 
                  dan menandai proyek sebagai &apos;Need Manual Quote&apos;.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">3. Dynamic Pricing</h3>
                <p className="text-gray-600 text-sm">
                  Harga paket dapat dikalikan dengan zona markup (persentase + flat fee) 
                  berdasarkan lokasi customer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}