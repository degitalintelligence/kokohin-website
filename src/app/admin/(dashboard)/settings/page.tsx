import type { Metadata } from 'next'
import { getLogoUrl, getLoginBackgroundUrl } from '@/app/actions/settings'
import LogoUploadForm from '@/components/admin/LogoUploadForm'
import BackgroundUploadForm from '@/components/admin/BackgroundUploadForm'
import { removeMembraneService } from '@/app/actions/services'

export const metadata: Metadata = {
    title: 'Pengaturan Website',
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
    const { done } = await searchParams
    const logoUrl = await getLogoUrl()
    const loginBackgroundUrl = await getLoginBackgroundUrl()

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Pengaturan Website</h1>
            {done === 'membrane_removed' && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                    Layanan “Kanopi Membrane” telah dinonaktifkan/dihapus dari database.
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Logo & Branding</h2>
                <div className="divider mb-6" />
                
                <div className="max-w-xl space-y-8">
                    <LogoUploadForm currentLogoUrl={logoUrl} />
                    <BackgroundUploadForm currentBackgroundUrl={loginBackgroundUrl} />
                </div>
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
