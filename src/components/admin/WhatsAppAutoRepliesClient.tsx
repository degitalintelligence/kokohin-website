'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Save, X, Loader2, MessageCircle } from 'lucide-react'
import { AutoReplyTemplate, upsertAutoReplyTemplateAction, deleteAutoReplyTemplateAction } from '@/app/actions/whatsapp'
import { toast } from '@/components/ui/toaster'

interface WhatsAppAutoRepliesClientProps {
    initialTemplates: AutoReplyTemplate[]
}

export default function WhatsAppAutoRepliesClient({ initialTemplates }: WhatsAppAutoRepliesClientProps) {
    const [templates, setTemplates] = useState<AutoReplyTemplate[]>(initialTemplates)
    const [editing, setEditing] = useState<AutoReplyTemplate | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleAdd = () => {
        setEditing({
            code: 'AUTO_',
            title: '',
            body_template: '',
            is_active: true,
        })
    }

    const handleEdit = (tpl: AutoReplyTemplate) => {
        setEditing({ ...tpl })
    }

    const handleSave = () => {
        if (!editing) return
        if (!editing.code || !editing.code.toUpperCase().startsWith('AUTO_')) {
            toast.error('Gagal', 'Kode harus diawali dengan "AUTO_".')
            return
        }
        if (!editing.body_template.trim()) {
            toast.error('Gagal', 'Isi auto-reply tidak boleh kosong.')
            return
        }

        startTransition(async () => {
            const result = await upsertAutoReplyTemplateAction(editing)
            if (!result.success) {
                toast.error('Gagal', result.error ?? 'Gagal menyimpan template.')
                return
            }
            toast.success('Berhasil', 'Template auto-reply disimpan.')
            setEditing(null)
            window.location.reload()
        })
    }

    const handleDelete = (id?: string) => {
        if (!id) return
        if (!confirm('Hapus template auto-reply ini?')) return
        startTransition(async () => {
            const result = await deleteAutoReplyTemplateAction(id)
            if (!result.success) {
                toast.error('Gagal', result.error ?? 'Gagal menghapus template.')
                return
            }
            toast.success('Berhasil', 'Template dihapus.')
            setTemplates(prev => prev.filter(t => t.id !== id))
        })
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <MessageCircle size={22} className="text-[#25D366]" />
                        Auto-Reply WhatsApp
                    </h2>
                    <p className="text-sm text-gray-500">
                        Kelola template auto-reply berbasis keyword (harga, proyek, kontak, dll).
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1D1D1B] text-white rounded-xl font-bold hover:bg-black transition-all shadow-sm active:scale-95"
                >
                    <Plus size={18} />
                    Tambah Template
                </button>
            </div>

            {editing && (
                <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-lg text-gray-800 uppercase tracking-tight">
                            {editing.id ? 'Edit Template' : 'Template Baru'}
                        </h3>
                        <button
                            onClick={() => setEditing(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Kode (wajib diawali AUTO_)
                            </label>
                            <input
                                type="text"
                                value={editing.code}
                                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="AUTO_HARGA"
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Judul (internal)
                            </label>
                            <input
                                type="text"
                                value={editing.title}
                                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Auto-Reply Harga"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Isi Auto-Reply
                        </label>
                        <textarea
                            rows={4}
                            value={editing.body_template}
                            onChange={(e) => setEditing({ ...editing, body_template: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Teks yang akan dikirim otomatis ke customer..."
                        />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                            <input
                                type="checkbox"
                                checked={editing.is_active ?? true}
                                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Aktifkan auto-reply ini
                        </label>
                        <p className="text-[11px] text-gray-400">
                            Auto-reply dipicu ketika pesan customer mengandung keyword yang sesuai.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setEditing(null)}
                            className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="flex items-center gap-2 px-7 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Simpan Template
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tpl) => (
                    <div
                        key={tpl.id ?? tpl.code}
                        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="bg-emerald-50 p-3 rounded-xl">
                                <MessageCircle className="text-emerald-600" size={22} />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(tpl)}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(tpl.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-mono text-gray-700">
                                {tpl.code}
                            </span>
                            <span
                                className={`text-[10px] font-bold uppercase tracking-widest ${
                                    tpl.is_active ? 'text-emerald-600' : 'text-gray-400'
                                }`}
                            >
                                {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </div>
                        <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">
                            {tpl.title || tpl.code}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                            {tpl.body_template}
                        </p>
                    </div>
                ))}
                {templates.length === 0 && (
                    <div className="col-span-full text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-2xl p-6">
                        Belum ada template auto-reply. Klik &quot;Tambah Template&quot; untuk mulai menambahkan.
                    </div>
                )}
            </div>
        </div>
    )
}

