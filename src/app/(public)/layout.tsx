import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Gunakan image proxy agar logo dari storage self-hosted bisa dilayani same-origin
    const logoUrl: string | null = '/api/site-settings/logo-image'
    let backgroundUrl: string | null = null
    try {
        const res = await fetch('/api/site-settings/login-background-url', { cache: 'no-store' })
        if (res.ok) {
            const json = (await res.json()) as { login_background_url?: string | null }
            backgroundUrl = json.login_background_url ?? null
        }
    } catch {
        backgroundUrl = null
    }

    return (
        <>
            <Navbar logoUrl={logoUrl} backgroundUrl={backgroundUrl} />
            <main>{children}</main>
            <Footer />
        </>
    )
}
