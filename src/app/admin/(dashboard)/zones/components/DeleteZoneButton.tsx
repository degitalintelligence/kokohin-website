'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteZone } from '@/app/actions/zones'

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
  const router = useRouter()

  const handleDelete = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus zona ini?')) {
      setIsDeleting(true)
      try {
        await deleteZone(id)
        router.push('/admin/zones')
        router.refresh()
      } catch (error) {
        console.error('Error deleting zone:', error)
        alert('Gagal menghapus zona')
        setIsDeleting(false)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className={className}
    >
      {isDeleting ? '...' : label}
    </button>
  )
}
