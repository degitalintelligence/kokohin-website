'use client'

import { useState } from 'react'
import { PlusCircle, X } from 'lucide-react'
import FormSubmitButton from '@/components/admin/FormSubmitButton'

interface AddSlotModalClientProps {
  createSlotAction: (formData: FormData) => void
}

export default function AddSlotModalClient({ createSlotAction }: AddSlotModalClientProps) {
  const [open, setOpen] = useState(false)

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        <PlusCircle className="w-3 h-3" />
        Buat Slot
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                  Tambah Slot
                </p>
                <h3 className="text-sm font-extrabold text-gray-900 mt-1">Buat Slot Survei Baru</h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              Gunakan form ini untuk membuat satu slot survei pada tanggal dan jam tertentu.
            </p>

            <form action={createSlotAction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  name="date"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Kapasitas (booking per slot)
                </label>
                <input
                  type="number"
                  name="capacity"
                  min={1}
                  defaultValue={1}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                  <input type="checkbox" name="is_active" defaultChecked />
                  Aktif
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                  <input type="checkbox" name="blackout" />
                  Blackout
                </label>
              </div>
              <button type="submit" className="hidden">
                Simpan Slot
              </button>
              <FormSubmitButton
                label="Simpan Slot"
                loadingLabel="Menyimpan..."
                className="w-full mt-1 py-2.5 rounded-lg bg-[#E30613] text-white text-sm font-bold hover:bg-red-700 transition-colors"
              />
            </form>
          </div>
        </div>
      )}
    </>
  )
}

