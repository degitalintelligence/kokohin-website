'use client'

import { Clock, AlertTriangle, Trash2, Save, Users } from 'lucide-react'
import FormSubmitButton from '@/components/admin/FormSubmitButton'
import AddSlotModalClient from '@/components/admin/AddSlotModalClient'
import { updateSurveySlot, deleteSurveySlot, createSurveySlot } from '@/app/actions/surveys'
import { useState, useEffect, useCallback } from 'react'

type SlotRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
  blackout: boolean
}

type RealtimeData = {
  id: string
  booked: number
  available: number
}

interface SlotManagementProps {
  slots: SlotRow[]
}

export default function SlotManagement({ slots }: SlotManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [realtime, setRealtime] = useState<Record<string, RealtimeData>>({})

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch('/api/public/survey-slots', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.slots) {
        const mapping: Record<string, RealtimeData> = {}
        json.slots.forEach((s: RealtimeData) => {
          mapping[s.id] = { id: s.id, booked: s.booked, available: s.available }
        })
        setRealtime(mapping)
      }
    } catch (err) {
      console.error('Failed to fetch realtime data:', err)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await fetchRealtime()
    }
    load()
    const timer = setInterval(fetchRealtime, 15000)
    return () => clearInterval(timer)
  }, [fetchRealtime])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-black text-[#1D1D1B] tracking-tight">Kapasitas & Jadwal (Realtime)</h3>
            <p className="text-xs text-gray-400 font-medium flex items-center gap-2">
              Atur ketersediaan tim survei di lapangan 
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                <Clock className="w-3 h-3" /> Auto Sync 15s
              </span>
            </p>
          </div>
          <AddSlotModalClient createSlotAction={createSurveySlot} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal & Jam</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Kapasitas</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Terisi</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sisa</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <p className="text-sm font-bold text-gray-400">Belum ada slot survei dibuat.</p>
                  </td>
                </tr>
              )}
              {slots.map((slot) => {
                const isEditing = editingId === slot.id
                const rt = realtime[slot.id] || { booked: 0, available: slot.capacity }
                return (
                  <tr key={slot.id} className={`group transition-all ${isEditing ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-black text-[#1D1D1B]">
                          {new Date(slot.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} WIB
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      {isEditing ? (
                        <input
                          form={`update-form-${slot.id}`}
                          type="number"
                          name="capacity"
                          defaultValue={slot.capacity}
                          min={1}
                          className="w-16 text-xs font-black border-2 border-blue-200 rounded-lg px-2 py-1.5 focus:border-blue-500 outline-none transition-all"
                        />
                      ) : (
                        <span className="text-xs font-black text-[#1D1D1B] bg-gray-100 px-3 py-1.5 rounded-xl">{slot.capacity}</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-black ${rt.booked > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                          {rt.booked}
                        </span>
                        <Users className={`w-3 h-3 ${rt.booked > 0 ? 'text-amber-400' : 'text-gray-200'}`} />
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`text-xs font-black ${rt.available > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {rt.available}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {slot.blackout ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle className="w-3 h-3" /> BLACKOUT
                          </span>
                        ) : slot.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                            AKTIF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100">
                            NONAKTIF
                          </span>
                        )}

                        {isEditing && (
                          <div className="flex items-center gap-4 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="flex items-center gap-2 cursor-pointer group/cb">
                              <input
                                form={`update-form-${slot.id}`}
                                type="checkbox"
                                name="is_active"
                                defaultChecked={slot.is_active}
                                className="w-4 h-4 rounded border-2 border-blue-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                              />
                              <span className="text-[10px] font-black text-gray-400 group-hover/cb:text-blue-600 transition-colors uppercase tracking-widest">Aktif</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group/cb">
                              <input
                                form={`update-form-${slot.id}`}
                                type="checkbox"
                                name="blackout"
                                defaultChecked={slot.blackout}
                                className="w-4 h-4 rounded border-2 border-red-200 text-red-600 focus:ring-red-500 transition-all cursor-pointer"
                              />
                              <span className="text-[10px] font-black text-gray-400 group-hover/cb:text-red-600 transition-colors uppercase tracking-widest">Blackout</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <form id={`update-form-${slot.id}`} action={updateSurveySlot} className="inline-block">
                              <input type="hidden" name="id" value={slot.id} />
                              <FormSubmitButton
                                label="SIMPAN"
                                loadingLabel="..."
                                className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all"
                              />
                            </form>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-400 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all"
                            >
                              BATAL
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingId(slot.id)}
                              className="p-2 rounded-xl border-2 border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                              title="Edit Slot"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <form action={deleteSurveySlot} className="inline-block">
                              <input type="hidden" name="id" value={slot.id} />
                              <FormSubmitButton
                                label={<Trash2 className="w-4 h-4" />}
                                loadingLabel="..."
                                className="p-2 rounded-xl border-2 border-gray-100 text-gray-400 hover:border-[#E30613] hover:text-[#E30613] transition-all"
                              />
                            </form>
                          </>
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

      <div className="bg-red-50/50 rounded-3xl border border-red-100/50 p-8 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-[#E30613] shrink-0" />
        <div>
          <h4 className="text-xs font-black text-[#1D1D1B] uppercase tracking-widest mb-1">Penting</h4>
          <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
            Blackout akan menyembunyikan slot dari customer meskipun kapasitas masih tersedia. Gunakan ini untuk libur nasional atau keperluan mendadak.
          </p>
        </div>
      </div>
    </div>
  )
}
