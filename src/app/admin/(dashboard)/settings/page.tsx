import type { Metadata } from 'next'
import Link from 'next/link'
import { getLogoUrl, getLoginBackgroundUrl, getWaNumber, getBasicSettings, getSealantMaterialId, getSecuritySettings } from '@/app/actions/settings'
import LogoUploadForm from '@/components/admin/LogoUploadForm'
import BackgroundUploadForm from '@/components/admin/BackgroundUploadForm'
import WhatsAppNumberForm from '@/components/admin/WhatsAppNumberForm'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isRoleAllowed, ALLOWED_MATERIALS_ROLES } from '@/lib/rbac'
import BasicSettingsForm from '@/components/admin/BasicSettingsForm'
import SealantMaterialForm from '@/components/admin/SealantMaterialForm'
import SecuritySettingsForm from '@/components/admin/SecuritySettingsForm'
import { Link2, ShieldCheck, LayoutTemplate, MessageCircle, CreditCard } from 'lucide-react'
import styles from '../page.module.css'

export const metadata: Metadata = {
    title: 'Pengaturan Website',
}

const SETTINGS_TABS = ['branding', 'umum', 'kalkulator', 'keamanan'] as const
type SettingsTab = typeof SETTINGS_TABS[number]

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ done?: string; tab?: string }> }) {
    const { done, tab } = await searchParams
    const activeTab: SettingsTab = SETTINGS_TABS.includes((tab ?? '') as SettingsTab)
        ? (tab as SettingsTab)
        : 'branding'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const bypass = await isDevBypass()
    if (!user && !bypass) redirect('/admin/login')
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle()
        const role = (profile as { role?: string } | null)?.role ?? null
        if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, (profile as { email?: string } | null)?.email)) {
            redirect('/admin')
        }
    }
    const logoUrl = await getLogoUrl()
    const loginBackgroundUrl = await getLoginBackgroundUrl()
    const waNumber = await getWaNumber()
    const basic = await getBasicSettings()
    const sealantId = await getSealantMaterialId()
    const { data: materials } = await supabase.from('materials').select('id,name').eq('is_active', true).order('name')
    const security = await getSecuritySettings()
    const tabHref = (nextTab: SettingsTab) => {
        const params = new URLSearchParams()
        params.set('tab', nextTab)
        if (done) params.set('done', done)
        return `/admin/settings?${params.toString()}`
    }

    return (
        <div className={`${styles.main} h-full overflow-y-auto`}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Pengaturan Website</h1>
                    <p className={styles.sub}>Kelola branding, konfigurasi kalkulator, keamanan funnel, dan utilitas sistem.</p>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 mb-6">
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={tabHref('branding')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'branding' ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <span className="inline-flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Branding
                        </span>
                    </Link>
                    <Link
                        href={tabHref('umum')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'umum' ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <span className="inline-flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Informasi Umum
                        </span>
                    </Link>
                    <Link
                        href={tabHref('kalkulator')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'kalkulator' ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <span className="inline-flex items-center gap-2"><Link2 className="w-4 h-4" /> Kalkulator
                        </span>
                    </Link>
                    <Link
                        href={tabHref('keamanan')}
                        className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'keamanan' ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Keamanan
                        </span>
                    </Link>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Shortcut Konfigurasi</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Link href="/admin/settings/whatsapp-auto-replies" className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 font-semibold text-gray-800">
                            <MessageCircle className="w-4 h-4 text-[#E30613]" />
                            Auto Reply WhatsApp
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Atur template auto reply untuk inbound chat.</p>
                    </Link>
                    <Link href="/admin/settings/payment-terms" className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 font-semibold text-gray-800">
                            <CreditCard className="w-4 h-4 text-[#E30613]" />
                            Payment Terms
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Atur skema termin pembayaran quotation/ERP.</p>
                    </Link>
                </div>
            </div>

            {activeTab === 'branding' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Branding & Kontak</h2>
                    </div>
                    <div className="p-5 space-y-8">
                        <LogoUploadForm currentLogoUrl={logoUrl} />
                        <WhatsAppNumberForm current={waNumber} />
                        <BackgroundUploadForm currentBackgroundUrl={loginBackgroundUrl} />
                    </div>
                </div>
            )}

            {activeTab === 'umum' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Informasi Umum</h2>
                    </div>
                    <div className="p-5">
                        <BasicSettingsForm siteName={basic.siteName} supportEmail={basic.supportEmail} supportPhone={basic.supportPhone} contactAddress={basic.contactAddress} contactHours={basic.contactHours} companyWebsite={basic.companyWebsite} instagramUrl={basic.instagramUrl} facebookUrl={basic.facebookUrl} tiktokUrl={basic.tiktokUrl} youtubeUrl={basic.youtubeUrl} mapLatitude={basic.mapLatitude} mapLongitude={basic.mapLongitude} mapEmbedUrl={basic.mapEmbedUrl} />
                    </div>
                </div>
            )}

            {activeTab === 'kalkulator' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Kalkulator</h2>
                    </div>
                    <div className="p-5">
                        <SealantMaterialForm currentId={sealantId} materials={(materials as Array<{ id: string; name: string }> | null) ?? []} />
                        <div className="mt-4 text-xs text-gray-500 flex items-start gap-2">
                            <Link2 className="w-3.5 h-3.5 mt-0.5 text-gray-400" />
                            <span>Pastikan material sealant aktif agar kalkulasi aksesoris pada kaca tetap konsisten.</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'keamanan' && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Keamanan Funnel</h2>
                    </div>
                    <div className="p-5">
                        <SecuritySettingsForm blockedIps={security.blockedIps} rateWindowMin={security.rateWindowMin} rateMax={security.rateMax} />
                    </div>
                </div>
            )}

        </div>
    )
}
