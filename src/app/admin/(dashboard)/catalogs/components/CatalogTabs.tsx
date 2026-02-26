'use client'

import React, { useState } from 'react'
import { Info, DollarSign, Wrench, UploadCloud, Eye, Calculator } from 'lucide-react'

const TABS = [
  { id: 'info', label: 'Informasi', icon: Info },
  { id: 'hpp', label: 'Formulasi HPP', icon: Calculator },
  { id: 'biaya', label: 'Harga Jual', icon: DollarSign },
  { id: 'addons', label: 'Addons Opsional', icon: Wrench },
  { id: 'import', label: 'Import', icon: UploadCloud },
  { id: 'preview', label: 'Preview', icon: Eye },
]

type CatalogTabChild = React.ReactElement<{ id: string }>

export default function CatalogTabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('info')

  const childrenArray = React.Children.toArray(children).filter(
    (child): child is CatalogTabChild => React.isValidElement(child)
  )

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-[#E30613] text-[#E30613] bg-[#E30613]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              } whitespace-nowrap py-3 px-4 border-b-2 font-bold text-sm flex items-center gap-2 transition-all duration-200 rounded-t-lg`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#E30613]' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-6 animate-in fade-in duration-300 slide-in-from-bottom-2">
        {childrenArray.map((child) => (
          <div key={child.props.id} id={child.props.id} style={{ display: activeTab === child.props.id ? 'block' : 'none' }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
