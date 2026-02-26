'use client'

import { useState, useTransition } from 'react'
import { X, DollarSign, Calendar, CreditCard, Hash, Loader2 } from 'lucide-react'
import { recordPayment } from '@/app/actions/erp'
import { formatCurrency } from '@/lib/utils/costing'
import { toast } from '@/components/ui/toaster'

interface RecordPaymentModalProps {
  invoice: any
  onClose: () => void
}

export default function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(Number(invoice.total_amount) - Number(invoice.amount_paid))
  const [method, setMethod] = useState<string>('transfer')
  const [ref, setRef] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (amount <= 0) {
      toast.error('Error', 'Jumlah pembayaran harus lebih dari 0')
      return
    }

    startTransition(async () => {
      try {
        await recordPayment(invoice.id, {
          amount,
          method,
          ref
        })
        toast.success('Berhasil', 'Pembayaran berhasil dicatat')
        onClose()
      } catch (error: any) {
        toast.error('Gagal', error.message || 'Gagal mencatat pembayaran')
      }
    })
  }

  const remaining = Number(invoice.total_amount) - Number(invoice.amount_paid)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Catat Pembayaran</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{invoice.invoice_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight block mb-1">Total Tagihan</span>
              <span className="text-sm font-black text-gray-900">Rp {formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-tight block mb-1">Sisa Tagihan</span>
              <span className="text-sm font-black text-orange-600">Rp {formatCurrency(remaining)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Jumlah Pembayaran</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</div>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Metode</label>
                <select 
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai / Cash</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">No. Referensi (Opsional)</label>
                <input 
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  placeholder="ID Transaksi"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-white rounded-xl transition-all"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <DollarSign size={18} />}
            Simpan Pembayaran
          </button>
        </footer>
      </div>
    </div>
  )
}
