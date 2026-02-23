'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { HardHat, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/layanan', label: 'Layanan' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/tentang', label: 'Tentang' },
  { href: '/kontak', label: 'Kontak' },
]

export default function Navbar({ logoUrl, backgroundUrl }: { logoUrl?: string | null, backgroundUrl?: string | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Skip token handling if we're already on the auth callback page
    if (window.location.pathname === '/auth/callback') return
    
    const supabase = createClient()
    const url = new URL(window.location.href)

    const handleHashTokens = async () => {
      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) return false
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token') || undefined
      const refresh_token = params.get('refresh_token') || undefined
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
        window.history.replaceState({}, document.title, url.pathname + url.search)
        router.replace('/admin')
        return true
      }
      return false
    }

    const handleCode = async () => {
      const hasCode = !!url.searchParams.get('code')
      if (!hasCode) return false
      try {
        await supabase.auth.exchangeCodeForSession(url.href)
        router.replace('/admin')
        return true
      } catch {
        return false
      }
    }

    handleHashTokens().then((processed) => {
      if (!processed) void handleCode()
    })
  }, [router])

  useEffect(() => {
    if (!isNavigating) return
    const clear = setTimeout(() => setIsNavigating(false), 1200)
    return () => clearTimeout(clear)
  }, [isNavigating])

  // Navigation completion handled by timeout; pathname change auto re-renders

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100 font-sans relative overflow-hidden">
      {backgroundUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <Image
                src={backgroundUrl}
                alt="Header Background"
                fill
                className="object-cover"
                style={{ opacity: 0.15 }}
                priority
            />
            {/* Overlay background - no dots */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px]" />
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 relative">
              {logoUrl && !logoFailed ? (
                <div className="relative h-10 w-40">
                  <Image 
                    src={logoUrl} 
                    alt="Kokohin Logo" 
                    fill 
                    className="object-contain object-left"
                    priority
                    unoptimized
                    onError={() => setLogoFailed(true)}
                  />
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-primary">
                    <HardHat className="text-white" size={24} />
                  </div>
                  <span className="font-bold text-2xl tracking-tight text-primary-dark">Kokohin</span>
                </>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center font-semibold text-sm tracking-wide">
            {navLinks.map(link => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    isActive ? 'text-primary' : 'hover:text-primary text-gray-600'
                  }`}
                  onClick={() => setIsNavigating(true)}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/kalkulator"
              className="text-white px-5 py-2.5 rounded-md shadow-sm bg-primary hover:bg-primary/90 transition-colors"
              onClick={() => setIsNavigating(true)}
            >
              Simulasi Harga
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="flex flex-col space-y-4 px-4">
              {navLinks.map(link => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`font-semibold py-2 transition-colors ${
                      isActive ? 'text-primary' : 'hover:text-primary text-gray-600'
                    }`}
                    onClick={() => { setIsMenuOpen(false); setIsNavigating(true) }}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <Link
                href="/kalkulator"
                className="text-white px-5 py-2.5 rounded-md shadow-sm text-center font-semibold bg-primary hover:bg-primary/90 transition-colors"
                onClick={() => { setIsMenuOpen(false); setIsNavigating(true) }}
              >
                Simulasi Harga
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
