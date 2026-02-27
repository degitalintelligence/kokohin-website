'use client'

import { useTransition } from 'react'
import { X, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { createInvoiceFromContract } from '@/app/actions/erp'
import { formatCurrency } from '@/lib/utils/costing'
import { toast } from '@/components/ui/toaster'

interface PaymentTermsJson {
  t1_percent?: number
  t2_percent?: number
  t3_percent?: number
  [key: string]: unknown
}

interface PaymentTerm {
  percent: number
  label: string
}

interface CreateInvoiceModalProps {
  contract: {
    id: string
    contract_number: string
    total_value: number
    payment_terms_json?: PaymentTermsJson | PaymentTerm[] | null
  }
  onClose: () => void
}

export default function CreateInvoiceModal({ contract, onClose }: CreateInvoiceModalProps) {
  const [isPending, startTransition] = useTransition()
  
  // Parse payment terms
  let termsArray: PaymentTerm[] = []
  if (Array.isArray(contract.payment_terms_json)) {
    termsArray = contract.payment_terms_json as PaymentTerm[]
  } else {
    const rawTerms = contract.payment_terms_json || { t1_percent: 50, t2_percent: 40, t3_percent: 10 }
    const t1 = Number(rawTerms.t1_percent ?? 50)
    const t2 = Number(rawTerms.t2_percent ?? 40)
    const t3 = Number(rawTerms.t3_percent ?? 10)
    termsArray = [
      { percent: t1, label: `Down Payment (${t1}%)` },
      { percent: t2, label: `Progress (${t2}%)` },
      { percent: t3, label: `Pelunasan (${t3}%)` }
    ]
  }

  const handleCreateInvoice = (term: PaymentTerm) => {
    startTransition(async () => {
      try {
        await createInvoiceFromContract(contract.id, {
          stageName: term.label,
          percentage: term.percent
        })
        toast.success('Berhasil', `Invoice untuk ${term.label} berhasil diterbitkan.`)
        onClose()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menerbitkan invoice.'
        toast.error('Gagal', errorMessage)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Terbitkan Invoice</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{contract.contract_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </header>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Pilih termin pembayaran yang ingin ditagihkan. Sistem akan membuat invoice otomatis berdasarkan persentase yang disepakati di kontrak.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight ml-1">Pilih Termin Pembayaran</label>
            {termsArray.map((term: PaymentTerm, idx: number) => {
              const amount = Math.ceil(contract.total_value * (term.percent / 100))
              return (
                <button
                  key={idx}
                  onClick={() => handleCreateInvoice(term)}
                  disabled={isPending}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-orange-200 hover:shadow-md rounded-2xl transition-all group disabled:opacity-50"
                >
                  <div className="text-left">
                    <span className="block font-black text-gray-900 text-sm group-hover:text-orange-600">{term.label}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{term.percent}% dari total kontrak</span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-black text-gray-900">Rp {formatCurrency(amount)}</span>
                    <CheckCircle2 size={18} className="text-gray-200 group-hover:text-orange-500 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <footer className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
            {isPending ? 'Sedang menerbitkan invoice...' : 'Klik salah satu termin di atas'}
          </p>
        </footer>
      </div>
    </div>
  )
}
