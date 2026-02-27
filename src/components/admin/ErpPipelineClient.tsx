'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign,
  TrendingUp, 
  FileText, 
  FileCheck, 
  Receipt, 
  CreditCard,
  ChevronRight,
  Plus,
  Search,
  Filter,
  History,
  Clock,
  Edit3
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'
import { toast } from '@/components/ui/toaster'
import ErpActionButton from '@/components/admin/ErpActionButton'
import ErpItemEditor from '@/components/admin/ErpItemEditor'
import GeneratePdfButton from './GeneratePdfButton'
import DownloadContractPdfButton from './DownloadContractPdfButton'
import DownloadInvoicePdfButton from './DownloadInvoicePdfButton'
import RecordPaymentModal from './RecordPaymentModal'
import CreateInvoiceModal from './CreateInvoiceModal'

interface PipelineItem {
  id?: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  subtotal: number
  type: string
}

interface Quotation {
  id: string
  quotation_number: string
  status: string
  total_amount: number
  created_at: string
  leads?: { 
    name: string
    phone?: string
  }
  erp_quotation_items?: PipelineItem[]
}

interface Contract {
  id: string
  contract_number: string
  status: string
  total_value: number
  created_at: string
  quotation_id?: string
  erp_quotations?: {
    leads?: {
      phone?: string
    }
  }
  erp_contract_items?: PipelineItem[]
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_paid: number
  created_at: string
  erp_contracts?: {
    erp_quotations?: {
      leads?: {
        name?: string
        phone?: string
      }
    }
  }
  erp_invoice_items?: PipelineItem[]
}

interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action_type: string
  new_value: unknown
  timestamp?: string
  created_at?: string
}

interface Signatory {
  id: string
  name: string
  job_title: string
}

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
  const { quotations, contracts, invoices, auditLogs } = initialData
  const [editingEntity, setEditingEntity] = useState<{ id: string, type: 'quotation' | 'contract' | 'invoice', items: PipelineItem[] } | null>(null)
  const [recordingPayment, setRecordingPayment] = useState<Invoice | null>(null)
  const [creatingInvoiceForContract, setCreatingInvoiceForContract] = useState<Contract | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const stats = [
    { label: 'Total Penawaran', value: quotations?.length ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Kontrak Aktif', value: contracts?.filter(c => c.status === 'active' || c.status === 'draft').length ?? 0, icon: FileCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Invoice Unpaid', value: invoices?.filter(i => i.status === 'unpaid').length ?? 0, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Revenue', value: `Rp ${formatCurrency(invoices?.reduce((acc: number, i) => acc + Number(i.amount_paid), 0) ?? 0)}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const handleCreateQuotation = async () => {
    // Basic logic to open a creation modal or similar
    toast.info('Info', 'Fitur Penawaran Baru manual sedang dikembangkan. Silakan convert dari menu Leads untuk saat ini.')
  }

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " thn lalu"
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " bln lalu"
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " hr lalu"
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " jam lalu"
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " mnt lalu"
    return "Baru saja"
  }

  const handleEditItems = (id: string, type: 'quotation' | 'contract' | 'invoice', items: PipelineItem[]) => {
    setEditingEntity({ id, type, items })
  }

  // Fetch signatries for contracts
  const [signatories, setSignatories] = useState<Signatory[]>([])
  useEffect(() => {
    async function fetchSignatories() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('erp_signatories').select('*').eq('is_active', true)
      const raw = (data ?? []) as { id: string; name: string; job_title?: string }[]
      setSignatories(raw.map((s) => ({
        id: s.id,
        name: s.name,
        job_title: s.job_title ?? ''
      })))
    }
    fetchSignatories()
  }, [])

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-[600px]">
          {/* STAGE 1: QUOTATIONS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Penawaran</h4>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">{quotations?.length ?? 0}</span>
              </div>
              <Filter size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            <div className="flex-1 space-y-3">
              {quotations?.map((qtn: Quotation) => (
                <div key={qtn.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-gray-400">#{qtn.quotation_number.split('-').pop()}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      qtn.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {qtn.status}
                    </span>
                  </div>
                  <h5 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{qtn.leads?.name}</h5>
                  <p className="text-xs font-black text-gray-700 mt-1">Rp {formatCurrency(qtn.total_amount)}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {qtn.status === 'draft' && (
                      <ErpActionButton 
                        type="approve_quotation" 
                        id={qtn.id} 
                        label="Setujui" 
                        className="bg-green-600 text-white hover:bg-green-700"
                      />
                    )}
                    {qtn.status === 'approved' && !contracts?.some((c: Contract) => c.quotation_id === qtn.id) && (
                      <ErpActionButton 
                        type="create_contract" 
                        id={qtn.id} 
                        label="Buat Kontrak" 
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      />
                    )}
                    <button 
                      onClick={() => handleEditItems(qtn.id, 'quotation', qtn.erp_quotation_items || [])}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Edit3 size={12} />
                      Edit Item
                    </button>
                    <GeneratePdfButton quotation={qtn} logoUrl={logoUrl} />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <span className="text-[10px] text-gray-400">
                      {mounted ? getTimeAgo(qtn.created_at) : new Date(qtn.created_at).toLocaleDateString('id-ID')}
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-all translate-x-0 group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAGE 2: CONTRACTS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Kontrak</h4>
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">{contracts?.length ?? 0}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {contracts?.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-xs text-gray-400 font-medium italic">Belum ada kontrak aktif</p>
                </div>
              )}
              {contracts?.map((ctr: Contract) => (
                <div key={ctr.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition-all cursor-pointer group relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-gray-400">#{ctr.contract_number.split('-').pop()}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700">{ctr.status}</span>
                  </div>
                  <h5 className="font-bold text-gray-900 text-sm group-hover:text-green-600">Kontrak {ctr.contract_number}</h5>
                  <p className="text-xs font-black text-gray-700 mt-1">Rp {formatCurrency(ctr.total_value)}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button 
                      onClick={() => setCreatingInvoiceForContract(ctr)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-orange-600 text-white hover:bg-orange-700"
                    >
                      <Receipt size={12} />
                      Terbitkan Invoice
                    </button>
                    <button 
                      onClick={() => handleEditItems(ctr.id, 'contract', ctr.erp_contract_items || [])}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Edit3 size={12} />
                      Edit Item
                    </button>
                    <DownloadContractPdfButton contract={ctr} logoUrl={logoUrl} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAGE 3: INVOICES */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Invoicing</h4>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">{invoices?.length ?? 0}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {invoices?.map((inv: Invoice) => (
                <div key={inv.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-orange-300 transition-all cursor-pointer group relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-gray-400">#{inv.invoice_number.split('-').pop()}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <h5 className="font-bold text-gray-900 text-sm group-hover:text-orange-600">{inv.invoice_number}</h5>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Total:</span>
                      <span className="font-bold text-gray-700 text-xs">Rp {formatCurrency(inv.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Paid:</span>
                      <span className="font-bold text-green-600 text-xs">Rp {formatCurrency(inv.amount_paid)}</span>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-1000" 
                      style={{ width: `${(inv.amount_paid / inv.total_amount) * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleEditItems(inv.id, 'invoice', inv.erp_invoice_items || [])}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <Edit3 size={12} />
                      Edit Item
                    </button>
                    {inv.status !== 'paid' && (
                      <button 
                        onClick={() => setRecordingPayment(inv)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-green-50 text-green-600 hover:bg-green-100"
                      >
                        <DollarSign size={12} />
                        Bayar
                      </button>
                    )}
                    <DownloadInvoicePdfButton invoice={inv} logoUrl={logoUrl} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAGE 4: AUDIT LOGS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Audit Trail</h4>
              </div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                <TrendingUp size={14} className="text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aktivitas Terbaru</span>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {auditLogs?.map((log: AuditLog) => (
                  <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      log.entity_type === 'quotation' ? 'bg-blue-500' :
                      log.entity_type === 'contract' ? 'bg-green-500' :
                      log.entity_type === 'invoice' ? 'bg-orange-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-[11px] text-gray-800 leading-tight">
                        <span className="font-bold uppercase text-[9px] text-gray-400 block mb-0.5">{log.entity_type}</span>
                        <span className="font-bold">Admin</span> {log.action_type === 'create' ? 'membuat' : log.action_type === 'update_status' ? 'mengubah status' : log.action_type === 'update_items' ? 'merevisi item' : log.action_type} 
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-gray-300" />
                        <span className="text-[9px] text-gray-400">
                          {(() => {
                            const timeValue = log.timestamp || log.created_at || ''
                            return mounted ? getTimeAgo(timeValue) : new Date(timeValue).toLocaleDateString('id-ID')
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full py-8 opacity-20">
                    <History size={32} className="text-gray-400" />
                    <p className="text-[10px] font-bold mt-2">Belum ada aktivitas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingEntity && (
        <ErpItemEditor 
          entityId={editingEntity.id}
          entityType={editingEntity.type}
          initialItems={editingEntity.items}
          customerPhone={
            editingEntity.type === 'quotation' 
              ? quotations.find((q) => q.id === editingEntity.id)?.leads?.phone 
              : editingEntity.type === 'contract'
              ? contracts.find((c) => c.id === editingEntity.id)?.erp_quotations?.leads?.phone
              : editingEntity.type === 'invoice'
              ? invoices.find((i) => i.id === editingEntity.id)?.erp_contracts?.erp_quotations?.leads?.phone
              : undefined
          }
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
          onClose={() => setCreatingInvoiceForContract(null)}
        />
      )}
    </div>
  )
}
