'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, CheckCircle } from 'lucide-react'
import { saveLeadEstimation } from '@/app/actions/leads'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toaster'

interface SaveLeadEstimationButtonProps {
  leadId: string
  data: {
    catalog_id: string | null
    total_hpp: number
    margin_percentage: number
    total_selling_price: number
    zone_id: string | null
    panjang?: number
    lebar?: number
    unit_qty?: number
    status?: string
    items?: any[]
  }
  disabled?: boolean
}

export default function SaveLeadEstimationButton({ 
  leadId, 
  data, 
  disabled = false 
}: SaveLeadEstimationButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    if (disabled || isPending) return

    startTransition(async () => {
      try {
        await saveLeadEstimation(leadId, data)
        setIsSuccess(true)
        toast.success('Estimasi berhasil disimpan ke lead')
        setTimeout(() => setIsSuccess(false), 3000)
        router.refresh()
      } catch (error: any) {
        console.error('Failed to save estimation:', error)
        toast.error('Gagal menyimpan estimasi', error.message || 'Terjadi kesalahan saat menyimpan data.')
      }
    })
  }

  return (
    <button
      onClick={handleSave}
      disabled={disabled || isPending}
      className={`w-full py-4 font-bold rounded-lg flex justify-center items-center gap-2 transition-all ${
        disabled 
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
          : isSuccess
            ? 'bg-green-500 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white shadow-lg active:scale-95'
      }`}
    >
      {isPending ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Menyimpan...
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle size={18} />
          Berhasil Disimpan!
        </>
      ) : (
        <>
          <Save size={18} />
          Simpan Estimasi ke Lead
        </>
      )}
    </button>
  )
}
