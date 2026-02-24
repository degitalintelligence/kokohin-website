'use client'

import { useFormStatus } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  importMaterials: (formData: FormData) => Promise<unknown>
}

export default function ImportCsvForm({ importMaterials }: ImportCsvFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()

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
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('File must be a CSV (.csv)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      await importMaterials(formData)
      setOpen(false)
      setFileName(null)
      router.replace('/admin/materials?import=1')
    } catch (err) {
      console.error('Import error:', err)
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="relative w-full max-w-lg bg-white border border-gray-200 rounded-lg shadow-lg p-4"
            role="dialog"
            aria-modal="true"
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
                <p>Format CSV: id (opsional), code, name, category, unit, base_price_per_unit, length_per_unit, is_active</p>
                <p>Gunakan <strong>Export CSV</strong> untuk mendapatkan template dengan ID (untuk update).</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setOpen(false)}>
                  Batal
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
