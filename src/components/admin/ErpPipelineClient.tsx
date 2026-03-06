'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, ChevronRight, MessageSquare, ArrowRight, LayoutDashboard, FileText, ClipboardList, Receipt, History as HistoryIcon } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { createQuotationRevision } from '@/app/actions/quotations'
import { formatCurrency } from '@/lib/utils/costing'
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'contracts' | 'invoices' | 'audit'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

  // Derive projects from quotations, contracts, and invoices
  const projects = useMemo(() => {
    const projectMap = new Map<string, { 
      id: string, 
      name: string, 
      phone?: string, 
      quotations: Quotation[], 
      contracts: Contract[], 
      invoices: Invoice[],
      lastActivity: string
    }>()

    const addDataToProject = (lead: { name: string, id?: string, phone?: string } | undefined, type: 'quotation' | 'contract' | 'invoice', item: Quotation | Contract | Invoice) => {
      if (!lead) return
      const id = lead.id || lead.name
      
      const itemAsQuotation = item as Quotation
      const itemAsContract = item as Contract
      const itemAsInvoice = item as Invoice
      
      const createdAt = itemAsQuotation.created_at || itemAsContract.created_at || itemAsInvoice.created_at
      const timestamp = (item as unknown as { timestamp?: string }).timestamp
      const activityDate = createdAt || timestamp || new Date().toISOString()

      if (!projectMap.has(id)) {
        projectMap.set(id, {
          id,
          name: lead.name,
          phone: lead.phone,
          quotations: [],
          contracts: [],
          invoices: [],
          lastActivity: activityDate
        })
      }
      const project = projectMap.get(id)!
      if (type === 'quotation') project.quotations.push(itemAsQuotation)
      else if (type === 'contract') project.contracts.push(itemAsContract)
      else project.invoices.push(itemAsInvoice)
      
      if (new Date(activityDate) > new Date(project.lastActivity)) {
        project.lastActivity = activityDate
      }
    }

    quotations.forEach(q => addDataToProject(q.leads as { name: string, id?: string, phone?: string }, 'quotation', q))
    contracts.forEach(c => addDataToProject(c.erp_quotations?.leads as { name: string, id?: string, phone?: string }, 'contract', c))
    invoices.forEach(i => addDataToProject(i.erp_contracts?.erp_quotations?.leads as { name: string, id?: string, phone?: string }, 'invoice', i))

    return Array.from(projectMap.values()).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }, [quotations, contracts, invoices])

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.phone && p.phone.includes(query))
    )
  }, [projects, searchQuery])

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId)
  }, [projects, selectedProjectId])

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

  // const groupedQuotations = ... (removed unused groupedQuotations)

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA] font-sans">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {selectedProjectId && (
            <button 
              onClick={() => setSelectedProjectId(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              title="Kembali ke Daftar Proyek"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-[#1D1D1B] uppercase tracking-tighter">
              {selectedProject ? selectedProject.name : 'Pipeline Proyek (ERP)'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {selectedProject ? `Detail manajemen proyek untuk ${selectedProject.name}` : 'Manajemen penawaran dan kontrak dengan sistem tabbing'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!selectedProject && (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#E30613] transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Cari nama proyek atau telepon..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] w-72 transition-all" 
              />
            </div>
          )}
          
          <button
            onClick={handleCreateQuotation}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E30613] text-white rounded-xl text-sm font-bold hover:bg-[#c40510] transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Penawaran Baru
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {!selectedProject ? (
          <div className="max-w-7xl mx-auto space-y-8">
            <ErpStatsCards quotations={quotations} contracts={contracts} invoices={invoices} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#E30613]/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[200px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#E30613] group-hover:bg-[#E30613] group-hover:text-white transition-all">
                        <LayoutDashboard size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg uppercase tracking-widest">
                          Aktif {mounted ? getTimeAgo(project.lastActivity) : ''}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#E30613] group-hover:text-white transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-extrabold text-[#1D1D1B] mb-1 group-hover:text-[#E30613] transition-colors line-clamp-1">{project.name}</h3>
                    <p className="text-sm text-gray-500 font-medium mb-4">{project.phone || 'Tidak ada nomor telepon'}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-4">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Penawaran</p>
                      <p className="text-sm font-black text-[#1D1D1B]">{project.quotations.length}</p>
                    </div>
                    <div className="text-center border-x border-gray-50 px-2">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Kontrak</p>
                      <p className="text-sm font-black text-[#1D1D1B]">{project.contracts.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-0.5">Invoice</p>
                      <p className="text-sm font-black text-[#1D1D1B]">{project.invoices.length}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredProjects.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Search size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Proyek tidak ditemukan</h3>
                  <p className="text-gray-500">Coba gunakan kata kunci pencarian lain.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap gap-3 mb-2">
              <button 
                onClick={handleCreateQuotation}
                className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-[#E30613] hover:text-white hover:border-[#E30613] transition-all shadow-sm flex items-center gap-2"
              >
                <Plus size={14} /> Tambah Penawaran
              </button>
              {selectedProject.contracts.length > 0 && (
                <button 
                  className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-[#1D1D1B] hover:text-white transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus size={14} /> Buat Invoice
                </button>
              )}
            </div>

            {/* Tabbing Navigation */}
            <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex gap-1 inline-flex mb-6">
              {[
                { id: 'overview', label: 'Ringkasan', icon: <LayoutDashboard size={16} /> },
                { id: 'quotations', label: 'Penawaran', icon: <FileText size={16} /> },
                { id: 'contracts', label: 'Kontrak', icon: <ClipboardList size={16} /> },
                { id: 'invoices', label: 'Invoice', icon: <Receipt size={16} /> },
                { id: 'audit', label: 'Log Aktivitas', icon: <HistoryIcon size={16} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'quotations' | 'contracts' | 'invoices' | 'audit')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-[#E30613] text-white shadow-lg shadow-[#E30613]/20 scale-[1.02]' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-black text-[#1D1D1B] mb-6 uppercase tracking-tighter">Status Proyek Terkini</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total Penawaran</p>
                          <p className="text-2xl font-black text-blue-700">{selectedProject.quotations.length}</p>
                        </div>
                        <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Total Kontrak</p>
                          <p className="text-2xl font-black text-purple-700">{selectedProject.contracts.length}</p>
                        </div>
                        <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Total Invoice</p>
                          <p className="text-2xl font-black text-green-700">{selectedProject.invoices.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-black text-[#1D1D1B] mb-6 uppercase tracking-tighter">Penawaran Terbaru</h3>
                      <div className="space-y-4">
                        {selectedProject.quotations.slice(0, 3).map((qtn) => (
                          <div key={qtn.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                            <div>
                              <p className="text-sm font-bold text-[#1D1D1B]">{qtn.quotation_number}</p>
                              <p className="text-xs text-gray-500">{mounted ? getTimeAgo(qtn.created_at) : ''}</p>
                            </div>
                            <p className="text-sm font-black text-[#1D1D1B]">Rp {formatCurrency(qtn.total_amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="bg-[#1D1D1B] p-8 rounded-3xl shadow-xl text-white">
                      <h3 className="text-lg font-black mb-6 uppercase tracking-tighter text-[#E30613]">Kontak Klien</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nama</p>
                          <p className="text-md font-bold">{selectedProject.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">WhatsApp</p>
                          <p className="text-md font-bold">{selectedProject.phone || '-'}</p>
                        </div>
                        <button 
                          onClick={() => window.open(`https://wa.me/${selectedProject.phone?.replace(/\D/g, '')}`, '_blank')}
                          className="w-full mt-4 py-3 bg-[#E30613] text-white rounded-xl text-xs font-bold hover:bg-[#c40510] transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={14} /> Hubungi via WhatsApp
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-black text-[#1D1D1B] mb-6 uppercase tracking-tighter">Aktivitas Terakhir</h3>
                      <AuditTrailColumn
                        auditLogs={auditLogs.filter(log => 
                          selectedProject.quotations.some(q => q.id === log.entity_id) ||
                          selectedProject.contracts.some(c => c.id === log.entity_id) ||
                          selectedProject.invoices.some(i => i.id === log.entity_id)
                        )}
                        mounted={mounted}
                        getTimeAgo={getTimeAgo}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quotations' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <QuotationColumn
                    groupedQuotations={[{ 
                      latest: [...selectedProject.quotations].sort((a, b) => (b.version || 1) - (a.version || 1))[0],
                      versions: [...selectedProject.quotations].sort((a, b) => (b.version || 1) - (a.version || 1))
                    }]}
                    quotationCount={selectedProject.quotations.length}
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
                </div>
              )}

              {activeTab === 'contracts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ContractColumn
                    contracts={selectedProject.contracts}
                    logoUrl={logoUrl}
                    onCreateInvoice={setCreatingInvoiceForContract}
                    onEditItems={handleEditItems}
                    renderDownloadContractPdfButton={(contract, currentLogoUrl) => (
                      <DownloadContractPdfButton contract={contract} logoUrl={currentLogoUrl} />
                    )}
                  />
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InvoiceColumn
                    invoices={selectedProject.invoices}
                    logoUrl={logoUrl}
                    onEditItems={handleEditItems}
                    onRecordPayment={setRecordingPayment}
                    renderDownloadInvoicePdfButton={(invoice, currentLogoUrl) => (
                      <DownloadInvoicePdfButton invoice={invoice} logoUrl={currentLogoUrl} />
                    )}
                  />
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <AuditTrailColumn
                    auditLogs={auditLogs.filter(log => 
                      selectedProject.quotations.some(q => q.id === log.entity_id) ||
                      selectedProject.contracts.some(c => c.id === log.entity_id) ||
                      selectedProject.invoices.some(i => i.id === log.entity_id)
                    )}
                    mounted={mounted}
                    getTimeAgo={getTimeAgo}
                  />
                </div>
              )}
            </div>
          </div>
        )}
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
