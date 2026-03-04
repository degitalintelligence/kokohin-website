'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface ConvertLeadToQuoteButtonProps {
  leadId: string
  initiallyConverted?: boolean
}

export default function ConvertLeadToQuoteButton({
  leadId,
  initiallyConverted,
}: ConvertLeadToQuoteButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hasQuote, setHasQuote] = useState<boolean>(!!initiallyConverted)

  const handleClick = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/convert-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId }),
      })

      const data = (await res.json()) as {
        success: boolean
        quotationId?: string
        alreadyConverted?: boolean
        error?: string
      }

      if (!data.success || !data.quotationId) {
        const msg = data.error || 'Gagal memproses quotation untuk lead ini'
        toast.error('Konversi gagal', msg)
        return
      }

      if (data.alreadyConverted) {
        toast.success('Lead sudah memiliki quotation, membuka editor')
      } else {
        toast.success('Berhasil', 'Lead berhasil dikonversi menjadi quotation')
      }

      setHasQuote(true)
      router.push(`/admin/quotes/${data.quotationId}/edit`)
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Terjadi kesalahan jaringan saat memproses quotation'
      console.error('Convert lead error:', error)
      toast.error('Konversi gagal', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
        isLoading
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[#E30613] text-white hover:bg-red-700 shadow-md'
      }`}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
      {hasQuote ? 'Lihat Quote' : isLoading ? 'Memproses...' : 'Convert to Quote'}
    </button>
  )
}
