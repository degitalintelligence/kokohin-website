'use client'

import React from 'react'

type Props = {
  name: string
  whatsapp: string
  onNameChange: (v: string) => void
  onWhatsappChange: (v: string) => void
  onSubmit: () => void
  error: string | null
  submitDisabled?: boolean
  areaM2?: number | null
}

function LeadFormComponent({
  name,
  whatsapp,
  onNameChange,
  onWhatsappChange,
  onSubmit,
  error,
  submitDisabled,
  areaM2,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-white/10 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg font-bold text-white">Estimasi Berhasil!</span>
        </div>
        <p className="text-white/90 mb-2">
          Untuk proyek sekitar <span className="font-bold">{areaM2 ? `${areaM2.toLocaleString('id-ID')} m²` : '— m²'}</span>.
        </p>
        <p className="text-white/90 mb-4">
          Masukkan nama & nomor WhatsApp agar sistem membuka rincian lengkap, menyimpan riwayat penawaran Anda, dan privasi Anda tetap 100% aman.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">Nama Lengkap *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Nama lengkap Anda"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-2">Nomor WhatsApp *</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="08xxx (format Indonesia)"
            />
            <p className="text-white/60 text-xs mt-2">Contoh: 081234567890</p>
          </div>
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={submitDisabled}
        className="w-full btn bg-primary text-white hover:bg-primary/90 font-bold py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Buka Detail Estimasi
      </button>
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

const LeadForm = React.memo(LeadFormComponent)
export default LeadForm
