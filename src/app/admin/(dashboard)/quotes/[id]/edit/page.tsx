import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuotationEditClient from '@/components/admin/QuotationEditClient'
import type { CostingItem } from '@/lib/utils/costing'

export default async function AdminQuoteEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: quotation, error } = await supabase
    .from('erp_quotations')
    .select('*, leads(*), erp_quotation_items(*)')
    .eq('id', id)
    .maybeSingle()

  if (error || !quotation) {
    console.error('Quotation not found or error:', error)
    return notFound()
  }

  const itemsRaw = (quotation as { erp_quotation_items?: Array<{
    id?: string
    name: string
    unit: string
    quantity: number
    unit_price: number
    subtotal: number
    type: string
    builder_costs?: CostingItem[]
    catalog_id?: string | null
    zone_id?: string | null
    panjang?: number | null
    lebar?: number | null
    unit_qty?: number | null
    markup_percentage?: number | null
    markup_flat_fee?: number | null
    atap_id?: string | null
    rangka_id?: string | null
    finishing_id?: string | null
    isian_id?: string | null
  }> }).erp_quotation_items || []

  const initialItems = itemsRaw.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    type: item.type,
    builder_costs: item.builder_costs || [],
    catalog_id: item.catalog_id || undefined,
    zone_id: item.zone_id || undefined,
    panjang: item.panjang ?? undefined,
    lebar: item.lebar ?? undefined,
    unit_qty: item.unit_qty ?? undefined,
    markup_percentage: item.markup_percentage ?? undefined,
    markup_flat_fee: item.markup_flat_fee ?? undefined,
    atap_id: item.atap_id,
    rangka_id: item.rangka_id,
    finishing_id: item.finishing_id,
    isian_id: item.isian_id,
  }))

  const customerPhone = (quotation as { leads?: { phone?: string | null } }).leads?.phone ?? null

  return (
    <QuotationEditClient
      quotationId={quotation.id as string}
      initialItems={initialItems}
      customerPhone={customerPhone}
      status={quotation.status}
      version={quotation.version}
    />
  )
}
