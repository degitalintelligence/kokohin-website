'use client'

import { useEffect, useRef, useState } from 'react'
import { deleteCatalog } from '@/app/actions/catalogs'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function DeleteCatalogButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

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

  const submit = () => {
    setPending(true)
    formRef.current?.requestSubmit()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Hapus
      </button>
      <form ref={formRef} action={deleteCatalog} className="hidden">
        <input type="hidden" name="id" value={id} />
      </form>
      <ConfirmModal
        open={open}
        title="Konfirmasi Hapus"
        description="Yakin ingin menghapus katalog ini?"
        confirmLabel={pending ? 'Menghapus...' : 'Hapus'}
        onConfirm={submit}
        onCancel={() => { if (!pending) setOpen(false) }}
        pending={pending}
        danger
      />
    </>
  )
}
