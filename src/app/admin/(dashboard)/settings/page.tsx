import type { Metadata } from 'next'
import { getLogoUrl, getLoginBackgroundUrl, getWaNumber, getBasicSettings } from '@/app/actions/settings'
import LogoUploadForm from '@/components/admin/LogoUploadForm'
import BackgroundUploadForm from '@/components/admin/BackgroundUploadForm'
import { removeMembraneService } from '@/app/actions/services'
import WhatsAppNumberForm from '@/components/admin/WhatsAppNumberForm'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isRoleAllowed, ALLOWED_MATERIALS_ROLES } from '@/lib/rbac'
import BasicSettingsForm from '@/components/admin/BasicSettingsForm'

export const metadata: Metadata = {
    title: 'Pengaturan Website',
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
    const { done } = await searchParams
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

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Pengaturan Website</h1>
            {done === 'membrane_removed' && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                    Layanan “Kanopi Membrane” telah dinonaktifkan/dihapus dari database.
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Branding & Kontak</h2>
                <div className="divider mb-6" />
                
                <div className="max-w-2xl space-y-8">
                    <LogoUploadForm currentLogoUrl={logoUrl} />
                    <WhatsAppNumberForm current={waNumber} />
                    <BackgroundUploadForm currentBackgroundUrl={loginBackgroundUrl} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Informasi Umum</h2>
                <div className="divider mb-6" />
                <BasicSettingsForm siteName={basic.siteName} supportEmail={basic.supportEmail} supportPhone={basic.supportPhone} contactAddress={basic.contactAddress} contactHours={basic.contactHours} companyWebsite={basic.companyWebsite} instagramUrl={basic.instagramUrl} facebookUrl={basic.facebookUrl} tiktokUrl={basic.tiktokUrl} youtubeUrl={basic.youtubeUrl} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Utilitas</h2>
                <div className="divider mb-6" />
                <form action={removeMembraneService} className="space-y-3">
                    <p className="text-sm text-gray-600">
                        Hapus/nonaktifkan record layanan yang terkait “Membrane/Membran” dari tabel services.
                        Relasi di projects akan otomatis menjadi null.
                    </p>
                    <button
                        type="submit"
                        className="btn btn-outline-danger btn-sm"
                    >
                        Bersihkan Layanan “Membrane”
                    </button>
                </form>
            </div>
        </div>
    )
}
