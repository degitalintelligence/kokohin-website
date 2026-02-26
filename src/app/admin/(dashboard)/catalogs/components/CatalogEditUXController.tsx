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
    // Jika ada error atau hasil import, reset loading state di CatalogSaveButton
    // (Note: ini workaround karena kita tidak punya akses langsung ke state tombol)
    // Sebaiknya CatalogSaveButton menggunakan useFormStatus jika di dalam form
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

