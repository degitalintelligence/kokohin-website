'use client'

import dynamic from 'next/dynamic'
import { FileDown, Loader2 } from 'lucide-react'
import { QuotationPDF } from '@/components/calculator/QuotationPDF'
import type { CalculatorResult } from '@/lib/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { 
    ssr: false,
    loading: () => (
      <button disabled className="px-6 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold flex items-center gap-2 cursor-not-allowed">
        <Loader2 className="w-4 h-4 animate-spin" />
        Menyiapkan PDF...
      </button>
    )
  }
)

interface DownloadLeadPdfButtonProps {
  lead: any
  estimation: any
  items: any[]
  logoUrl: string | null
}

export default function DownloadLeadPdfButton({ lead, estimation, items, logoUrl }: DownloadLeadPdfButtonProps) {
  const hasLeadPrice = Number(lead.total_selling_price || lead.original_selling_price || 0) > 0;
  const hasEstimation = !!estimation && items && items.length > 0;

  if (!hasEstimation && !hasLeadPrice) {
    return (
      <button 
        disabled 
        className="px-6 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold flex items-center gap-2 cursor-not-allowed"
        title="Belum ada data estimasi untuk lead ini"
      >
        <FileDown size={18} />
        PDF Tidak Tersedia
      </button>
    )
  }

  // Map estimation + items to CalculatorResult
  const result: CalculatorResult = {
    luas: (Number(lead.panjang) * Number(lead.lebar)) || Number(lead.unit_qty) || 0,
    unitUsed: lead.catalog?.base_price_unit || 'm2',
    totalHpp: hasEstimation ? Number(estimation.total_hpp) : Number(lead.total_hpp || 0),
    materialCost: 0, // Not explicitly used in simplified PDF
    wasteCost: 0, // Not explicitly used in simplified PDF
    marginPercentage: hasEstimation ? Number(estimation.margin_percentage) : Number(lead.margin_percentage || 30),
    markupPercentage: 0, // Already calculated in selling price
    flatFee: 0,
    totalSellingPrice: hasEstimation ? Number(estimation.total_selling_price) : Number(lead.total_selling_price || lead.original_selling_price || 0),
    estimatedPrice: hasEstimation ? Number(estimation.total_selling_price) : Number(lead.total_selling_price || lead.original_selling_price || 0),
    breakdown: hasEstimation ? items.map(item => ({
      name: item.material?.name || item.description || 'Item',
      qtyNeeded: Number(item.qty_needed),
      qtyCharged: Number(item.qty_charged),
      unit: item.material?.unit || item.unit || 'unit',
      pricePerUnit: Number(item.material?.base_price_per_unit || 0),
      subtotal: Number(item.subtotal)
    })) : [
      {
        name: lead.catalog?.title || 'Paket Pekerjaan',
        qtyNeeded: (Number(lead.panjang) * Number(lead.lebar)) || Number(lead.unit_qty) || 1,
        qtyCharged: (Number(lead.panjang) * Number(lead.lebar)) || Number(lead.unit_qty) || 1,
        unit: lead.catalog?.base_price_unit || 'unit',
        pricePerUnit: 0, // Not shown in summary PDF
        subtotal: Number(lead.total_selling_price || lead.original_selling_price || 0)
      }
    ]
  }

  const leadName = lead.name || 'Customer'
  const fileName = `Penawaran_Kokohin_${leadName.replace(/\s+/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      document={
        <QuotationPDF
          result={result}
          leadInfo={{ name: leadName, whatsapp: lead.phone || '' }}
          projectId={lead.id}
          zoneName={lead.zone?.name || null}
          logoUrl={logoUrl}
          specifications={result.breakdown?.map(item => item.name).join(', ') || 'Paket Pekerjaan Kanopi'}
          projectArea={result.luas}
          areaUnit={result.unitUsed === 'm2' ? 'm²' : result.unitUsed === 'm1' ? 'm¹' : 'unit'}
        />
      }
      fileName={fileName}
      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
    >
      {({ loading }) => (
        <>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown size={18} />}
          {loading ? 'Processing...' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
