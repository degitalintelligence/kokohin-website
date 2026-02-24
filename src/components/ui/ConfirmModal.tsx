'use client'

import React from 'react'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  pending?: boolean
  danger?: boolean
  children?: React.ReactNode
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  pending = false,
  danger = true,
  children
}: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Tutup dialog"
        onClick={() => { if (!pending) onCancel() }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="relative w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-6"
      >
        <h3 id="confirm-modal-title" className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p id="confirm-modal-desc" className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        )}
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-outline-dark btn-sm"
            onClick={() => { if (!pending) onCancel() }}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-4 py-2 rounded-md text-white disabled:opacity-60"
            style={{ backgroundColor: danger ? '#E30613' : '#1D1D1B' }}
          >
            {pending ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
