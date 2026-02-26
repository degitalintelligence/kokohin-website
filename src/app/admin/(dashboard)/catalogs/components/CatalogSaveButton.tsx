'use client'

import { useState, useEffect } from 'react'
import { ButtonLoadingSpinner } from '@/components/ui/loading-spinner'
import { useFormStatus } from 'react-dom'

export default function CatalogSaveButton({ formId, label = 'Simpan Perubahan' }: { formId: string; label?: string }) {
  // Use a simple timeout to prevent infinite loading state if submission fails silently
  const [localSaving, setLocalSaving] = useState(false)

  // Reset loading state after 10 seconds (failsafe)
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (localSaving) {
      timer = setTimeout(() => {
        setLocalSaving(false)
      }, 10000)
    }
    return () => clearTimeout(timer)
  }, [localSaving])

  const handleClick = () => {
    if (localSaving) return
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (form) {
      if (form.checkValidity()) {
        setLocalSaving(true)
        form.requestSubmit()
      } else {
        form.reportValidity()
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={localSaving}
      className="px-4 py-2 bg-[#1D1D1B] text-white rounded-md hover:bg-black transition-colors duration-300 ml-auto flex items-center justify-center min-h-[44px] min-w-[120px] disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {localSaving ? <ButtonLoadingSpinner /> : label}
    </button>
  )
}
