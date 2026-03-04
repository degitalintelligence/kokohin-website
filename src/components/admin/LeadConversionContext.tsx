'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type LeadConversionContextValue = {
  convertedIds: string[]
  markConverted: (id: string) => void
}

const LeadConversionContext = createContext<LeadConversionContextValue | undefined>(undefined)

export function LeadConversionProvider({ children }: { children: ReactNode }) {
  const [convertedIds, setConvertedIds] = useState<string[]>([])

  const markConverted = (id: string) => {
    setConvertedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  return (
    <LeadConversionContext.Provider value={{ convertedIds, markConverted }}>
      {children}
    </LeadConversionContext.Provider>
  )
}

export function useLeadConversion() {
  const ctx = useContext(LeadConversionContext)
  if (!ctx) {
    throw new Error('useLeadConversion must be used within LeadConversionProvider')
  }
  return ctx
}
