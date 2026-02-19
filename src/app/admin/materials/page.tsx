import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from '../page.module.css'

export default async function AdminMaterialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Fetch materials from Supabase
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching materials:', error)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatLengthUnit = (lengthPerUnit: number | null) => {
    if (!lengthPerUnit) return 'Satuan'
    return lengthPerUnit === 1 ? 'Satuan' : `${lengthPerUnit}m`
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
          <Link href="/admin/materials" className={`${styles.navItem} ${styles.active}`}>📦 Material</Link>
          <Link href="/admin/catalogs" className={styles.navItem}>📁 Katalog</Link>
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
            <h1 className={styles.title}>Manajemen Material</h1>
            <p className={styles.sub}>Daftar material yang digunakan untuk perhitungan harga kanopi</p>
          </div>
          <Link href="/admin/materials/new" className="btn btn-primary">
            + Tambah Material
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.accentCard}`}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statValue}>{materials?.length ?? 0}</div>
            <div className={styles.statLabel}>Total Material</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>
              {formatCurrency(materials?.reduce((sum, m) => sum + (m.base_price_per_unit || 0), 0) || 0)}
            </div>
            <div className={styles.statLabel}>Total Nilai Material</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📏</div>
            <div className={styles.statValue}>
              {materials?.filter(m => m.length_per_unit && m.length_per_unit > 1).length ?? 0}
            </div>
            <div className={styles.statLabel}>Material Batangan/Lembaran</div>
          </div>
        </div>

        {/* Materials Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Semua Material ({materials?.length ?? 0})
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
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Satuan</th>
                  <th>Harga Dasar</th>
                  <th>Panjang per Unit</th>
                  <th>Waste Calculation</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {materials?.map(material => (
                  <tr key={material.id}>
                    <td className={styles.bold}>{material.name}</td>
                    <td>
                      <span className={`${styles.badge} ${material.category === 'atap' ? styles.badge_new : styles.badge_contacted}`}>
                        {material.category}
                      </span>
                    </td>
                    <td>{material.unit}</td>
                    <td className={styles.bold}>{formatCurrency(material.base_price_per_unit)}</td>
                    <td>{formatLengthUnit(material.length_per_unit)}</td>
                    <td>
                      <span className={`${styles.badge} ${material.length_per_unit && material.length_per_unit > 1 ? styles.badge_quoted : styles.badge_closed}`}>
                        {material.length_per_unit && material.length_per_unit > 1 ? 'Math.ceil()' : 'Satuan'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${material.is_active ? styles.badge_quoted : styles.badge_closed}`}>
                        {material.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/admin/materials/${material.id}`} className="btn btn-outline-dark btn-sm">
                          Edit
                        </Link>
                        <button className="btn btn-outline-danger btn-sm">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!materials || materials.length === 0) && (
                  <tr><td colSpan={8} className={styles.empty}>Belum ada material. <Link href="/admin/materials/new">Tambah material pertama</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informasi Waste Calculation</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Batangan/Lembaran</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit &gt; 1</code> akan menggunakan <strong>Ceiling Math (Math.ceil())</strong> dalam perhitungan waste.
                  Contoh: Kebutuhan 14m besi, panjang per batang 6m = Math.ceil(14/6) = 3 batang.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-primary-dark mb-2">Material Satuan</h3>
                <p className="text-gray-600 text-sm">
                  Material dengan <code>length_per_unit = 1</code> atau <code>null</code> dihitung per satuan tanpa waste.
                  Contoh: Paku, baut, cat, dll.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}