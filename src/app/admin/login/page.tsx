import { Suspense } from 'react'
import { getLoginBackgroundUrl, getLogoUrl } from '@/app/actions/settings'
import LoginForm from '@/components/admin/LoginForm'

export const metadata = {
    title: 'Login Admin - Kokohin',
    description: 'Masuk ke dashboard admin Kokohin',
}

export default async function LoginPage() {
    const backgroundUrl = await getLoginBackgroundUrl()
    const logoUrl = await getLogoUrl()

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
            <LoginForm backgroundUrl={backgroundUrl} logoUrl={logoUrl} />
        </Suspense>
    )
}
