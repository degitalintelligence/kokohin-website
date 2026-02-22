'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMaterial } from '@/app/actions/materials'
import { toast } from '@/components/ui/toaster'

interface DeleteMaterialButtonProps {
  id: string
}

export default function DeleteMaterialButton({ id }: DeleteMaterialButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus material ini?')) {
      setIsDeleting(true)
      try {
        await deleteMaterial(id)
        toast.success('Material berhasil dihapus')
        router.push('/admin/materials')
        router.refresh()
      } catch (error) {
        console.error('Error deleting material:', error)
        toast.error('Gagal menghapus material', error instanceof Error ? error.message : 'Terjadi kesalahan')
        setIsDeleting(false)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn btn-outline-danger"
    >
      {isDeleting ? '...' : 'Hapus'}
    </button>
  )
}
