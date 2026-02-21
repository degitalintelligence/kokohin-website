import type { Metadata } from 'next'
import { getLogoUrl, getLoginBackgroundUrl } from '@/app/actions/settings'
import LogoUploadForm from '@/components/admin/LogoUploadForm'
import BackgroundUploadForm from '@/components/admin/BackgroundUploadForm'

export const metadata: Metadata = {
    title: 'Pengaturan Website',
}

export default async function SettingsPage() {
    const logoUrl = await getLogoUrl()
    const loginBackgroundUrl = await getLoginBackgroundUrl()

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Pengaturan Website</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo & Branding</h2>
                <div className="divider mb-6" />
                
                <div className="max-w-xl space-y-8">
                    <LogoUploadForm currentLogoUrl={logoUrl} />
                    <BackgroundUploadForm currentBackgroundUrl={loginBackgroundUrl} />
                </div>
            </div>
        </div>
    )
}
