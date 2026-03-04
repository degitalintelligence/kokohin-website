import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { MessageCircle } from 'lucide-react'
import { getLoginBackgroundUrl, getWaNumber } from '@/app/actions/settings'

function unwrapProxy(url: string | null): string | null {
    if (!url) return null
    try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const u = new URL(url, base)
        if (u.pathname.startsWith('/_next/image') && u.searchParams.has('url')) {
            const inner = u.searchParams.get('url') || ''
            if (inner) return decodeURIComponent(inner)
        }
        return url
    } catch {
        return url
    }
}

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const logoUrl: string | null = '/api/site-settings/logo-image'
    let backgroundUrl: string | null = null
    let waNumber: string | null = null
    try {
        const rawBg = await getLoginBackgroundUrl()
        backgroundUrl = unwrapProxy(rawBg)
    } catch {
        backgroundUrl = null
    }
    try {
        waNumber = await getWaNumber()
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
