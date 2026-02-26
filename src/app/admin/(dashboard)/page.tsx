import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, TrendingUp, AlertTriangle, Camera } from 'lucide-react'

export default async function AdminDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const bypass = await isDevBypass()
    if (!user && !bypass) redirect('/admin/login')

    // Fetch counts
    const [
        { count: newLeads },
        { count: totalProjects },
        { count: manualQuoteLeads },
    ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('erp_projects').select('*', { count: 'exact', head: true }).eq('status', 'Deal'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Need Manual Quote'),
    ])

    // Fetch recent leads
    const { data: recentLeads } = await supabase
        .from('leads')
        .select('id, name, phone, location, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    const stats = [
        { label: 'Lead Baru', value: String(newLeads ?? 0), icon: <Users size={24} />, accent: true },
        { label: 'Need Manual Quote', value: String(manualQuoteLeads ?? 0), icon: <AlertTriangle size={24} />, accent: false },
        { label: 'Total Proyek', value: String(totalProjects ?? 0), icon: <TrendingUp size={24} />, accent: false },
    ]

    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    return (
        <div className="p-8 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">Selamat Datang</span>
                    <h1 className="text-3xl font-extrabold text-primary-dark tracking-tight leading-tight m-0">Dashboard</h1>
                    <p className="text-gray-400 text-xs mt-0.5">{user?.email ?? 'Admin'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 font-medium shadow-sm">
                        {today}
                    </div>
                    <Link href="/admin/gallery" className="btn btn-primary inline-flex items-center gap-2">
                        <Camera size={16} />
                        Kurasi Galeri
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
                {stats.map((s, i) => (
                    <div key={i} className={`bg-white border rounded-2xl p-6 flex flex-col ${s.accent ? 'border-primary/20 bg-primary/5' : 'border-gray-200'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${s.accent ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {s.icon}
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
                        <div className="text-sm font-medium text-gray-500">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent leads */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Lead Terbaru</h2>
                    <Link href="/admin/leads" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                        Lihat Semua →
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Nama</th>
                                <th className="px-6 py-3">Telepon</th>
                                <th className="px-6 py-3">Lokasi</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentLeads?.map(lead => (
                                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-900">{lead.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{lead.phone}</td>
                                    <td className="px-6 py-4 text-gray-600">{lead.location}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                                              lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' : 
                                              lead.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(lead.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                </tr>
                            ))}
                            {(!recentLeads || recentLeads.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Belum ada lead masuk.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
