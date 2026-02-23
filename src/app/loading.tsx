import LogoLoader from '@/components/loading/LogoLoader'

export default async function Loading() {
  const logo: string | null = '/api/site-settings/logo-image'

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
