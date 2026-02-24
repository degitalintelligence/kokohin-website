'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type TabKey = 'info' | 'biaya' | 'addons' | 'import'

export default function CatalogDetailTabsController({ addonsCount = 0 }: { addonsCount?: number }) {
  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: 'info', label: 'Fundamental' },
      { key: 'biaya', label: 'Pricing' },
      { key: 'addons', label: 'Addons' },
      { key: 'import', label: 'Import' },
    ],
    []
  )
  const [active, setActive] = useState<TabKey>('info')

  const parseHash = useCallback((): TabKey | null => {
    if (typeof window === 'undefined') return null
    const h = window.location.hash || ''
    if (h.startsWith('#tab=')) {
      const k = h.replace('#tab=', '') as TabKey
      if (['info', 'biaya', 'addons', 'import'].includes(k)) return k
    }
    return null
  }, [])

  // Initialize active tab after hydration to prevent SSR/CSR mismatch
  useEffect(() => {
    const fromHash = parseHash()
    let next: TabKey | null = fromHash
    if (!next && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('adminCatalogActiveTab') as TabKey | null
      if (saved && ['info', 'biaya', 'addons', 'import'].includes(saved)) {
        next = saved
      }
    }
    if (next && next !== active) {
      setTimeout(() => setActive(next as TabKey), 0)
    }
  }, [parseHash, active])

  useEffect(() => {
    const handler = () => {
      const parsed = parseHash()
      if (parsed) setActive(parsed)
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [parseHash])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminCatalogActiveTab', active)
    }
  }, [active])

  useEffect(() => {
    const ids: TabKey[] = ['info', 'biaya', 'addons', 'import']
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        if (id === active) el.classList.remove('hidden')
        else el.classList.add('hidden')
      }
    })
  }, [active])

  const setHash = (k: TabKey) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.hash = `tab=${k}`
      window.history.replaceState(null, '', url.toString())
      setActive(k)
    }
  }

  return (
    <div className="px-6 -mt-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = active === t.key
          const cls = isActive
            ? 'px-3 py-1.5 rounded-full text-xs bg-[#E30613] text-white'
            : 'px-3 py-1.5 rounded-full text-xs border hover:bg-gray-50'
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setHash(t.key)}
              className={cls}
            >
              {t.label}
              {t.key === 'addons' && addonsCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: '#E30613' }}>
                  {addonsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
