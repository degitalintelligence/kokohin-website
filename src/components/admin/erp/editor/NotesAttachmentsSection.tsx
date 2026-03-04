'use client'

import { ExternalLink, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import type { ChangeEvent } from 'react'
import type { Attachment } from './types'

interface NotesAttachmentsSectionProps {
  notes: string
  attachments: Attachment[]
  isUploading: boolean
  isLocked?: boolean
  onChangeNotes: (value: string) => void
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void
  onRemoveAttachment: (idx: number) => void
}

export default function NotesAttachmentsSection({
  notes,
  attachments,
  isUploading,
  isLocked,
  onChangeNotes,
  onFileUpload,
  onRemoveAttachment,
}: NotesAttachmentsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <FileText size={12} className="text-gray-400" /> Catatan Internal / Syarat & Ketentuan Khusus
        </label>
        <textarea
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          readOnly={isLocked}
          placeholder="Tambahkan catatan khusus untuk penawaran ini (akan muncul di PDF)..."
          rows={4}
          className={`w-full px-4 py-2 border rounded-xl text-xs font-medium focus:outline-none transition-all resize-none ${
            isLocked
              ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-default'
              : 'bg-gray-50 border-gray-200 text-gray-700 focus:ring-1 focus:ring-[#E30613]'
          }`}
        />
      </div>

      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <ImageIcon size={12} className="text-gray-400" /> Gambar Referensi / Lampiran
          </label>
          {!isLocked && (
            <div className="relative">
              <input
                type="file"
                onChange={onFileUpload}
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#E30613]/10 text-[#E30613] rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-[#E30613]/20 transition-all">
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload Gambar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
              <Image src={file.url} alt={file.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-all"
                >
                  <ExternalLink size={14} />
                </a>
                {!isLocked && (
                  <button
                    onClick={() => onRemoveAttachment(idx)}
                    className="p-1.5 bg-white rounded-lg text-gray-700 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {attachments.length === 0 && (
            <div className="col-span-full py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl opacity-40">
              <ImageIcon size={24} className="text-gray-400 mb-2" />
              <p className="text-[9px] font-black text-gray-400 uppercase">Belum ada lampiran</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
