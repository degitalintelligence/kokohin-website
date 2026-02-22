'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)
  const startTimer = useRef<number | null>(null)
  const finishTimer = useRef<number | null>(null)
  const lastPathRef = useRef<string>(`${pathname}?${searchParams?.toString() ?? ''}`)

  function start() {
    if (finishTimer.current) {
      window.clearTimeout(finishTimer.current)
      finishTimer.current = null
    }
    setActive(true)
    if (startTimer.current) return
    startTimer.current = window.setTimeout(() => {
      setVisible(true)
    }, 120)
  }

  function finish() {
    if (startTimer.current) {
      window.clearTimeout(startTimer.current)
      startTimer.current = null
    }
    setActive(false)
    finishTimer.current = window.setTimeout(() => {
      setVisible(false)
    }, 200)
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const link = target.closest('a') as HTMLAnchorElement | null
      if (!link) return
      if (link.target === '_blank') return
      if (link.hasAttribute('download')) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        if (url.pathname + url.search === window.location.pathname + window.location.search) return
        start()
      } catch {
      }
    }
    const onPopState = () => start()
    window.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useEffect(() => {
    const current = `${pathname}?${searchParams?.toString() ?? ''}`
    if (lastPathRef.current && current !== lastPathRef.current) {
      window.setTimeout(() => finish(), 0)
    }
    lastPathRef.current = current
  }, [pathname, searchParams])

  return (
    <div
      aria-hidden
      className={`fixed top-0 left-0 right-0 h-[2px] z-[9999] ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
      style={{ pointerEvents: 'none' }}
    >
      <div className="relative w-full h-full bg-primary/20 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 h-full w-2/5 bg-primary`}
          style={{
            transform: 'translateX(-100%)',
            animation: active ? 'kokohin-progress 1s ease-in-out infinite' : 'none',
          }}
        />
      </div>
    </div>
  )
}
