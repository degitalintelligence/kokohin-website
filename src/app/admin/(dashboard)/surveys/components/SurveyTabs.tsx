'use client'

import { useState, ReactNode } from 'react'
import { ClipboardList, CalendarClock, Settings } from 'lucide-react'

const tabs = [
  { id: 'bookings', label: 'Daftar Booking', icon: ClipboardList },
  { id: 'slots', label: 'Jadwal & Slot', icon: CalendarClock },
  { id: 'config', label: 'Pengaturan', icon: Settings },
]

interface SurveyTabsProps {
  bookings: ReactNode
  slots: ReactNode
  config: ReactNode
}

export default function SurveyTabs({ bookings, slots, config }: SurveyTabsProps) {
  const [activeTab, setActiveTab] = useState('bookings')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-8">
        <nav className="flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative py-5 text-sm font-bold flex items-center gap-2.5 transition-all
                  ${isActive 
                    ? 'text-[#E30613]' 
                    : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-[#E30613]' : 'text-gray-300'}`} />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E30613] rounded-t-full shadow-[0_-2px_8px_rgba(227,6,19,0.3)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'bookings' && <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{bookings}</div>}
        {activeTab === 'slots' && <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{slots}</div>}
        {activeTab === 'config' && <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">{config}</div>}
      </div>
    </div>
  )
}
