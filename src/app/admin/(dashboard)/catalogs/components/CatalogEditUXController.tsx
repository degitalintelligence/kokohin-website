'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'

type Props = {
  formId: string
  errorMessage?: string | null
  importResult?: string | null
}

export default function CatalogEditUXController({ formId, errorMessage, importResult }: Props) {
  const { toast } = useToast()

  useEffect(() => {
    if (errorMessage) {
      try {
        toast({
          variant: 'destructive',
          title: 'Gagal Menyimpan Katalog',
          description: decodeURIComponent(errorMessage),
        })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Gagal Menyimpan Katalog',
          description: errorMessage,
        })
      }
    }
    if (importResult) {
      toast({
        title: 'Impor Berhasil',
        description: decodeURIComponent(importResult),
      })
    }
  }, [errorMessage, importResult, toast])

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

