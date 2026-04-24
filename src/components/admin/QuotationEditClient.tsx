'use client'

import { useRouter } from 'next/navigation'
import ErpItemEditor from '@/components/admin/ErpItemEditor'
import type { CostingItem } from '@/lib/utils/costing'
import { createQuotationRevision } from '@/app/actions/quotations'

interface QuotationEditItem {
  id?: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  subtotal: number
  type: string
  builder_costs?: CostingItem[]
  catalog_id?: string
  zone_id?: string
  panjang?: number
  lebar?: number
  unit_qty?: number
  markup_percentage?: number
  markup_flat_fee?: number
  atap_id?: string | null
  rangka_id?: string | null
  finishing_id?: string | null
  isian_id?: string | null
  baseline_costs?: Array<{
    quotation_item_id: string
    component_key: string
    component_name: string
    segment: string
    unit_snapshot: string | null
    qty_snapshot: number
    hpp_snapshot: number
    subtotal_snapshot: number
    source_type: string
  }>
}

interface QuotationEditClientProps {
  quotationId: string
  initialItems: QuotationEditItem[]
  customerPhone?: string | null
  status?: string
  version?: number
}

export default function QuotationEditClient({
  quotationId,
  initialItems,
  customerPhone,
  status,
  version,
}: QuotationEditClientProps) {
  const router = useRouter()

  const handleCreateRevision = async () => {
    try {
      const result = await createQuotationRevision(quotationId)
      if (result.success) {
        router.push(`/admin/quotes/${result.quotationId}/edit`)
      }
    } catch (error: unknown) {
      console.error('Revision error:', error)
    }
  }

  return (
    <ErpItemEditor
      entityId={quotationId}
      entityType="quotation"
      initialItems={initialItems}
      customerPhone={customerPhone || undefined}
      status={status}
      version={version}
      onClose={() => router.push('/admin/erp')}
      onCreateRevision={handleCreateRevision}
    />
  )
}
