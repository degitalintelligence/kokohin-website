'use client'

import { CreditCard, FileCheck, FileText, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'
import type { Contract, Invoice, Quotation } from './types'

interface ErpStatsCardsProps {
  quotations: Quotation[]
  contracts: Contract[]
  invoices: Invoice[]
}

export default function ErpStatsCards({ quotations, contracts, invoices }: ErpStatsCardsProps) {
  const stats = [
    { label: 'Total Penawaran', value: quotations.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Kontrak Aktif', value: contracts.filter(c => c.status === 'active' || c.status === 'draft').length, icon: FileCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Invoice Unpaid', value: invoices.filter(i => i.status === 'unpaid').length, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Revenue', value: `Rp ${formatCurrency(invoices.reduce((acc, i) => acc + Number(i.amount_paid), 0))}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
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
  )
}
