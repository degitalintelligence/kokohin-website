'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, Loader2 } from 'lucide-react'
import { InvoicePDF } from '@/components/admin/InvoicePDF'
import { createClient } from '@/lib/supabase/client'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { 
    ssr: false,
    loading: () => (
      <button disabled className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-not-allowed">
        <Loader2 className="w-3 h-3 animate-spin" />
        PDF...
      </button>
    )
  }
)

interface InvoiceData {
  id: string
  invoice_number?: string
  erp_contracts?: {
    erp_quotations?: {
      leads?: {
        name?: string
      }
    }
  }
}

interface DownloadInvoicePdfButtonProps {
  invoice: InvoiceData
  logoUrl: string | null
}

export default function DownloadInvoicePdfButton({ invoice: initialInvoice, logoUrl }: DownloadInvoicePdfButtonProps) {
  const [invoice, setInvoice] = useState<InvoiceData>(initialInvoice)
  const [loading, setLoading] = useState(false)

  const fetchFullData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('erp_invoices')
      .select('*, erp_contracts(*, erp_quotations(*, leads(*))), erp_invoice_items(*)')
      .eq('id', initialInvoice.id)
      .single()
    if (data) setInvoice(data)
    setLoading(false)
  }

  const fileName = `Invoice_${invoice.invoice_number || '000'}_${(invoice.erp_contracts?.erp_quotations?.leads?.name || 'Customer').replace(/\s+/g, '_')}.pdf`

  return (
    <PDFDownloadLink
      onClick={fetchFullData}
      document={
        <InvoicePDF
          invoice={invoice}
          logoUrl={logoUrl}
        />
      }
      fileName={fileName}
      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
    >
      {({ loading: pdfLoading }) => (
        <>
          {(pdfLoading || loading) ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown size={12} />}
          {(pdfLoading || loading) ? 'Wait...' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
