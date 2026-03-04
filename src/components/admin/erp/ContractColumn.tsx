'use client'

import { Edit3, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'
import ErpActionButton from '@/components/admin/ErpActionButton'
import type { Contract, PipelineItem } from './types'
import type { ReactNode } from 'react'

interface ContractColumnProps {
  contracts: Contract[]
  logoUrl: string | null
  onCreateInvoice: (contract: Contract) => void
  onEditItems: (id: string, type: 'contract', items: PipelineItem[]) => void
  renderDownloadContractPdfButton: (contract: Contract, logoUrl: string | null) => ReactNode
}

export default function ContractColumn({
  contracts,
  logoUrl,
  onCreateInvoice,
  onEditItems,
  renderDownloadContractPdfButton,
}: ContractColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Kontrak</h4>
          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">{contracts.length}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {contracts.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-xs text-gray-400 font-medium italic">Belum ada kontrak aktif</p>
          </div>
        )}
        {contracts.map((ctr) => (
          <div key={ctr.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition-all cursor-pointer group relative">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono text-gray-400">#{ctr.contract_number.split('-').pop()}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-green-100 text-green-700">{ctr.status}</span>
            </div>
            <h5 className="font-bold text-gray-900 text-sm group-hover:text-green-600">Kontrak {ctr.contract_number}</h5>
            <p className="text-xs font-black text-gray-700 mt-1">Rp {formatCurrency(ctr.total_value)}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {ctr.status === 'draft' && (
                <ErpActionButton
                  type="approve_contract"
                  id={ctr.id}
                  label="Setujui Kontrak"
                  className="bg-green-600 text-white hover:bg-green-700"
                />
              )}
              <button
                onClick={() => onCreateInvoice(ctr)}
                disabled={ctr.status !== 'active'}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                  ctr.status === 'active'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={ctr.status === 'active' ? 'Terbitkan Invoice' : 'Kontrak harus aktif terlebih dahulu'}
              >
                <Receipt size={12} />
                Terbitkan Invoice
              </button>
              <button
                onClick={() => onEditItems(ctr.id, 'contract', ctr.erp_contract_items || [])}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <Edit3 size={12} />
                Edit Item
              </button>
              {renderDownloadContractPdfButton(ctr, logoUrl)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
