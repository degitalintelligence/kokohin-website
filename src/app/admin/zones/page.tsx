import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from '../page.module.css'

export default async function AdminZonesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch zones from Supabase
  const { data: zones, error } = await supabase
    .from('zones')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching zones:', error)
  }

  const formatPercentage = (value: number) => {
    return `${value}%`
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
          <Link href="/admin/zones" className={`${styles.navItem} ${styles.active}`}>🗺️ Zona</Link>
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
            <h1 className={styles.title}>Manajemen Zona Markup</h1>
            <p className={styles.sub}>Konfigurasi markup harga berdasarkan lokasi customer (Jabodetabek)</p>
          </div>
          <Link href="/admin/zones/new" className="btn btn-primary">
            + Tambah Zona
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>🗺️</div>
            <div className={styles.statValue}>{zones?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Zona</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📈</div>
            <div className={styles.statValue}>
              {formatPercentage(zones?.reduce((sum, z) => sum + (z.markup_percentage || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Markup %</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>
              {formatCurrency(zones?.reduce((sum, z) => sum + (z.flat_fee || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Flat Fee</div>
          </div>
        </div>

        {/* Zones Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Daftar Zona ({zones?.length ?? 0})
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-outline-dark btn-sm">Export CSV</button>
              <button className="btn btn-outline-dark btn-sm">Reset Urutan</button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Urutan</th>
                  <th>Nama Zona</th>
                  <th>Kota/Kecamatan</th>
                  <th>Markup %</th>
                  <th>Flat Fee</th>
                  <th>Deskripsi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {zones?.map(zone => (
                  <tr key={zone.id}>
                    <td className={styles.bold}>
                      <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full">
                        {zone.order_index}
                      </div>
                    </td>
                    <td className={styles.bold}>{zone.name}</td>
                    <td>
                      <div className="text-sm text-gray-700">{zone.cities?.join(', ') || 'Semua'}</div>
                    </td>
                    <td className={styles.bold}>
                      <span className={`${styles.badge} ${zone.markup_percentage > 0 ? styles.badge_new : styles.badge_closed}`}>
                        {formatPercentage(zone.markup_percentage)}
                      </span>
                    </td>
                    <td className={styles.bold}>
                      {zone.flat_fee ? formatCurrency(zone.flat_fee) : '—'}
                    </td>
                    <td className={styles.muted} style={{ maxWidth: 200 }}>
                      {zone.description || '—'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${zone.is_active ? styles.badge_quoted : styles.badge_closed}`}>
                        {zone.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/admin/zones/${zone.id}`} className="btn btn-outline-dark btn-sm">
                          Edit
                        </Link>
                        <button className="btn btn-outline-danger btn-sm">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!zones || zones.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada zona. <Link href="/admin/zones/new">Tambah zona pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cara Kerja Zona Markup</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Urutan Prioritas</h3>
                <p className="text-gray-600 text-sm">
                  Sistem akan mencocokkan alamat customer dengan zona berdasarkan <strong>order_index</strong>.
                  Zona dengan order_index lebih kecil diprioritaskan.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Contoh: Jakarta Pusat (order_index=1) diprioritaskan daripada Jabodetabek (order_index=5)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Jika tidak cocok, zona default (is_default=true) akan digunakan</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Formula Perhitungan</h3>
                <p className="text-gray-600 text-sm">
                  Harga setelah markup dihitung dengan rumus:
                </p>
                <div className="mt-3 bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <code>
                    final_price = base_price * (1 + markup_percentage/100) + flat_fee
                  </code>
                </div>
                <p className="mt-3 text-gray-600 text-sm">
                  Contoh: Base harga Rp 5.000.000, markup 10%, flat fee Rp 200.000
                  <br />
                  <strong>Final = 5.000.000 × 1.10 + 200.000 = Rp 5.700.000</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}