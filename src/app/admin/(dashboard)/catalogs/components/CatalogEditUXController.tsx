'use client'

import { useEffect } from 'react'
import { toast } from '@/components/ui/toaster'

type Props = {
  formId: string
  errorMessage?: string | null
  importResult?: string | null
}

export default function CatalogEditUXController({ formId, errorMessage, importResult }: Props) {
  useEffect(() => {
    if (errorMessage) {
      try {
        toast.error('Gagal menyimpan katalog', decodeURIComponent(errorMessage))
      } catch {
        toast.error('Gagal menyimpan katalog', errorMessage)
      }
    }
    if (importResult) {
      try {
        toast.success('Import addons selesai', decodeURIComponent(importResult))
      } catch {
        toast.success('Import addons selesai', importResult)
      }
    }
  }, [errorMessage, importResult])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrlS = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (isCtrlS) {
        e.preventDefault()
        const form = document.getElementById(formId) as HTMLFormElement | null
        form?.requestSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [formId])

  return null
}

