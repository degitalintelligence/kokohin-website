'use client'

import { useFormStatus } from 'react-dom'
import { useState } from 'react'

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
  importMaterials: (formData: FormData) => Promise<void>
}

export default function ImportCsvForm({ importMaterials }: ImportCsvFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

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
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form action={handleSubmit} className="flex items-center gap-2">
        <div className="relative">
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
        <SubmitButton />
      </form>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          ⚠️ {error}
        </div>
      )}
      <div className="text-xs text-gray-500">
        <p>Format CSV: id (opsional), code, name, category, unit, base_price_per_unit, length_per_unit, is_active</p>
        <p>Gunakan <strong>Export CSV</strong> untuk mendapatkan template dengan ID (untuk update).</p>
      </div>
    </div>
  )
}