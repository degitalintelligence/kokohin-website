import { getLogoUrl } from '@/app/actions/settings'
import LogoLoader from '@/components/loading/LogoLoader'

export default async function Loading() {
  let logo: string | null = await getLogoUrl()
  try {
    if (logo) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const u = new URL(logo, base)
      if (u.pathname.startsWith('/_next/image') && u.searchParams.has('url')) {
        const inner = u.searchParams.get('url') || ''
        if (inner) logo = decodeURIComponent(inner)
      }
    }
  } catch {
    // keep original if parsing fails
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {logo ? (
          <LogoLoader src={logo} />
        ) : (
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
