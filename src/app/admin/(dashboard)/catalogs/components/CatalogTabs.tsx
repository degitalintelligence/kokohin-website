'use client'

import React, { useEffect, useState } from 'react'
import { Info, DollarSign, Wrench, Puzzle } from 'lucide-react'

const tabs = [
  { id: 'info', label: 'Informasi Dasar', icon: Info },
  { id: 'hpp', label: 'Formulasi HPP', icon: Wrench },
  { id: 'biaya', label: 'Harga Jual', icon: DollarSign },
  { id: 'addons', label: 'Komponen Addons', icon: Puzzle },
]

type TabId = 'info' | 'hpp' | 'biaya' | 'addons'

export default function CatalogTabs({
  children,
  saveBar,
}: {
  children: React.ReactNode
  saveBar?: React.ReactNode
}) {
  // Keep initial render deterministic so SSR and client hydration match.
  const [activeTab, setActiveTab] = useState<TabId>('info')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.sessionStorage.getItem('catalog-tabs-active') as TabId | null
    if (saved && tabs.some((t) => t.id === saved)) {
      setActiveTab(saved)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('catalog-tabs-active', activeTab)
  }, [activeTab])

  const childArray = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child),
  ) as React.ReactElement[]

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-controls={`panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabId)
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#E30613] text-[#E30613]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {saveBar && (
        <div className="mt-3 flex justify-end">
          {saveBar}
        </div>
      )}
      <div className="mt-6">
        {childArray.map((child) => {
          const childId = (child.props as { id?: string }).id
          return (
            <div
              key={childId || 'default'}
              id={`panel-${childId}`}
              role="tabpanel"
              aria-labelledby={`tab-${childId}`}
              className={activeTab === childId ? 'block' : 'hidden'}
            >
              {child}
            </div>
          )
        })}
      </div>
    </div>
  )
}
