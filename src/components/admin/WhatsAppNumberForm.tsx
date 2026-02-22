'use client'

import { useState } from 'react'
import { updateWaNumber } from '@/app/actions/settings'
import { Save, Loader2 } from 'lucide-react'

export default function WhatsAppNumberForm({ current }: { current: string | null }) {
  const [value, setValue] = useState<string>(current || '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const validate = (v: string) => {
    const digits = v.replace(/\D+/g, '')
    let normalized = digits
    if (digits.startsWith('0')) normalized = `62${digits.slice(1)}`
    if (digits.startsWith('8')) normalized = `62${digits}`
    if (!/^62\d{8,15}$/.test(normalized)) return { ok: false, normalized }
    return { ok: true, normalized }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    const { ok, normalized } = validate(value)
    if (!ok) {
      setMessage({ type: 'error', text: 'Format nomor tidak valid. Gunakan 62xxxxxxxxxx' })
      setIsLoading(false)
      return
    }
    const res = await updateWaNumber(normalized)
    if ('error' in res && res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setValue(res.value || normalized)
      setMessage({ type: 'success', text: 'Nomor WhatsApp berhasil disimpan' })
    }
    setIsLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-xl">
      <h3 className="text-lg font-bold mb-2">Nomor WhatsApp</h3>
      <p className="text-sm text-gray-500 mb-4">Nomor ini digunakan untuk tombol WhatsApp di kalkulator dan kontak. Format: 62xxxxxxxxxx</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nomor WA</label>
          <input
            type="tel"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="62xxxxxxxxxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
          />
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan
        </button>
      </form>
    </div>
  )
}

