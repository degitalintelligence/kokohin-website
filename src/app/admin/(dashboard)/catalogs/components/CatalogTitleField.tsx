'use client'

import { useState } from 'react'
import FieldStatus from '@/components/ui/FieldStatus'

export default function CatalogTitleField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      setError('Nama paket wajib diisi')
    } else if (trimmed.length < 5) {
      setError('Minimal 5 karakter')
    } else {
      setError(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!touched) setTouched(true)
    setValue(e.target.value)
  }

  const handleBlur = () => {
    if (!touched) setTouched(true)
    validate(value)
  }

  const valid = touched && !error

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium mb-2">Nama Paket *</label>
      <input
        type="text"
        name="title"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-0 ${
          error ? 'border-red-500' : 'border-gray-200 focus:border-[#E30613]'
        }`}
        placeholder="Contoh: Paket Minimalis Atap Alderon"
        required
      />
      <FieldStatus
        valid={valid}
        message={error ?? (valid ? 'Siap disimpan' : undefined)}
      />
    </div>
  )
}
