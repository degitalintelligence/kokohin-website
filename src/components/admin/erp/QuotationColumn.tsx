'use client'

import { ChevronRight, Edit3, Filter, History } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'
import ErpActionButton from '@/components/admin/ErpActionButton'
import type { Contract, GroupedQuotation, PipelineItem } from './types'
import type { ReactNode } from 'react'

interface QuotationColumnProps {
  groupedQuotations: GroupedQuotation[]
  quotationCount: number
  contracts: Contract[]
  mounted: boolean
  isPendingRevision: boolean
  logoUrl: string | null
  onCreateRevision: (quotationId: string) => void
  onEditItems: (id: string, type: 'quotation', items: PipelineItem[]) => void
  getTimeAgo: (date: string) => string
  renderGeneratePdfButton: (quotation: GroupedQuotation['latest'], logoUrl: string | null) => ReactNode
}

export default function QuotationColumn({
  groupedQuotations,
  quotationCount,
  contracts,
  mounted,
  isPendingRevision,
  logoUrl,
  onCreateRevision,
  onEditItems,
  getTimeAgo,
  renderGeneratePdfButton,
}: QuotationColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Penawaran</h4>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">{quotationCount}</span>
        </div>
        <Filter size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>
      <div className="flex-1 space-y-3">
        {groupedQuotations.map(({ latest, versions }) => (
          <div key={latest.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all cursor-pointer group relative">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono text-gray-400">#{latest.quotation_number.split('-').pop()}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                latest.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {latest.status}
                {latest.version && latest.version > 1 && ` (V${latest.version})`}
              </span>
            </div>
            <h5 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{latest.leads?.name}</h5>
            <p className="text-xs font-black text-gray-700 mt-1">Rp {formatCurrency(latest.total_amount)}</p>

            {versions.length > 1 && (
              <div className="mt-3 flex flex-col gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">History Versi</span>
                <div className="flex flex-wrap gap-1.5">
                  {versions.map(v => (
                    <button
                      key={v.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditItems(v.id, 'quotation', v.erp_quotation_items || [])
                      }}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        v.id === latest.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-500 hover:text-blue-600 border border-gray-100'
                      }`}
                    >
                      V{v.version || 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {latest.status === 'draft' && (
                <ErpActionButton
                  type="approve_quotation"
                  id={latest.id}
                  label="Setujui"
                  className="bg-green-600 text-white hover:bg-green-700"
                />
              )}
              {latest.status === 'approved' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateRevision(latest.id)
                  }}
                  disabled={isPendingRevision || contracts.some((c) => c.quotation_id === latest.id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    contracts.some((c) => c.quotation_id === latest.id)
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                  title={contracts.some((c) => c.quotation_id === latest.id) ? 'Sudah terbit kontrak' : 'Buat revisi'}
                >
                  <History size={12} />
                  Revisi
                </button>
              )}
              {latest.status === 'approved' && !contracts.some((c) => c.quotation_id === latest.id) && (
                <ErpActionButton
                  type="create_contract"
                  id={latest.id}
                  label="Buat Kontrak"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                />
              )}
              {latest.status !== 'approved' && (
                <button
                  onClick={() => onEditItems(latest.id, 'quotation', latest.erp_quotation_items || [])}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <Edit3 size={12} />
                  Edit Item
                </button>
              )}
              {renderGeneratePdfButton(latest, logoUrl)}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
              <span className="text-[10px] text-gray-400">
                {mounted ? getTimeAgo(latest.created_at) : new Date(latest.created_at).toLocaleDateString('id-ID')}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-all translate-x-0 group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
