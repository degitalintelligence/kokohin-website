'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, Loader2 } from 'lucide-react'
import { QuotationPDF } from '@/components/calculator/QuotationPDF'
import type { CalculatorResult } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { formatZoneName } from '@/lib/zone'
import { normalizeQuotationNumber, normalizeAddressForSalutation, normalizeImageUrl, verifyImageUrlExists } from '@/lib/quotation-pdf-helpers'

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

interface AttachmentPayload {
  url: string
  name?: string
  type?: string
  created_at?: string
}

interface QuotationPdfItem {
  name: string
  unit: string
  quantity: number
  unit_price: number
  subtotal: number
  catalog_id?: string
  catalog?: {
    image_url?: string | null
  }
  image_url?: string | null
  rangka?: { name?: string }
  isian?: { name?: string }
  atap?: { name?: string }
  finishing?: { name?: string }
  builder_costs?: { name?: string; type?: string; section?: string }[]
}

interface PaymentTermsForPdf {
  name: string
  terms_json: {
    t1_percent: number
    t2_percent: number
    t3_percent: number
    t1_desc?: string
    t2_desc?: string
    t3_desc?: string
  }
} 

interface QuotationData {
  id: string
  lead_id?: string
  status?: string
  quotation_number?: string
  total_amount?: number
  total_hpp?: number
  margin_percentage?: number
  panjang?: number
  lebar?: number
  unit_qty?: number
  client_address?: string
  notes?: string
  attachments?: AttachmentPayload[]
  leads?: {
    id?: string
    name?: string
    phone?: string
    location?: string
  }
  zones?: {
    name?: string
  }
  catalogs?: {
    base_price_unit?: string
    image_url?: string | null
  }
  erp_quotation_items?: QuotationPdfItem[]
  erp_payment_terms?: PaymentTermsForPdf | null
  customer_profile?: {
    address?: string
  } | null
}

interface GeneratePdfButtonProps {
  quotation?: QuotationData
  projectId?: string
  logoUrl?: string | null
  disabled?: boolean
  className?: string
}

export default function GeneratePdfButton({ quotation: initialQuotation, projectId, logoUrl: initialLogoUrl, disabled, className }: GeneratePdfButtonProps) {
  const [quotation, setQuotation] = useState<QuotationData | undefined>(initialQuotation)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null)
  const [loading, setLoading] = useState(!initialQuotation && !!projectId)
  const [verifiedImages, setVerifiedImages] = useState<Record<string, string | null>>({})
  const [isCheckingImages, setIsCheckingImages] = useState(false)

  const enrichCustomerProfile = async (baseQuotation: QuotationData | null) => {
    if (!baseQuotation) return baseQuotation
    const leadId = baseQuotation.lead_id || baseQuotation.leads?.id
    if (!leadId) return baseQuotation
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('erp_customer_profiles')
      .select('address')
      .eq('lead_id', leadId)
      .maybeSingle()
    return { ...baseQuotation, customer_profile: profile || null }
  }

  useEffect(() => {
    if (!initialQuotation && projectId) {
      async function fetchData() {
        setLoading(true)
        const supabase = createClient()
        
        // Fetch logo if not provided
        if (!initialLogoUrl) {
          const { data: siteSettings } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'logo_url')
            .maybeSingle()
          setLogoUrl(siteSettings?.value || null)
        }

        // Fetch quotation for this project
        const { data: qtnData } = await supabase
          .from('erp_quotations')
          .select('*, leads(*), zones(*), catalogs(*), erp_quotation_items(*, atap:atap_id(name), rangka:rangka_id(name), finishing:finishing_id(name), isian:isian_id(name), catalog:catalog_id(image_url)), erp_payment_terms(*)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        const enriched = await enrichCustomerProfile(qtnData)
        setQuotation(enriched || undefined)
        setLoading(false)
      }
      fetchData()
    }
  }, [initialQuotation, projectId, initialLogoUrl])

  useEffect(() => {
    if (!initialQuotation) return
    let isMounted = true
    ;(async () => {
      const enriched = await enrichCustomerProfile(initialQuotation)
      if (isMounted) setQuotation(enriched || initialQuotation)
    })()
    return () => {
      isMounted = false
    }
  }, [initialQuotation])

  useEffect(() => {
    async function verifyImages() {
      if (!quotation?.erp_quotation_items || quotation.erp_quotation_items.length === 0) {
        setVerifiedImages({})
        return
      }
      setIsCheckingImages(true)
      const checks = await Promise.all(
        quotation.erp_quotation_items.map(async (item, idx) => {
          const key = `${item.catalog_id || 'item'}-${idx}`
          const candidate = normalizeImageUrl(item.catalog?.image_url || null)
          if (!candidate) return [key, null] as const
          const exists = await verifyImageUrlExists(candidate)
          return [key, exists ? candidate : null] as const
        })
      )
      setVerifiedImages(Object.fromEntries(checks))
      setIsCheckingImages(false)
    }
    verifyImages()
  }, [quotation])

  if (loading) {
    return (
      <button disabled className={`px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading...
      </button>
    )
  }

  if (!quotation || !quotation.erp_quotation_items || quotation.erp_quotation_items.length === 0) {
    return (
      <button 
        disabled 
        className={`px-3 py-1.5 bg-gray-50 text-gray-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed border border-gray-100 ${className}`}
      >
        <FileDown size={12} />
        PDF N/A
      </button>
    )
  }

  const items = quotation.erp_quotation_items || []
  const lead = quotation.leads || {}
  const attachments = quotation.attachments || []
  
  // Map ERP items to CalculatorResult for the PDF component
  const filteredItems = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      const name = (item.name || '').toLowerCase()
      return !name.includes('markup') && !name.includes('mark-up')
    })
    .map(({ item, idx }) => ({
      ...item,
      image_url: verifiedImages[`${item.catalog_id || 'item'}-${idx}`] || null
    }))

  const result: CalculatorResult = {
    luas: (Number(quotation.panjang) * Number(quotation.lebar)) || Number(quotation.unit_qty) || 0,
    unitUsed: (quotation.catalogs?.base_price_unit as 'm2' | 'm1' | 'unit' | undefined) || 'm2',
    totalHpp: Number(quotation.total_hpp || 0),
    materialCost: 0,
    wasteCost: 0,
    marginPercentage: Number(quotation.margin_percentage || 30),
    markupPercentage: 0,
    flatFee: 0,
    totalSellingPrice: Number(quotation.total_amount),
    estimatedPrice: Number(quotation.total_amount),
    breakdown: filteredItems.map((item: { name?: string; quantity?: number; unit?: string; unit_price?: number; subtotal?: number; image_url?: string | null }) => ({
      name: item.name || '',
      qtyNeeded: Number(item.quantity),
      qtyCharged: Number(item.quantity),
      unit: item.unit || 'unit',
      pricePerUnit: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      image_url: item.image_url || null
    }))
  }

  const fileName = `Quotation_${quotation.quotation_number}_${(lead.name || 'Customer').replace(/\s+/g, '_')}.pdf`
  const quotationNumber = normalizeQuotationNumber(quotation.quotation_number, quotation.id)
  const customerAddress = normalizeAddressForSalutation(quotation.customer_profile?.address || lead.location || quotation.client_address || '')

  return (
    <PDFDownloadLink
      document={
        <QuotationPDF
          result={result}
          leadInfo={{ 
            name: lead.name || 'Customer', 
            whatsapp: lead.phone || '',
            address: customerAddress
          }}
          projectId={quotation.id}
          quotationNumber={quotationNumber}
          zoneName={formatZoneName(quotation.zones?.name || null) || null}
          logoUrl={logoUrl}
          attachments={attachments}
          paymentTerms={quotation.erp_payment_terms}
          items={filteredItems}
          isDraft={quotation.status !== 'approved'}
        />
      }
      fileName={fileName}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 bg-blue-600 text-white hover:bg-blue-700 shadow-sm ${disabled || isCheckingImages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
    >
      {({ loading: linkLoading }) => (
        <>
          {linkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown size={12} />}
          {linkLoading || isCheckingImages ? 'Wait...' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
