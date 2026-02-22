'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { generateAndDownloadQuotation, type PdfQuotationData } from '@/lib/pdf-generator'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/calculator'

interface GeneratePdfButtonProps {
  projectId: string
  disabled?: boolean
  className?: string
}

export default function GeneratePdfButton({ projectId, disabled = false, className = '' }: GeneratePdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGeneratePdf = async () => {
    if (!projectId) return
    
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // 1. Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('erp_projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        throw new Error(`Proyek tidak ditemukan: ${projectError?.message}`)
      }

      // 2. Fetch latest estimation for this project
      const { data: estimation, error: estimationError } = await supabase
        .from('estimations')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (estimationError) {
        throw new Error(`Gagal mengambil data estimasi: ${estimationError.message}`)
      }

      if (!estimation) {
        throw new Error('Belum ada estimasi untuk proyek ini')
      }

      // 3. Fetch estimation items with material details
      const { data: items, error: itemsError } = await supabase
        .from('estimation_items')
        .select('*, material:material_id(*)')
        .eq('estimation_id', estimation.id)
        .order('created_at', { ascending: true })

      if (itemsError) {
        throw new Error(`Gagal mengambil item estimasi: ${itemsError.message}`)
      }

      const [
        { data: paymentTermsData, error: paymentTermsError },
        { data: logoSetting },
      ] = await Promise.all([
        supabase
          .from('payment_terms')
          .select('*')
          .eq('estimation_id', estimation.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'logo_url')
          .maybeSingle(),
      ])

      if (paymentTermsError) {
        console.warn('Gagal mengambil payment terms, menggunakan default:', paymentTermsError.message)
      }

      const paymentTerms = paymentTermsData && paymentTermsData.length > 0
        ? paymentTermsData.map(term => `${term.term_name} ${term.percentage}%: ${formatRupiah(term.amount_due)}`)
        : [
            'DP 50% saat kontrak ditandatangani',
            'Pelunasan 50% saat material tiba di lokasi',
            'Pembayaran via transfer bank (BCA/Mandiri/BNI)',
            'Quotation berlaku 14 hari dari tanggal diterbitkan',
            'Harga sudah termasuk PPN 11%',
            'Garansi konstruksi 2 tahun, material 5 tahun'
          ]

      const typedLogo = logoSetting as { value?: string } | null

      const pdfData: PdfQuotationData = {
        project,
        estimation,
        items: items ?? [],
        paymentTerms,
        logoUrl: typedLogo?.value ?? null
      }

      // 5. Generate and download PDF
      await generateAndDownloadQuotation(pdfData)
      
    } catch (err) {
      console.error('PDF generation error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan PDF quotation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleGeneratePdf}
        disabled={disabled || loading || !projectId}
        className={`w-full py-4 bg-white text-[#1D1D1B] font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Membuat PDF...</span>
          </>
        ) : (
          <>
            <Download size={18} />
            <span>Generate PDF Quotation V1</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <p className="text-xs text-red-600 mt-1">
            Pastikan proyek memiliki estimasi dan item yang valid.
          </p>
        </div>
      )}
    </div>
  )
}
