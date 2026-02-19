import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from '../page.module.css'

const STATUS_LABELS: Record<string, string> = {
    new: '🆕 Baru',
    contacted: '📞 Dihubungi',
    quoted: '📨 Ditawarkan',
    closed: '✅ Selesai',
}

export default async function AdminLeadsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const { data: leads } = await supabase
        .from('leads')
        .select('*, service:service_id(name)')
        .order('created_at', { ascending: false })

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>🏗️ Kokohin</div>
                <nav className={styles.sidebarNav}>
                    <Link href="/admin" className={styles.navItem}>📊 Dashboard</Link>
                    <Link href="/admin/leads" className={`${styles.navItem} ${styles.active}`}>📋 Leads</Link>
                    
                    <div className={styles.navSeparator}>Mini‑ERP</div>
                    <Link href="/admin/materials" className={styles.navItem}>📦 Material</Link>
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
                        <h1 className={styles.title}>Manajemen Leads</h1>
                        <p className={styles.sub}>Semua permintaan penawaran dari website</p>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Semua Lead ({leads?.length ?? 0})
                        </h2>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Telepon</th>
                                    <th>Email</th>
                                    <th>Lokasi</th>
                                    <th>Layanan</th>
                                    <th>Pesan</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads?.map(lead => (
                                    <tr key={lead.id}>
                                        <td className={styles.bold}>{lead.name}</td>
                                        <td>
                                            <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--clr-accent)', fontWeight: 500 }}>
                                                {lead.phone}
                                            </a>
                                        </td>
                                        <td className={styles.muted}>{lead.email ?? '—'}</td>
                                        <td>{lead.location}</td>
                                        <td>{(lead.service as { name: string } | null)?.name ?? '—'}</td>
                                        <td className={styles.muted} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {lead.message ?? '—'}
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge_${lead.status}`]}`}>
                                                {STATUS_LABELS[lead.status] ?? lead.status}
                                            </span>
                                        </td>
                                        <td className={styles.muted}>
                                            {new Date(lead.created_at).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                                {(!leads || leads.length === 0) && (
                                    <tr><td colSpan={8} className={styles.empty}>Belum ada lead yang masuk.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
