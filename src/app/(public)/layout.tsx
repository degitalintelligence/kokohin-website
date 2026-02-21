import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getLogoUrl, getLoginBackgroundUrl } from '@/app/actions/settings'

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const logoUrl = await getLogoUrl()
    const backgroundUrl = await getLoginBackgroundUrl()

    return (
        <>
            <Navbar logoUrl={logoUrl} backgroundUrl={backgroundUrl} />
            <main>{children}</main>
            <Footer />
        </>
    )
}
