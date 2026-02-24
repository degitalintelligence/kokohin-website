'use client'

import { useFormStatus } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary btn-sm disabled:opacity-50"
    >
      {pending ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
          <span>Importing...</span>
        </>
      ) : (
        'Import CSV'
      )}
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
          className="absolute left-4 right-4 md:left-auto md:right-0 mt-2 w-auto md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
        >
          <form action={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                File CSV
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-[#E30613] hover:text-[#c50511] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#E30613]"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file"
                        type="file"
                        className="sr-only"
                        accept=".csv"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV up to 5MB</p>
                  {fileName && <p className="text-xs text-green-600">Selected: {fileName}</p>}
                </div>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠️ {error}
              </div>
            )}
            <div className="text-xs text-gray-500">
              <p>Format: title, image_url, atap_id, rangka_id, base_price_per_m2, base_price_unit, is_active</p>
              <p>Unit: m2 | m1 | unit (defaults to m2)</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <SubmitButton />
            </div>
          </form>

          {(importPreset || importPresetSecondary) && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <p className="text-xs text-center text-gray-500">Atau gunakan dataset standar:</p>
              {importPreset && (
                <form action={importPreset}>
                  <button
                    type="submit"
                    className="btn btn-outline-dark w-full btn-sm"
                  >
                    Dataset Kokohin
                  </button>
                </form>
              )}
              {importPresetSecondary && (
                <form action={importPresetSecondary}>
                  <button
                    type="submit"
                    className="btn btn-outline-dark w-full btn-sm"
                  >
                    Dataset Railing/Pagar
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
