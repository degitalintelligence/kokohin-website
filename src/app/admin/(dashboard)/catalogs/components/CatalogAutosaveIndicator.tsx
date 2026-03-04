'use client'

import { updateCatalog } from '@/app/actions/catalogs'
import { CheckCircle, Loader2, AlertTriangle, Save } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

type Props = {
  formId: string
}

type Status = 'idle' | 'typing' | 'saving' | 'success' | 'error'

export default function CatalogAutosaveIndicator({ formId }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  const handleSave = useCallback(async () => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    const formData = new FormData(form)
    const title = (formData.get('title') as string)?.trim()
    const basePriceStr = (formData.get('base_price_per_m2') as string)?.trim()

    if (!title || !basePriceStr) {
      return
    }

    setStatus('saving')
    try {
      await updateCatalog(formData)
      setStatus('success')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }, [formId])

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    let debounceTimer: NodeJS.Timeout

    const handleInput = () => {
      setStatus('typing')
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        handleSave()
      }, 1500)
    }

    form.addEventListener('input', handleInput)

    return () => {
      form.removeEventListener('input', handleInput)
      clearTimeout(debounceTimer)
    }
  }, [formId, handleSave])

  const getStatusIndicator = () => {
    switch (status) {
      case 'typing':
        return <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Mengetik...</span>
      case 'saving':
        return <span className="flex items-center gap-1.5"><Save className="h-3 w-3" /> Menyimpan...</span>
      case 'success':
        return <span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="h-3 w-3" /> Tersimpan</span>
      case 'error':
        return <span className="flex items-center gap-1.5 text-red-600"><AlertTriangle className="h-3 w-3" /> Gagal menyimpan</span>
      default:
        return <span>Perubahan akan tersimpan otomatis</span>
    }
  }

  return (
    <div className="mt-1 text-[11px] text-gray-500 text-right">
      {getStatusIndicator()}
    </div>
  )
}
