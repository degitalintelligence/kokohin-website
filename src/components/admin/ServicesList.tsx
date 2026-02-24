'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Trash2, Edit, CheckSquare, Square } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

type Service = {
  id: string
  name: string
  slug: string
  order: number | null
  is_active: boolean | null
}

export default function ServicesList({ services: initial }: { services: Service[] }) {
  const [services, setServices] = useState<Service[]>(initial)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [selectAll, setSelectAll] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [openConfirm, setOpenConfirm] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const toggleAll = () => {
    const next = !selectAll
    setSelectAll(next)
    const map: Record<string, boolean> = {}
    services.forEach(s => { map[s.id] = next })
    setSelected(map)
  }

  const toggleOne = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const performDelete = async () => {
    const ids = Object.keys(selected).filter(id => selected[id])
    if (ids.length === 0) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/services/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Gagal menghapus layanan' })
      } else {
        const remaining = services.filter(s => !ids.includes(s.id))
        setServices(remaining)
        setSelected({})
        setSelectAll(false)
        setMessage({ type: 'success', text: `Berhasil menghapus ${ids.length} layanan` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' })
    } finally {
      setOpenConfirm(false)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4" aria-busy={loading || undefined}>
      <div className="flex items-center justify-between">
        <button onClick={toggleAll} aria-pressed={selectAll} aria-label="Pilih semua layanan" className="btn btn-outline flex items-center gap-2">
          {selectAll ? <CheckSquare size={16} /> : <Square size={16} />}
          Pilih Semua
        </button>
        <button
          ref={btnRef}
          onClick={() => setOpenConfirm(true)}
          disabled={loading}
          className="btn btn-outline-danger flex items-center gap-2"
        >
          <Trash2 size={16} />
          Hapus Terpilih
        </button>
      </div>

      {message && (
        <div role="status" aria-live="polite" className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {services.map(svc => {
          const checked = !!selected[svc.id]
          return (
            <div key={svc.id} className={`p-4 bg-white rounded-lg border flex items-center justify-between ${checked ? 'border-[#E30613]' : ''}`}>
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-[#E30613]"
                  checked={checked}
                  onChange={() => toggleOne(svc.id)}
                  aria-label={`Pilih layanan ${svc.name}`}
                />
                <div>
                  <div className="font-semibold text-gray-900">{svc.name}</div>
                  <div className="text-sm text-gray-500">{svc.slug} • Urutan {svc.order ?? 0} • {svc.is_active ? 'Aktif' : 'Non-aktif'}</div>
                </div>
              </div>
              <Link href={`/admin/services/${svc.id}`} className="btn btn-outline flex items-center gap-2">
                <Edit size={16} /> Edit
              </Link>
            </div>
          )
        })}
        {services.length === 0 && (
          <div className="p-6 bg-white rounded-lg border text-gray-500">Belum ada layanan.</div>
        )}
      </div>
      <ConfirmModal
        open={openConfirm}
        title="Konfirmasi Hapus"
        description="Hapus layanan terpilih?"
        confirmLabel={loading ? 'Menghapus...' : 'Hapus'}
        onConfirm={performDelete}
        onCancel={() => setOpenConfirm(false)}
        pending={loading}
        danger
      />
    </div>
  )
}
