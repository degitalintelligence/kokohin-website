'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { createQuotationRevision } from '@/app/actions/quotations'
import { useRouter } from 'next/navigation'
import ErpStatsCards from '@/components/admin/erp/ErpStatsCards'
import QuotationColumn from '@/components/admin/erp/QuotationColumn'
import ContractColumn from '@/components/admin/erp/ContractColumn'
import InvoiceColumn from '@/components/admin/erp/InvoiceColumn'
import AuditTrailColumn from '@/components/admin/erp/AuditTrailColumn'
import type { AuditLog, Contract, Invoice, PipelineItem, Quotation, Signatory } from '@/components/admin/erp/types'

const ErpItemEditor = dynamic(() => import('@/components/admin/ErpItemEditor'), { ssr: false })
const GeneratePdfButton = dynamic(() => import('@/components/admin/GeneratePdfButton'), { ssr: false })
const DownloadContractPdfButton = dynamic(() => import('@/components/admin/DownloadContractPdfButton'), { ssr: false })
const DownloadInvoicePdfButton = dynamic(() => import('@/components/admin/DownloadInvoicePdfButton'), { ssr: false })
const RecordPaymentModal = dynamic(() => import('@/components/admin/RecordPaymentModal'), { ssr: false })
const CreateInvoiceModal = dynamic(() => import('@/components/admin/CreateInvoiceModal'), { ssr: false })

interface ErpPipelineProps {
  initialData: {
    quotations: Quotation[]
    contracts: Contract[]
    invoices: Invoice[]
    auditLogs: AuditLog[]
  }
  logoUrl: string | null
}

export default function ErpPipelineClient({ initialData, logoUrl }: ErpPipelineProps) {
  const router = useRouter()
  const { quotations, contracts, invoices, auditLogs } = initialData
  const [editingEntity, setEditingEntity] = useState<{ id: string, type: 'quotation' | 'contract' | 'invoice', items: PipelineItem[] } | null>(null)
  const [recordingPayment, setRecordingPayment] = useState<Invoice | null>(null)
  const [creatingInvoiceForContract, setCreatingInvoiceForContract] = useState<Contract | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleCreateRevision = async (quotationId: string) => {
    if (!confirm('Buat revisi baru untuk penawaran ini? Versi lama akan tetap tersimpan.')) return

    setIsPending(true)
    try {
      const result = await createQuotationRevision(quotationId)
      if (result.success) {
        toast.success('Berhasil', 'Revisi penawaran berhasil dibuat.')
        router.push(`/admin/quotes/${result.quotationId}/edit`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal membuat revisi.'
      toast.error('Gagal', message)
    } finally {
      setIsPending(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateQuotation = async () => {
    toast.info('Info', 'Fitur Penawaran Baru manual sedang dikembangkan. Silakan convert dari menu Leads untuk saat ini.')
  }

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + ' thn lalu'
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + ' bln lalu'
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + ' hr lalu'
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + ' jam lalu'
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + ' mnt lalu'
    return 'Baru saja'
  }

  const handleEditItems = (id: string, type: 'quotation' | 'contract' | 'invoice', items: PipelineItem[]) => {
    setEditingEntity({ id, type, items })
  }

  const groupedQuotations = useMemo(() => {
    const groups: Record<string, Quotation[]> = {}
    quotations.forEach((qtn) => {
      const key = qtn.leads?.name || qtn.quotation_number.split('-V')[0]
      if (!groups[key]) groups[key] = []
      groups[key].push(qtn)
    })
    return Object.values(groups).map((group) => {
      const sorted = [...group].sort((a, b) => (b.version || 1) - (a.version || 1))
      return {
        latest: sorted[0] as Quotation,
        versions: sorted as Quotation[]
      }
    })
  }, [quotations])

  const [signatories, setSignatories] = useState<Signatory[]>([])
  useEffect(() => {
    async function fetchSignatories() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('erp_signatories').select('*').eq('is_active', true)
      const raw = (data ?? []) as { id: string; name: string; job_title?: string }[]
      setSignatories(raw.map((signatory) => ({
        id: signatory.id,
        name: signatory.name,
        job_title: signatory.job_title ?? ''
      })))
    }
    fetchSignatories()
  }, [])

  const existingInvoices = useMemo(() => {
    if (!creatingInvoiceForContract) return []
    return invoices.filter((invoice) =>
      invoice.contract_id === creatingInvoiceForContract.id ||
      invoice.erp_contracts?.id === creatingInvoiceForContract.id
    )
  }, [invoices, creatingInvoiceForContract])

  const customerPhoneForEditing = useMemo(() => {
    if (!editingEntity) return undefined
    if (editingEntity.type === 'quotation') {
      return quotations.find((quotation) => quotation.id === editingEntity.id)?.leads?.phone
    }
    if (editingEntity.type === 'contract') {
      return contracts.find((contract) => contract.id === editingEntity.id)?.erp_quotations?.leads?.phone
    }
    if (editingEntity.type === 'invoice') {
      return invoices.find((invoice) => invoice.id === editingEntity.id)?.erp_contracts?.erp_quotations?.leads?.phone
    }
    return undefined
  }, [editingEntity, quotations, contracts, invoices])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Pipeline Proyek (ERP)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manajemen penawaran dan kontrak dengan item independen</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Cari penawaran/proyek..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] w-64" />
          </div>
          <button
            onClick={handleCreateQuotation}
            className="flex items-center gap-2 px-4 py-2 bg-[#1D1D1B] text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-sm"
          >
            <Plus size={16} /> Penawaran Baru
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <ErpStatsCards quotations={quotations} contracts={contracts} invoices={invoices} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-[600px]">
          <QuotationColumn
            groupedQuotations={groupedQuotations}
            quotationCount={quotations.length}
            contracts={contracts}
            mounted={mounted}
            isPendingRevision={isPending}
            logoUrl={logoUrl}
            onCreateRevision={handleCreateRevision}
            onEditItems={handleEditItems}
            getTimeAgo={getTimeAgo}
            renderGeneratePdfButton={(quotation, currentLogoUrl) => (
              <GeneratePdfButton quotation={quotation} logoUrl={currentLogoUrl} />
            )}
          />
          <ContractColumn
            contracts={contracts}
            logoUrl={logoUrl}
            onCreateInvoice={setCreatingInvoiceForContract}
            onEditItems={handleEditItems}
            renderDownloadContractPdfButton={(contract, currentLogoUrl) => (
              <DownloadContractPdfButton contract={contract} logoUrl={currentLogoUrl} />
            )}
          />
          <InvoiceColumn
            invoices={invoices}
            logoUrl={logoUrl}
            onEditItems={handleEditItems}
            onRecordPayment={setRecordingPayment}
            renderDownloadInvoicePdfButton={(invoice, currentLogoUrl) => (
              <DownloadInvoicePdfButton invoice={invoice} logoUrl={currentLogoUrl} />
            )}
          />
          <AuditTrailColumn
            auditLogs={auditLogs}
            mounted={mounted}
            getTimeAgo={getTimeAgo}
          />
        </div>
      </div>

      {editingEntity && (
        <ErpItemEditor
          entityId={editingEntity.id}
          entityType={editingEntity.type}
          initialItems={editingEntity.items}
          customerPhone={customerPhoneForEditing}
          signatories={signatories}
          onClose={() => setEditingEntity(null)}
        />
      )}

      {recordingPayment && (
        <RecordPaymentModal
          invoice={recordingPayment}
          onClose={() => setRecordingPayment(null)}
        />
      )}

      {creatingInvoiceForContract && (
        <CreateInvoiceModal
          contract={creatingInvoiceForContract}
          existingInvoices={existingInvoices}
          onClose={() => setCreatingInvoiceForContract(null)}
        />
      )}
    </div>
  )
}
