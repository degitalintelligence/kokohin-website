'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, ArrowRight, Loader2, FileCheck, Receipt } from 'lucide-react'
import { updateQuotationStatus } from '@/app/actions/quotations'
import { createContractFromQuotation, createInvoiceFromContract } from '@/app/actions/erp'
import { toast } from '@/components/ui/toaster'

interface ErpActionButtonProps {
  type: 'approve_quotation' | 'create_contract'
  id: string
  label: string
  className?: string
}

export default function ErpActionButton({ type, id, label, className }: ErpActionButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleAction = async () => {
    startTransition(async () => {
      try {
        if (type === 'approve_quotation') {
          await updateQuotationStatus(id, 'approved')
          toast.success('Penawaran berhasil disetujui')
        } else if (type === 'create_contract') {
          await createContractFromQuotation(id)
          toast.success('Kontrak berhasil diterbitkan')
        }
      } catch (error: any) {
        console.error(`ERP Action ${type} failed:`, error)
        toast.error('Gagal memproses aksi', error.message || 'Terjadi kesalahan sistem')
      }
    })
  }

  const getIcon = () => {
    if (isPending) return <Loader2 size={12} className="animate-spin" />
    if (type === 'approve_quotation') return <CheckCircle size={12} />
    if (type === 'create_contract') return <FileCheck size={12} />
    return <ArrowRight size={12} />
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        handleAction()
      }}
      disabled={isPending}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {getIcon()}
      {isPending ? 'Memproses...' : label}
    </button>
  )
}
