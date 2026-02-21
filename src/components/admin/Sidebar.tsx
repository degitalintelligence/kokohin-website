'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/actions/auth'
import { LogOut, LayoutDashboard, Users, Box, BookOpen, Map, Briefcase, Settings, ExternalLink } from 'lucide-react'

type AppRole = 'super_admin' | 'admin_sales' | 'admin_proyek' | null

export default function Sidebar() {
    const pathname = usePathname()
    const [role, setRole] = useState<AppRole>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(async ({ data }) => {
            const user = data.user
            if (!user) {
                setRole(null)
                return
            }
            const normalizedEmail = user.email?.toLowerCase() ?? ''
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            const storedRole = (profile as { role?: string } | null)?.role as AppRole ?? null
            const effectiveRole: AppRole =
                normalizedEmail === 'dedi.setiadi92@gmail.com' ? 'super_admin' : storedRole
            setRole(effectiveRole)
        }).catch(() => {
            setRole(null)
        })
    }, [])

    const isActive = (href: string) => {
        if (href === '/admin' && pathname === '/admin') return true
        if (href !== '/admin' && pathname.startsWith(href)) return true
        return false
    }

    const navItemClass = (href: string) => `
        flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all border-l-[3px]
        ${isActive(href) 
            ? 'bg-[#E30613]/10 text-[#ff3a47] border-l-[#E30613] font-semibold' 
            : 'text-white/50 hover:bg-white/5 hover:text-white/90 border-l-transparent hover:border-l-white/15'}
    `

    return (
        <aside className="bg-[#1D1D1B] flex flex-col h-screen sticky top-0 overflow-hidden w-[240px] shrink-0 font-sans">
            <div className="flex items-center gap-2.5 text-lg font-extrabold text-white p-7 border-b border-white/5 tracking-tight">
                <span className="block w-2 h-2 rounded-full bg-[#E30613] shadow-[0_0_8px_#E30613] shrink-0" />
                Kokohin
            </div>

            <nav className="flex-1 flex flex-col py-3 overflow-y-auto">
                <Link href="/admin" className={navItemClass('/admin')}>
                    <LayoutDashboard size={18} />
                    Dashboard
                </Link>
                <Link href="/admin/leads" className={navItemClass('/admin/leads')}>
                    <Users size={18} />
                    Leads
                </Link>

                <div className="px-6 pt-5 pb-1.5 text-[0.68rem] font-bold text-white/25 uppercase tracking-widest">
                    Mini‑ERP
                </div>
                {role === 'super_admin' && (
                    <>
                        <Link href="/admin/materials" className={navItemClass('/admin/materials')}>
                            <Box size={18} />
                            Material
                        </Link>
                        <Link href="/admin/catalogs" className={navItemClass('/admin/catalogs')}>
                            <BookOpen size={18} />
                            Katalog
                        </Link>
                        <Link href="/admin/zones" className={navItemClass('/admin/zones')}>
                            <Map size={18} />
                            Zona
                        </Link>
                    </>
                )}
                <Link href="/admin/projects" className={navItemClass('/admin/projects')}>
                    <Briefcase size={18} />
                    Proyek
                </Link>

                <div className="px-6 pt-5 pb-1.5 text-[0.68rem] font-bold text-white/25 uppercase tracking-widest">
                    Lainnya
                </div>
                {role === 'super_admin' && (
                    <>
                        <Link href="/admin/users" className={navItemClass('/admin/users')}>
                            <Users size={18} />
                            User Management
                        </Link>
                        <Link href="/admin/settings" className={navItemClass('/admin/settings')}>
                            <Settings size={18} />
                            Pengaturan
                        </Link>
                    </>
                )}
                <Link href="/" target="_blank" className={navItemClass('/')}>
                    <ExternalLink size={18} />
                    Lihat Website
                </Link>
            </nav>

            <div className="p-4 border-t border-white/5">
                <button 
                    onClick={() => signOut()} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white/70 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                >
                    <LogOut size={16} />
                    Keluar
                </button>
            </div>
        </aside>
    )
}
