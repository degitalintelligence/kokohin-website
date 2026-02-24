'use client'

import { useEffect, useState } from 'react'

type Props = {
  catalogId: string
  formId: string
  baseline: Record<string, string>
}

type Stored = {
  savedAt: number
  data: Record<string, string>
}

const STORAGE_PREFIX = 'adminCatalogAutosave:'

const hasDiffWithBaseline = (data: Record<string, string>, baseline: Record<string, string>) => {
  const keys = Object.keys(baseline)
  for (const key of keys) {
    const a = data[key] ?? ''
    const b = baseline[key] ?? ''
    if (a !== b) return true
  }
  return false
}

export default function CatalogAutosaveIndicator({ catalogId, formId, baseline }: Props) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  const [hasDiff, setHasDiff] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = STORAGE_PREFIX + catalogId
    const raw = window.localStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Stored
        if (parsed?.savedAt) {
          window.setTimeout(() => {
            setLastSavedAt(parsed.savedAt)
            setActive(true)
            setHasDiff(hasDiffWithBaseline(parsed.data, baseline))
          }, 0)
        }
      } catch {
        window.setTimeout(() => {
          setLastSavedAt(null)
          setHasDiff(false)
        }, 0)
      }
    }

    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    let timeoutId: number | undefined

    const handleScheduleSave = () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        const fd = new FormData(form)
        const allowed = [
          'title',
          'category',
          'atap_id',
          'rangka_id',
          'base_price_per_m2',
          'base_price_unit',
          'labor_cost',
          'transport_cost',
          'margin_percentage',
          'is_active',
          'addons_json',
          'hpp_components_json',
        ]
        const data: Record<string, string> = {}
        for (const name of allowed) {
          const value = fd.get(name)
          if (typeof value === 'string') {
            data[name] = value
          }
        }
        const payload: Stored = {
          savedAt: Date.now(),
          data,
        }
        window.localStorage.setItem(key, JSON.stringify(payload))
        setLastSavedAt(payload.savedAt)
        setActive(true)
        setHasDiff(hasDiffWithBaseline(payload.data, baseline))
      }, 1000)
    }

    form.addEventListener('input', handleScheduleSave)
    form.addEventListener('change', handleScheduleSave)

    return () => {
      form.removeEventListener('input', handleScheduleSave)
      form.removeEventListener('change', handleScheduleSave)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [catalogId, formId, baseline])

  if (!active || !lastSavedAt) {
    return (
      <p className="mt-1 text-[11px] text-gray-400 text-right">
        Auto-save lokal aktif
      </p>
    )
  }

  const d = new Date(lastSavedAt)
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (hasDiff) {
    return (
      <p className="mt-1 text-[11px] text-[#E30613] text-right">
        Draft lokal berbeda dari data server (auto-save {time})
      </p>
    )
  }

  return (
    <p className="mt-1 text-[11px] text-gray-500 text-right">
      Auto-save lokal: <span className="font-medium">{time}</span>
    </p>
  )
}
