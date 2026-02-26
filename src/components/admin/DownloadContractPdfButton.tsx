'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, Loader2 } from 'lucide-react'
import { ContractPDF } from '@/components/admin/ContractPDF'
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

interface DownloadContractPdfButtonProps {
  contract: any
  logoUrl: string | null
}

export default function DownloadContractPdfButton({ contract: initialContract, logoUrl }: DownloadContractPdfButtonProps) {
  const [contract, setContract] = useState<any>(initialContract)
  const [loading, setLoading] = useState(false)

  // Re-fetch full contract data with relations for PDF
  const fetchFullData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('erp_contracts')
      .select('*, leads(*), quotations(*), erp_signatories(*)')
      .eq('id', initialContract.id)
      .single()
    
    if (data) {
      // Also fetch customer profile separately since it's linked via lead_id
      const { data: profile } = await supabase
        .from('erp_customer_profiles')
        .select('*')
        .eq('lead_id', data.leads?.id)
        .maybeSingle()
      
      setContract({ ...data, customer_profile: profile })
    }
    setLoading(false)
  }

  const fileName = `SPK_${contract.contract_number || '000'}_${(contract.leads?.name || 'Customer').replace(/\s+/g, '_')}.pdf`

  return (
    <div className="flex items-center gap-2">
      <PDFDownloadLink
        onClick={fetchFullData}
        document={
          <ContractPDF
            contract={contract}
            logoUrl={logoUrl}
          />
        }
        fileName={fileName}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-green-600 text-white hover:bg-green-700 shadow-sm"
      >
        {({ loading: pdfLoading }) => (
          <>
            {(pdfLoading || loading) ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown size={12} />}
            {(pdfLoading || loading) ? 'Wait...' : 'Download SPK'}
          </>
        )}
      </PDFDownloadLink>
    </div>
  )
}
