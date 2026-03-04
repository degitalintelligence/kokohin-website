'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react'
import {
  saveCatalogAddons,
  saveCatalogHpp,
  saveCatalogInfo,
  saveCatalogPricing,
} from '@/app/actions/catalogs'

type Mode = 'info' | 'hpp' | 'pricing' | 'addons'

type Props = {
  formId: string
  mode: Mode
}

export default function CatalogPartialSaveButton({ formId, mode }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const label =
    mode === 'info'
      ? 'Simpan Informasi'
      : mode === 'hpp'
      ? 'Simpan HPP'
      : mode === 'pricing'
      ? 'Simpan Harga'
      : 'Simpan Addons'

  const handleClick = async () => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form || status === 'saving') return

    const formData = new FormData(form)
    setStatus('saving')
    setMessage(null)

    try {
      if (mode === 'info') {
        await saveCatalogInfo(formData)
      } else if (mode === 'hpp') {
        await saveCatalogHpp(formData)
      } else if (mode === 'pricing') {
        await saveCatalogPricing(formData)
      } else if (mode === 'addons') {
        await saveCatalogAddons(formData)
      }
      setStatus('success')
      setMessage('Tersimpan')
      setTimeout(() => {
        setStatus('idle')
        setMessage(null)
      }, 2000)
    } catch (e) {
      console.error(e)
      setStatus('error')
      const msg =
        e instanceof Error ? e.message : 'Gagal menyimpan perubahan. Silakan coba lagi.'
      setMessage(msg)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'saving'}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1D1D1B] text-white text-xs font-semibold shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'saving' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Save className="w-3 h-3" />
        )}
        <span>{label}</span>
      </button>
      {message && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] ${
            status === 'error' ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {status === 'error' ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          <span className="max-w-xs truncate" title={message}>
            {message}
          </span>
        </span>
      )}
    </div>
  )
}

