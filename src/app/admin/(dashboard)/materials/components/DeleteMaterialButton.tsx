'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMaterial } from '@/app/actions/materials'
import { toast } from '@/components/ui/toaster'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DeleteMaterialButtonProps {
  id: string
}

export default function DeleteMaterialButton({ id }: DeleteMaterialButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
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
    setIsDeleting(true)
    try {
      await deleteMaterial(id)
      toast.success('Material berhasil dihapus')
      setOpen(false)
      router.push('/admin/materials')
      router.refresh()
    } catch (error) {
      toast.error('Gagal menghapus material', error instanceof Error ? error.message : 'Terjadi kesalahan')
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
        className="btn btn-outline-danger"
      >
        {isDeleting ? '...' : 'Hapus'}
      </button>
      <ConfirmModal
        open={open}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus material ini?"
        confirmLabel={isDeleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={confirmDelete}
        onCancel={() => { if (!isDeleting) setOpen(false) }}
        pending={isDeleting}
        danger
      />
    </>
  )
}
