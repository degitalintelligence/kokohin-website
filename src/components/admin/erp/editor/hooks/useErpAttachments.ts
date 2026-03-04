import { useState, type ChangeEvent } from 'react'
import { toast } from '@/components/ui/toaster'
import type { Attachment } from '../types'

interface UseErpAttachmentsParams {
  entityId: string
}

export function useErpAttachments({ entityId }: UseErpAttachmentsParams) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const fileExt = file.name.split('.').pop()
      const fileName = `${entityId}/${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('erp-attachments')
        .upload(fileName, file)

      if (error) {
        if (error.message?.includes('bucket_not_found') || error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "erp-attachments" belum dibuat atau tidak dapat diakses. Silakan hubungi admin.')
        }
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('erp-attachments')
        .getPublicUrl(data.path)

      setAttachments((prev) => [...prev, {
        name: file.name,
        url: publicUrl,
        type: 'reference',
        created_at: new Date().toISOString()
      }])

      toast.success('Berhasil', 'Gambar referensi berhasil diunggah.')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal'
      console.error('Upload failed:', err)
      toast.error('Gagal', `Gagal mengunggah gambar. ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  return {
    attachments,
    setAttachments,
    isUploading,
    handleFileUpload,
    removeAttachment,
  }
}
