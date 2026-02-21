'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { createEstimation } from '@/app/actions/estimations'

type Props = {
  projectId: string | null
  totalHpp: number
  marginPercentage: number
  totalSellingPrice: number
  disabled?: boolean
}

export default function CreateEstimationV1Button({
  projectId,
  totalHpp,
  marginPercentage,
  totalSellingPrice,
  disabled,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDisabled = disabled || !projectId || loading

  const handleClick = async () => {
    if (!projectId || isDisabled) return

    try {
      setError(null)
      setLoading(true)

      await createEstimation(projectId, {
        total_hpp: totalHpp,
        margin_percentage: marginPercentage,
        total_selling_price: totalSellingPrice,
        status: 'draft',
      })

      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? '')
      const normalized = message.toLowerCase()
      const isDuplicateV1 =
        normalized.includes('estimasi v1 untuk proyek ini sudah ada') ||
        normalized.includes('unique_estimations_project_version') ||
        normalized.includes('duplicate key') ||
        normalized.includes('unique constraint')

      if (isDuplicateV1) {
        setError('Estimasi V1 untuk proyek ini sudah pernah dibuat. Silakan cek riwayat estimasi di detail proyek.')
      } else {
        setError('Gagal menyimpan estimasi. Silakan coba lagi atau cek koneksi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors shadow-md ${
          isDisabled
            ? 'bg-gray-500 text-white cursor-not-allowed'
            : 'bg-white text-[#1D1D1B] hover:bg-gray-100'
        }`}
      >
        <Download size={18} className={!isDisabled ? 'text-[#E30613]' : ''} />
        {loading
          ? 'Menyimpan Estimasi...'
          : isDisabled
            ? 'Estimasi V1 sudah tersimpan'
            : 'Simpan Estimasi V1'}
      </button>
      {error && (
        <div className="text-xs text-red-400 text-center font-medium">
          {error}
        </div>
      )}
    </div>
  )
}
