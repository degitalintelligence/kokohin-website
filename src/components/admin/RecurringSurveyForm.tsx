'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Repeat2, Loader2 } from 'lucide-react'
import { generateRecurringDates, type RecurringPattern } from '@/lib/surveyRecurring'

export default function RecurringSurveyForm() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [weeksAhead, setWeeksAhead] = useState(4)
  const [pattern, setPattern] = useState<RecurringPattern>('weekdays')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [capacity, setCapacity] = useState(1)
  const [isActive, setIsActive] = useState(true)

  const [previewDates, setPreviewDates] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handlePreview = () => {
    setError(null)
    setSuccess(null)
    if (!startDate) {
      setError('Tanggal mulai wajib diisi')
      return
    }
    setIsPreviewing(true)
    const dates = generateRecurringDates(startDate, weeksAhead, pattern, selectedDays)
    setPreviewDates(dates)
    setIsPreviewing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!startDate || !startTime || !endTime) {
      setError('Tanggal dan jam wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/recurring-survey-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          weeksAhead,
          pattern,
          daysOfWeek: pattern === 'custom' ? selectedDays : [],
          startTime,
          endTime,
          capacity,
          isActive,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal membuat slot berulang')
      }
      const summary = json.summary as { created_count?: number; skipped_conflicts?: number }
      setSuccess(
        `Berhasil membuat ${summary.created_count ?? 0} slot. ` +
          `Dilewati karena konflik: ${summary.skipped_conflicts ?? 0}.`
      )
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat slot.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const dayLabels: { value: number; label: string }[] = [
    { value: 1, label: 'Sen' },
    { value: 2, label: 'Sel' },
    { value: 3, label: 'Rab' },
    { value: 4, label: 'Kam' },
    { value: 5, label: 'Jum' },
    { value: 6, label: 'Sab' },
    { value: 7, label: 'Min' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#E30613]">
          <Repeat2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#1D1D1B] tracking-tight uppercase">Buat Slot Berulang</h3>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Otomasi pembuatan jadwal</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Tanggal Mulai
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Jangka Waktu
            </label>
            <select
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value={4}>4 minggu</option>
              <option value={8}>8 minggu</option>
              <option value={12}>12 minggu</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Pola Pengulangan
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPattern('daily')}
              className={`px-3 py-1.5 rounded-full border ${
                pattern === 'daily'
                  ? 'bg-[#E30613] text-white border-[#E30613]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Setiap Hari
            </button>
            <button
              type="button"
              onClick={() => setPattern('weekdays')}
              className={`px-3 py-1.5 rounded-full border ${
                pattern === 'weekdays'
                  ? 'bg-[#E30613] text-white border-[#E30613]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Hari Kerja
            </button>
            <button
              type="button"
              onClick={() => setPattern('custom')}
              className={`px-3 py-1.5 rounded-full border ${
                pattern === 'custom'
                  ? 'bg-[#E30613] text-white border-[#E30613]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Pilih Hari
            </button>
          </div>
          {pattern === 'custom' && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {dayLabels.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-2 py-1 rounded border ${
                    selectedDays.includes(d.value)
                      ? 'bg-[#E30613] text-white border-[#E30613]'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Jam Mulai
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Jam Selesai
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Kapasitas per Slot
            </label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="inline-flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktif
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pt-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!startDate || isPreviewing}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isPreviewing && <Loader2 className="w-4 h-4 animate-spin" />}
            Preview Jadwal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#E30613] text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Memproses...' : 'Buat Jadwal Massal'}
          </button>
        </div>
      </form>

      {previewDates.length > 0 && (
        <div className="mt-3 border rounded-lg p-3 bg-gray-50 max-h-48 overflow-auto text-xs">
          <p className="font-semibold text-gray-700 mb-1">
            Slot yang akan dibuat ({previewDates.length} tanggal):
          </p>
          <ul className="space-y-1">
            {previewDates.map((d) => (
              <li key={d} className="flex justify-between">
                <span>{d}</span>
                <span className="text-gray-500">
                  {startTime}–{endTime}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
