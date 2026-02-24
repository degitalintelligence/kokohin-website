'use client'

import { useEffect, useMemo, useState } from 'react'

type Section = { id: string; label: string }

export default function CatalogDetailAnchorNav() {
  const sections: Section[] = useMemo(
    () => [
      { id: 'info', label: 'Info' },
      { id: 'biaya', label: 'Biaya' },
      { id: 'addons', label: 'Addons' },
      { id: 'preview', label: 'Preview' },
      { id: 'import', label: 'Import' },
    ],
    []
  )
  const [active, setActive] = useState<string>('info')
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const ids = sections.map((s) => s.id)
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { root: null, threshold: [0.25, 0.5, 0.75] }
    )
    els.forEach((el) => io.observe(el))
    const onScroll = () => {
      setShowTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      els.forEach((el) => io.unobserve(el))
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [sections])

  return (
    <div className="px-6 -mt-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const isActive = active === s.id
          const cls = isActive
            ? "px-3 py-1 border rounded-full text-xs bg-[#E30613] text-white border-[#E30613]"
            : "px-3 py-1 border rounded-full text-xs hover:bg-gray-50"
          return (
            <a key={s.id} href={`#${s.id}`} className={cls}>
              {s.label}
            </a>
          )
        })}
      </div>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 md:right-8 md:bottom-8 inline-flex items-center justify-center rounded-full shadow-lg text-white w-12 h-12"
          style={{ backgroundColor: '#E30613' }}
          aria-label="Ke Atas"
        >
          ↑
        </button>
      )}
    </div>
  )
}
