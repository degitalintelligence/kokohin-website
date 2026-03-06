'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, Clock, Loader2 } from 'lucide-react'
import type { CalculatorResult, LeadInfo } from '@/lib/types'
import { formatRupiah, formatNumber } from '@/lib/calculator'

type Slot = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  booked: number
  available: number
}

type SurveyBookingModalProps = {
  open: boolean
  onClose: () => void
  leadInfo: LeadInfo
  zoneId?: string
  result: CalculatorResult & { isCustom?: boolean }
  catalogTitle?: string | null
  projectId: string | null
}

export default function SurveyBookingModal({
  open,
  onClose,
  leadInfo,
  zoneId,
  result,
  catalogTitle,
}: SurveyBookingModalProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch('/api/public/survey-slots')
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.message || 'Gagal memuat slot survei')
        }
        return res.json() as Promise<{ slots?: Slot[] }>
      })
      .then((data) => {
        setSlots(data.slots ?? [])
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Gagal memuat slot survei'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const groupedByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {})

  const handleSubmit = async () => {
    if (!selectedSlotId) {
      setError('Silakan pilih salah satu jadwal survei.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch('/api/public/book-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlotId,
          leadId: null,
          name: leadInfo.name,
          phone: leadInfo.whatsapp,
          address: null,
          zoneId: zoneId ?? null,
          notes: null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal menyimpan booking survey')
      }
      setSuccessMessage('Booking survei berhasil dikirim. Tim kami akan menghubungi Anda untuk konfirmasi.')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat booking survei'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Booking Jadwal Survei</p>
            <h3 className="text-lg font-extrabold text-gray-900">
              {catalogTitle || 'Survei Lokasi Kanopi'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Ringkasan singkat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Ringkasan</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{leadInfo.name || 'Calon Customer'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Volume: {formatNumber(result.luas)}{' '}
                {result.unitUsed === 'm1' ? 'm¹' : result.unitUsed === 'unit' ? 'unit' : 'm²'}
              </p>
              <p className="text-xs text-gray-500">
                Estimasi: {formatRupiah(result.estimatedPrice)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Catatan</p>
              <p className="text-xs text-gray-600 mt-1">
                Pilih hari dan jam survei yang paling nyaman. Tim kami akan mengkonfirmasi jadwal melalui WhatsApp.
              </p>
            </div>
          </div>

          {/* Status loading / error */}
          {loading && (
            <div className="flex items-center justify-center py-6 text-sm text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat slot survei...
            </div>
          )}
          {!loading && slots.length === 0 && !error && (
            <div className="py-6 text-sm text-gray-500 text-center">
              Belum ada slot survei yang tersedia. Silakan coba lagi nanti.
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
              {successMessage}
            </div>
          )}

          {/* Daftar slot */}
          {!loading && slots.length > 0 && (
            <div className="space-y-3">
              {Object.entries(groupedByDate).map(([date, daySlots]) => (
                <div key={date} className="border border-gray-100 rounded-xl">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Calendar className="w-3 h-3" />
                    {date}
                  </div>
                  <div className="p-2 flex flex-wrap gap-2">
                    {daySlots.map((slot) => {
                      const disabled = slot.available <= 0
                      const selected = selectedSlotId === slot.id
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={disabled || submitting}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={[
                            'px-3 py-2 rounded-lg border text-xs flex items-center gap-1 transition-colors',
                            disabled
                              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                              : selected
                                ? 'border-[#E30613] bg-[#E30613]/10 text-[#E30613] font-semibold'
                                : 'border-gray-200 text-gray-700 hover:border-[#E30613]/50 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">
                            ({slot.available}/{slot.capacity})
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || slots.length === 0}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#E30613] text-white text-sm font-bold hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan Booking...
              </>
            ) : (
              'Konfirmasi Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

