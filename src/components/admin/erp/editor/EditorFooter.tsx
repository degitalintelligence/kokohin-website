'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, Plus, Save } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/costing'

interface EditorFooterProps {
  entityType: 'quotation' | 'contract' | 'invoice'
  totalAmount: number
  totalMinAmount: number
  isBelowMinAnyItem: boolean
  isPending: boolean
  isLocked?: boolean
  isContracted?: boolean
  version?: number
  onClose: () => void
  onSave: () => void
  onCreateRevision?: () => void
}

export default function EditorFooter({
  entityType,
  totalAmount,
  totalMinAmount,
  isBelowMinAnyItem,
  isPending,
  isLocked,
  isContracted,
  version,
  onClose,
  onSave,
  onCreateRevision,
}: EditorFooterProps) {
  return (
    <footer className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total {entityType === 'quotation' ? 'Penawaran' : entityType === 'contract' ? 'Kontrak' : 'Invoice'}
          </span>
          <span className="text-2xl font-black text-[#1D1D1B]">Rp {formatCurrency(totalAmount)}</span>
        </div>

        <AnimatePresence>
          {totalAmount < totalMinAmount && !isLocked && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-2xl shadow-sm animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-red-600 uppercase tracking-tight">Quote Minimum Warning</span>
                <span className="text-sm font-black text-red-700">Rp {formatCurrency(totalMinAmount)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        {isLocked && onCreateRevision && (
          <button
            onClick={onCreateRevision}
            disabled={isPending || isContracted}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
              isContracted
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isContracted ? 'Tidak bisa revisi karena kontrak sudah terbit' : 'Buat revisi (V2)'}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {isContracted ? 'Revision Locked' : `Create Revision (V${(version || 1) + 1})`}
          </button>
        )}

        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isLocked ? 'Tutup' : 'Batalkan'}
        </button>

        {!isLocked && (
          <button
            onClick={onSave}
            disabled={isPending || isBelowMinAnyItem || totalAmount < totalMinAmount}
            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
              isBelowMinAnyItem || totalAmount < totalMinAmount
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#E30613] text-white hover:bg-red-700'
            }`}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        )}
      </div>
    </footer>
  )
}
