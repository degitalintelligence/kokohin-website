'use client'

import { useState } from 'react'
import { User, Smartphone, Download, Loader2 } from 'lucide-react'
import type { LeadInfo } from '@/lib/types'

interface ContactFormForPdfProps {
  leadInfo: LeadInfo
  setLeadInfo: (info: LeadInfo) => void
  onClose: () => void
  onSaveLeadAndDownloadPdf: (leadInfo: LeadInfo) => Promise<void>
}

export default function ContactFormForPdf({
  leadInfo,
  setLeadInfo,
  onClose,
  onSaveLeadAndDownloadPdf,
}: ContactFormForPdfProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!leadInfo.name.trim() || !leadInfo.whatsapp.trim()) {
      setError('Nama dan nomor WhatsApp wajib diisi.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onSaveLeadAndDownloadPdf(leadInfo)
      onClose()
    } catch (err: unknown) {
      setError((err instanceof Error) ? err.message : 'Gagal menyimpan data dan mengunduh PDF.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-primary-dark">Lengkapi Data untuk Unduh PDF</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="name"
                className="input pl-10 w-full"
                placeholder="Nama Anda"
                value={leadInfo.name}
                onChange={(e) => setLeadInfo({ ...leadInfo, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="whatsapp"
                className="input pl-10 w-full"
                placeholder="Contoh: 081234567890"
                value={leadInfo.whatsapp}
                onChange={(e) => setLeadInfo({ ...leadInfo, whatsapp: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !leadInfo.name.trim() || !leadInfo.whatsapp.trim()}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Menyimpan Data & Mempersiapkan PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Simpan Data & Unduh Penawaran PDF
            </>
          )}
        </button>
      </div>
    </div>
  )
}