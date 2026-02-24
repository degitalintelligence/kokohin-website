'use client'

import { useState } from 'react'
import { ButtonLoadingSpinner } from '@/components/ui/loading-spinner'

export default function CatalogSaveButton({ formId, label = 'Simpan Perubahan' }: { formId: string; label?: string }) {
  const [saving, setSaving] = useState(false)

  const handleClick = () => {
    if (saving) return
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (form) {
      setSaving(true)
      form.requestSubmit()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="px-4 py-2 bg-[#1D1D1B] text-white rounded-md hover:bg-black transition-colors duration-300 ml-auto flex items-center justify-center min-h-[44px] min-w-[120px] disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {saving ? <ButtonLoadingSpinner /> : label}
    </button>
  )
}
