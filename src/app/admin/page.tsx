import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import styles from './page.module.css'

export default async function AdminDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    // Fetch counts
    const [{ count: newLeads }, { count: totalLeads }, { count: totalProjects }] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
    ])

    // Fetch recent leads
    const { data: recentLeads } = await supabase
        .from('leads')
        .select('id, name, phone, location, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    const stats = [
        { label: 'Lead Baru', value: String(newLeads ?? 0), icon: '🆕', accent: true },
        { label: 'Total Lead', value: String(totalLeads ?? 0), icon: '📋', accent: false },
        { label: 'Total Proyek', value: String(totalProjects ?? 0), icon: '🏗️', accent: false },
    ]

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>🏗️ Kokohin</div>
                <nav className={styles.sidebarNav}>
                    <Link href="/admin" className={`${styles.navItem} ${styles.active}`}>📊 Dashboard</Link>
                    <Link href="/admin/leads" className={styles.navItem}>📋 Leads</Link>
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
                        <h1 className={styles.title}>Dashboard</h1>
                        <p className={styles.sub}>Selamat datang kembali, {user.email}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    {stats.map(s => (
                        <div key={s.label} className={`${styles.statCard} ${s.accent ? styles.accentCard : ''}`}>
                            <div className={styles.statIcon}>{s.icon}</div>
                            <div className={styles.statValue}>{s.value}</div>
                            <div className={styles.statLabel}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Recent leads */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Lead Terbaru</h2>
                        <Link href="/admin/leads" className="btn btn-outline-dark btn-sm">Lihat Semua →</Link>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Telepon</th>
                                    <th>Lokasi</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLeads?.map(lead => (
                                    <tr key={lead.id}>
                                        <td className={styles.bold}>{lead.name}</td>
                                        <td>{lead.phone}</td>
                                        <td>{lead.location}</td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge_${lead.status}`]}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className={styles.muted}>
                                            {new Date(lead.created_at).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                                {(!recentLeads || recentLeads.length === 0) && (
                                    <tr><td colSpan={5} className={styles.empty}>Belum ada lead.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
