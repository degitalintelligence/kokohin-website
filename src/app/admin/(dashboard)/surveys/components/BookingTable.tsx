'use client'

import { Phone, MapPin, Calendar, Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle, ClipboardList, LucideIcon, ExternalLink } from 'lucide-react'
import FormSubmitButton from '@/components/admin/FormSubmitButton'
import { updateSurveyBookingStatus, rescheduleSurveyBooking } from '@/app/actions/surveys'
import { useState } from 'react'
import Link from 'next/link'

type BookingRow = {
  id: string
  lead_id: string | null
  name: string
  phone: string
  address: string | null
  status: string
  slot: { date: string; start_time: string; end_time: string } | null
}

type SlotRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
  blackout: boolean
}

interface BookingTableProps {
  bookings: BookingRow[]
  availableSlots: SlotRow[]
}

const statusConfig: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  pending: { label: 'Pending', icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
  confirmed: { label: 'Terkonfirmasi', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  cancelled: { label: 'Dibatalkan', icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
  reschedule_requested: { label: 'Minta Reschedule', icon: RefreshCw, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
}

export default function BookingTable({ bookings, availableSlots }: BookingTableProps) {
  const [activeRescheduleId, setActiveRescheduleId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#1D1D1B] tracking-tight">Antrean Booking Survei</h3>
            <p className="text-xs text-gray-400 font-medium">Kelola permintaan survei dari customer</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-full">
              {bookings.length} Total
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Informasi Customer</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Jadwal Terpilih</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi & Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-gray-400">Belum ada booking survei.</p>
                    </div>
                  </td>
                </tr>
              )}
              {bookings.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending
                return (
                  <tr key={b.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#1D1D1B] group-hover:text-[#E30613] transition-colors">
                            {b.name}
                          </span>
                          {b.lead_id && (
                            <Link
                              href={`/admin/leads?lead=${b.lead_id}&view=detail`}
                              className="p-1 rounded bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Buka Detail Lead & Estimasi"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                            <Phone className="w-3 h-3" /> {b.phone}
                          </div>
                          {b.address && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 max-w-[200px] truncate">
                              <MapPin className="w-3 h-3" /> {b.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {b.slot ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-black text-[#1D1D1B]">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {new Date(b.slot.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 ml-5">
                            <Clock className="w-3.5 h-3.5" />
                            {b.slot.start_time.slice(0, 5)} - {b.slot.end_time.slice(0, 5)} WIB
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded italic">Slot Hilang!</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                        <cfg.icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <form action={updateSurveyBookingStatus} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={b.id} />
                            <select
                              name="status"
                              defaultValue={b.status}
                              className="text-[10px] font-black uppercase tracking-widest border-2 border-gray-100 rounded-xl px-3 py-2 focus:border-[#E30613] focus:ring-0 transition-all outline-none"
                            >
                              <option value="pending">PENDING</option>
                              <option value="confirmed">CONFIRMED</option>
                              <option value="cancelled">CANCELLED</option>
                              <option value="reschedule_requested">RE-SCHEDULE</option>
                            </select>
                            <FormSubmitButton
                            label="UPDATE"
                            loadingLabel="..."
                            className="text-[10px] font-black uppercase tracking-widest bg-[#1D1D1B] text-white px-4 py-2 rounded-xl hover:bg-black transition-all"
                          />
                        </form>
                        
                        {(b.status === 'pending' || b.status === 'reschedule_requested') ? (
                          <button
                            onClick={() => setActiveRescheduleId(activeRescheduleId === b.id ? null : b.id)}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all
                              ${activeRescheduleId === b.id 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'}
                            `}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {b.status === 'pending' ? 'JADWALKAN' : 'ATUR ULANG'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveRescheduleId(activeRescheduleId === b.id ? null : b.id)}
                            className={`
                              p-2 rounded-xl border-2 transition-all
                              ${activeRescheduleId === b.id 
                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'}
                            `}
                            title="Ubah Jadwal"
                          >
                            <RefreshCw className={`w-4 h-4 ${activeRescheduleId === b.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>

                        {activeRescheduleId === b.id && (
                          <div className="mt-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-200">
                            <form action={rescheduleSurveyBooking} className="flex flex-col gap-3">
                              <input type="hidden" name="id" value={b.id} />
                              <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest text-left">Pilih Jadwal Baru</label>
                              <div className="flex items-center gap-2">
                                <select
                                  name="slot_id"
                                  className="text-[10px] font-black uppercase tracking-widest border-2 border-blue-200 rounded-xl px-3 py-2 focus:border-blue-500 focus:ring-0 transition-all outline-none bg-white w-48"
                                  defaultValue=""
                                  required
                                >
                                  <option value="">-- PILIH SLOT --</option>
                                  {availableSlots
                                    .filter(s => s.is_active && !s.blackout)
                                    .map(s => (
                                      <option key={s.id} value={s.id}>
                                        {s.date} • {s.start_time.slice(0, 5)}
                                      </option>
                                    ))}
                                </select>
                                <FormSubmitButton
                                  label="PINDAH JADWAL"
                                  loadingLabel="MEMPROSES..."
                                  className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all whitespace-nowrap"
                                />
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
