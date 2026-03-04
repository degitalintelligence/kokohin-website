'use client'

import { useState } from 'react'
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

interface ContractData {
  id: string
  status?: string
  quotation_id?: string
  contract_number?: string
  erp_quotations?: {
    lead_id?: string
    quotation_number?: string
    leads?: {
      id?: string
      name?: string
      phone?: string
      location?: string
      address?: string
    }
  }
  customer_profile?: {
    name?: string
    ktp_number?: string
    address?: string
    phone?: string
  }
}

interface DownloadContractPdfButtonProps {
  contract: ContractData
  logoUrl: string | null
}

export default function DownloadContractPdfButton({ contract: initialContract, logoUrl }: DownloadContractPdfButtonProps) {
  const [contract, setContract] = useState<ContractData>(initialContract)
  const [loading, setLoading] = useState(false)
  const [isPrepared, setIsPrepared] = useState(false)

  // Re-fetch full contract data with relations for PDF
  const fetchFullData = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('erp_contracts')
      .select('*, erp_quotations(*, leads(*)), erp_signatories(*)')
      .eq('id', initialContract.id)
      .single()
    
    if (data) {
      let quotation = data.erp_quotations
      if (!quotation && data.quotation_id) {
        const { data: quotationData } = await supabase
          .from('erp_quotations')
          .select('*, leads(*)')
          .eq('id', data.quotation_id)
          .maybeSingle()
        quotation = quotationData || undefined
      }

      // Also fetch customer profile separately since it's linked via lead_id
      const leadId = quotation?.lead_id || quotation?.leads?.id
      const { data: profile } = await supabase
        .from('erp_customer_profiles')
        .select('*')
        .eq('lead_id', leadId || '')
        .maybeSingle()
      
      setContract({ ...data, erp_quotations: quotation, customer_profile: profile })
      setIsPrepared(true)
    }
    setLoading(false)
  }

  const customerName = contract.customer_profile?.name || contract.erp_quotations?.leads?.name || 'Customer'
  const fileName = `SPK_${contract.contract_number || '000'}_${customerName.replace(/\s+/g, '_')}.pdf`

  return (
    <div className="flex items-center gap-2">
      {!isPrepared ? (
        <button
          onClick={fetchFullData}
          disabled={loading}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm ${
            loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown size={12} />}
          {loading ? 'Wait...' : 'Siapkan SPK'}
        </button>
      ) : (
        <PDFDownloadLink
          document={
            <ContractPDF
              contract={contract}
              logoUrl={logoUrl}
              isDraft={contract.status === 'draft'}
            />
          }
          fileName={fileName}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm bg-green-600 text-white hover:bg-green-700"
        >
          {({ loading: pdfLoading }) => (
            <>
              {(pdfLoading || loading) ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown size={12} />}
              {(pdfLoading || loading) ? 'Wait...' : 'Download SPK'}
            </>
          )}
        </PDFDownloadLink>
      )}
    </div>
  )
}
