'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, Camera } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/admin/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('adminSidebarOpen')
    return saved === 'true'
  })
  const touchStartX = useRef<number | null>(null)
  const touchActive = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminSidebarOpen', open ? 'true' : 'false')
    }
  }, [open])

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return
    const x = e.touches[0].clientX
    if (x <= 24) {
      touchStartX.current = x
      touchActive.current = true
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchActive.current || touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx > 40) {
      setOpen(true)
      touchActive.current = false
      touchStartX.current = null
    }
  }

  const handleTouchEnd = () => {
    touchActive.current = false
    touchStartX.current = null
  }

  return (
    <div className="relative flex h-screen bg-[#f4f5f7] font-sans overflow-hidden">
      <div
        className={`fixed md:static z-50 md:z-auto h-[100svh] md:h-auto transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ width: 240 }}
      >
        <Sidebar />
      </div>

      <div
        className={`fixed inset-0 bg-black/40 md:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      <div
        className="flex-1 flex flex-col min-w-0 relative pt-14 md:pt-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-3 z-40">
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="inline-flex items-center justify-center w-10 h-10 rounded-md text-[#1D1D1B] hover:bg-gray-100 active:bg-gray-200"
            onClick={() => setOpen(v => !v)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-2 text-sm font-extrabold tracking-tight text-[#1D1D1B]">Kokohin Admin</div>
          <Link href="/admin/gallery" className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E30613] text-white hover:bg-[#c0000f]">
            <Camera className="w-4 h-4" />
            Kurasi Galeri
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
