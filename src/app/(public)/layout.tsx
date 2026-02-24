import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { MessageCircle } from 'lucide-react'

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const logoUrl: string | null = '/api/site-settings/logo-image'
    let backgroundUrl: string | null = null
    let waNumber: string | null = null
    try {
        const res = await fetch('/api/site-settings/login-background-url', { cache: 'no-store' })
        if (res.ok) {
            const json = (await res.json()) as { login_background_url?: string | null }
            backgroundUrl = json.login_background_url ?? null
        }
    } catch {
        backgroundUrl = null
    }
    try {
        const res = await fetch('/api/site-settings/wa-number', { cache: 'no-store' })
        if (res.ok) {
            const json = (await res.json()) as { wa_number?: string | null }
            waNumber = json.wa_number ?? null
        }
    } catch {
        waNumber = null
    }
    const wa = waNumber && waNumber.trim().length > 0 ? waNumber : '628000000000'
    const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent('Halo Kokohin, saya ingin konsultasi kanopi.')}`

    return (
        <>
            <Navbar logoUrl={logoUrl} backgroundUrl={backgroundUrl} />
            <main>{children}</main>
            <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat via WhatsApp"
                className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full font-bold text-white shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613] bg-[#E30613] hover:bg-[#c0000f]"
            >
                <MessageCircle className="w-5 h-5" />
                <span className="hidden md:inline">WhatsApp</span>
            </a>
            <Footer />
        </>
    )
}
