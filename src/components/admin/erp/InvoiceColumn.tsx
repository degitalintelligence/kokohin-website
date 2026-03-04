'use client'

import { DollarSign, Edit3 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'
import type { Invoice, PipelineItem } from './types'
import type { ReactNode } from 'react'

interface InvoiceColumnProps {
  invoices: Invoice[]
  logoUrl: string | null
  onEditItems: (id: string, type: 'invoice', items: PipelineItem[]) => void
  onRecordPayment: (invoice: Invoice) => void
  renderDownloadInvoicePdfButton: (invoice: Invoice, logoUrl: string | null) => ReactNode
}

export default function InvoiceColumn({
  invoices,
  logoUrl,
  onEditItems,
  onRecordPayment,
  renderDownloadInvoicePdfButton,
}: InvoiceColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Invoicing</h4>
          <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">{invoices.length}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {invoices.map((inv) => (
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
                onClick={() => onEditItems(inv.id, 'invoice', inv.erp_invoice_items || [])}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <Edit3 size={12} />
                Edit Item
              </button>
              {inv.status !== 'paid' && (
                <button
                  onClick={() => onRecordPayment(inv)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-green-50 text-green-600 hover:bg-green-100"
                >
                  <DollarSign size={12} />
                  Bayar
                </button>
              )}
              {renderDownloadInvoicePdfButton(inv, logoUrl)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
