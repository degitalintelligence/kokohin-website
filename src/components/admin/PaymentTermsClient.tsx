'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Save, X, AlertCircle, Loader2 } from 'lucide-react'
import { upsertPaymentTerm, deletePaymentTerm } from '@/app/actions/payment-terms'
import { toast } from '@/components/ui/toaster'

interface PaymentTerm {
  id?: string
  name: string
  description: string
  terms_json: { percent: number, label: string }[]
  is_active: boolean
}

interface PaymentTermsClientProps {
  initialData: any[]
}

export default function PaymentTermsClient({ initialData }: PaymentTermsClientProps) {
  const [terms, setTerms] = useState<PaymentTerm[]>(initialData)
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    setEditingTerm({
      name: '',
      description: '',
      terms_json: [
        { percent: 50, label: 'DP 50%' },
        { percent: 40, label: 'Progress 40%' },
        { percent: 10, label: 'Pelunasan 10%' }
      ],
      is_active: true
    })
  }

  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm({ ...term })
  }

  const handleSave = () => {
    if (!editingTerm) return
    if (!editingTerm.name) {
      toast.error('Gagal', 'Nama payment term wajib diisi.')
      return
    }

    const totalPercent = editingTerm.terms_json.reduce((acc, t) => acc + t.percent, 0)
    if (totalPercent !== 100) {
      toast.error('Gagal', `Total persentase harus 100% (saat ini ${totalPercent}%).`)
      return
    }

    startTransition(async () => {
      try {
        await upsertPaymentTerm(editingTerm)
        toast.success('Berhasil', 'Payment term berhasil disimpan.')
        setEditingTerm(null)
        // Refresh local state (simplified, better use router.refresh or react-query)
        window.location.reload()
      } catch (error: any) {
        toast.error('Gagal', error.message || 'Terjadi kesalahan saat menyimpan.')
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus payment term ini?')) return
    
    try {
      await deletePaymentTerm(id)
      toast.success('Berhasil', 'Payment term berhasil dihapus.')
      window.location.reload()
    } catch (error: any) {
      toast.error('Gagal', error.message || 'Gagal menghapus.')
    }
  }

  const handleTermChange = (idx: number, field: 'percent' | 'label', value: any) => {
    if (!editingTerm) return
    const newTermsJson = [...editingTerm.terms_json]
    newTermsJson[idx] = { ...newTermsJson[idx], [field]: value }
    setEditingTerm({ ...editingTerm, terms_json: newTermsJson })
  }

  const addSubTerm = () => {
    if (!editingTerm) return
    setEditingTerm({
      ...editingTerm,
      terms_json: [...editingTerm.terms_json, { percent: 0, label: 'Termin Baru' }]
    })
  }

  const removeSubTerm = (idx: number) => {
    if (!editingTerm) return
    setEditingTerm({
      ...editingTerm,
      terms_json: editingTerm.terms_json.filter((_, i) => i !== idx)
    })
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Payment Terms</h2>
          <p className="text-sm text-gray-500">Kelola skema termin pembayaran untuk penawaran dan kontrak.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D1D1B] text-white rounded-xl font-bold hover:bg-black transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Tambah Skema
        </button>
      </div>

      {editingTerm && (
        <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg text-gray-800 uppercase tracking-tight">
              {editingTerm.id ? 'Edit Skema' : 'Skema Baru'}
            </h3>
            <button onClick={() => setEditingTerm(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Skema</label>
              <input 
                type="text" 
                value={editingTerm.name}
                onChange={(e) => setEditingTerm({ ...editingTerm, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Misal: Standard 50-40-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan Singkat</label>
              <input 
                type="text" 
                value={editingTerm.description}
                onChange={(e) => setEditingTerm({ ...editingTerm, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Misal: Untuk proyek kanopi standard"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rincian Termin</label>
              <button 
                onClick={addSubTerm}
                className="text-[10px] font-black text-blue-600 uppercase hover:underline"
              >
                + Tambah Termin
              </button>
            </div>
            
            <div className="space-y-3">
              {editingTerm.terms_json.map((t, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                  <div className="flex-1">
                    <input 
                      type="text"
                      value={t.label}
                      onChange={(e) => handleTermChange(idx, 'label', e.target.value)}
                      className="w-full bg-transparent font-bold text-gray-700 outline-none"
                      placeholder="Label (misal: Down Payment)"
                    />
                  </div>
                  <div className="w-24 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                    <input 
                      type="number"
                      value={t.percent}
                      onChange={(e) => handleTermChange(idx, 'percent', parseInt(e.target.value))}
                      className="w-full text-right font-black text-blue-600 outline-none"
                    />
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                  <button 
                    onClick={() => removeSubTerm(idx)}
                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <AlertCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-tight">
                Total: {editingTerm.terms_json.reduce((acc, t) => acc + (t.percent || 0), 0)}%
              </span>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={() => setEditingTerm(null)}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Simpan Skema
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {terms.map((term) => (
          <div key={term.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Save className="text-blue-600" size={24} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(term)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => term.id && handleDelete(term.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h4 className="font-black text-gray-900 uppercase tracking-tight mb-1">{term.name}</h4>
            <p className="text-xs text-gray-500 mb-6">{term.description}</p>

            <div className="space-y-2">
              {term.terms_json.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-wider">{t.label}</span>
                  <span className="font-black text-gray-900">{t.percent}%</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${term.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {term.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
