'use client'

import { useFormStatus } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="btn btn-outline-dark btn-sm flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
          Importing...
        </>
      ) : 'Import CSV'}
    </button>
  )
}

interface ImportCsvFormProps {
  importCatalogs: (formData: FormData) => Promise<void>
  importPreset?: () => Promise<void>
  importPresetSecondary?: () => Promise<void>
}

export default function ImportCsvForm({ importCatalogs, importPreset, importPresetSecondary }: ImportCsvFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!open) return
      if (panelRef.current && panelRef.current.contains(t)) return
      if (btnRef.current && btnRef.current.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('click', onClickOutside)
    return () => window.removeEventListener('click', onClickOutside)
  }, [open])

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    const file = formData.get('file') as File | null
    if (!file) {
      setError('Please select a CSV file')
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('File must be a CSV (.csv)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }
    try {
      await importCatalogs(formData)
      setOpen(false)
      setFileName(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className="btn btn-outline-dark btn-sm"
        onClick={() => setOpen((v) => !v)}
      >
        Import CSV
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
        >
          <form action={handleSubmit} className="space-y-3">
            <div>
              <input
                type="file"
                name="file"
                accept=".csv"
                className="text-sm"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
              />
              {fileName && (
                <div className="text-xs text-gray-600 mt-1">
                  Selected: {fileName}
                </div>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠️ {error}
              </div>
            )}
            <div className="text-xs text-gray-500">
              <p>Format CSV: title, image_url, atap_id, rangka_id, base_price_per_m2, is_active</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setOpen(false)}>
                Batal
              </button>
              <SubmitButton />
            </div>
          </form>

          {importPreset && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <form action={importPreset}>
                <button type="submit" className="btn btn-outline-dark btn-sm w-full">
                  Gunakan Dataset Kokohin
                </button>
              </form>
            </div>
          )}
          {importPresetSecondary && (
            <div className="mt-3">
              <form action={importPresetSecondary}>
                <button type="submit" className="btn btn-outline-dark btn-sm w-full">
                  Dataset Katalog Railing/Pagar
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
