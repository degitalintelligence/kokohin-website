'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteZone } from '@/app/actions/zones'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DeleteZoneButtonProps {
  id: string
  label?: string
  className?: string
}

export default function DeleteZoneButton({ 
  id, 
  label = 'Hapus Zona', 
  className = 'btn btn-outline-danger' 
}: DeleteZoneButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node
      if (!open) return
      if (panelRef.current && panelRef.current.contains(t)) return
      if (btnRef.current && btnRef.current.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('click', onClickOutside)
    return () => window.removeEventListener('click', onClickOutside)
  }, [open])

  const confirmDelete = async () => {
    setError(null)
    setIsDeleting(true)
    try {
      await deleteZone(id)
      setOpen(false)
      router.push('/admin/zones')
      router.refresh()
    } catch {
      setError('Gagal menghapus zona')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        disabled={isDeleting}
        className={className}
      >
        {isDeleting ? '...' : label}
      </button>
      <ConfirmModal
        open={open}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus zona ini?"
        confirmLabel={isDeleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={confirmDelete}
        onCancel={() => { if (!isDeleting) setOpen(false) }}
        pending={isDeleting}
        danger
      >
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
      </ConfirmModal>
    </>
  )
}
