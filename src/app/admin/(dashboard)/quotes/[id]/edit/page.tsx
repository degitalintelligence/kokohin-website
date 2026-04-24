import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuotationEditClient from '@/components/admin/QuotationEditClient'
import { buildCostingItems, type CatalogCosting, type CostingItem, type HppComponent } from '@/lib/utils/costing'

type BaselineCostRow = {
  quotation_item_id: string
  component_key: string
  component_name: string
  segment: string
  unit_snapshot: string | null
  qty_snapshot: number
  hpp_snapshot: number
  subtotal_snapshot: number
  source_type: string
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toPositive = (value: unknown, fallback = 1): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

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

  const itemIds = itemsRaw
    .map((item) => item.id)
    .filter((itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0)

  let baselineRows: BaselineCostRow[] = []
  if (itemIds.length > 0) {
    const baselineResult = await supabase
      .from('erp_quotation_item_baseline_costs')
      .select('quotation_item_id, component_key, component_name, segment, unit_snapshot, qty_snapshot, hpp_snapshot, subtotal_snapshot, source_type')
      .in('quotation_item_id', itemIds)
      .order('created_at', { ascending: true })

    if (!baselineResult.error && baselineResult.data) {
      baselineRows = baselineResult.data as BaselineCostRow[]
    }
  }

  const baselineByItemId = new Map<string, BaselineCostRow[]>()
  baselineRows.forEach((row) => {
    const current = baselineByItemId.get(row.quotation_item_id) ?? []
    current.push(row)
    baselineByItemId.set(row.quotation_item_id, current)
  })

  const missingBaselineItems = itemsRaw.filter(
    (item) =>
      (!item.id || (baselineByItemId.get(item.id) ?? []).length === 0) &&
      typeof item.catalog_id === 'string' &&
      item.catalog_id.length > 0,
  )
  const uniqueCatalogIds = Array.from(new Set(missingBaselineItems.map((item) => item.catalog_id as string)))

  const catalogsById = new Map<string, CatalogCosting>()
  if (uniqueCatalogIds.length > 0) {
    const { data: catalogsData } = await supabase
      .from('catalogs')
      .select('id, title, base_price_per_m2, base_price_unit, labor_cost, transport_cost, margin_percentage, hpp_per_unit, atap_id, rangka_id, finishing_id, isian_id, use_std_calculation, std_calculation, atap:atap_id(name, variant_name, unit, base_price_per_unit, length_per_unit), rangka:rangka_id(name, variant_name, unit, base_price_per_unit, length_per_unit), finishing:finishing_id(name, variant_name, unit, base_price_per_unit, length_per_unit), isian:isian_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
      .in('id', uniqueCatalogIds)
    ;(catalogsData || []).forEach((catalog) => {
      catalogsById.set(String((catalog as { id?: string }).id ?? ''), catalog as unknown as CatalogCosting)
    })
  }

  const hppComponentsByCatalog = new Map<string, HppComponent[]>()
  if (uniqueCatalogIds.length > 0) {
    const primary = await supabase
      .from('catalog_hpp_components')
      .select('id, catalog_id, material_id, quantity, section, calculation_mode, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
      .in('catalog_id', uniqueCatalogIds)
    const fallback = primary.error
      ? await supabase
          .from('catalog_hpp_components')
          .select('id, catalog_id, material_id, quantity, section, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
          .in('catalog_id', uniqueCatalogIds)
      : null
    const hppData = (primary.error ? fallback?.data : primary.data) || []
    ;(hppData as Array<Record<string, unknown>>).forEach((row) => {
      const catalogId = String(row.catalog_id ?? '')
      if (!catalogId) return
      const current = hppComponentsByCatalog.get(catalogId) ?? []
      current.push(row as unknown as HppComponent)
      hppComponentsByCatalog.set(catalogId, current)
    })
  }

  const catalogFallbackBaselineByItemId = new Map<string, BaselineCostRow[]>()
  missingBaselineItems.forEach((item) => {
    if (!item.id || !item.catalog_id) return
    const catalog = catalogsById.get(item.catalog_id)
    if (!catalog) return
    const computed = buildCostingItems(
      catalog,
      {
        panjang: toNumber(item.panjang),
        lebar: toNumber(item.lebar),
        unitQty: toPositive(item.unit_qty, 1),
      },
      item.type === 'manual' && !item.catalog_id,
      hppComponentsByCatalog.get(item.catalog_id) || [],
    )
    const rows: BaselineCostRow[] = computed
      .filter((cost) => !String(cost.id || '').startsWith('addon-') && !String(cost.id || '').startsWith('override-'))
      .map((cost, idx) => ({
        quotation_item_id: item.id || '',
        component_key: String(cost.id || `${item.id || 'item'}-catalog-${idx + 1}`),
        component_name: String(cost.name || `Komponen ${idx + 1}`),
        segment: String(cost.type || 'lainnya'),
        unit_snapshot: String(cost.unit || 'unit'),
        qty_snapshot: toNumber(cost.qtyCharged ?? cost.qtyNeeded),
        hpp_snapshot: toNumber(cost.hpp),
        subtotal_snapshot: toNumber(cost.subtotal),
        source_type: 'catalog',
      }))
    if (rows.length > 0) {
      catalogFallbackBaselineByItemId.set(item.id, rows)
    }
  })

  const initialItems = itemsRaw.map((item) => {
    const dbBaseline = item.id ? (baselineByItemId.get(item.id) ?? []) : []
    const catalogBaseline = item.id ? (catalogFallbackBaselineByItemId.get(item.id) ?? []) : []
    const fallbackBaseline: BaselineCostRow[] = dbBaseline.length > 0
      ? dbBaseline
      : catalogBaseline.length > 0
        ? catalogBaseline
      : (item.builder_costs || []).map((cost, idx) => ({
          quotation_item_id: item.id || '',
          component_key: String(cost.id || `${item.id || 'item'}-seed-${idx + 1}`),
          component_name: String(cost.name || `Komponen ${idx + 1}`),
          segment: String(cost.type || 'lainnya'),
          unit_snapshot: String(cost.unit || 'unit'),
          qty_snapshot: toNumber(cost.qtyCharged ?? cost.qtyNeeded),
          hpp_snapshot: toNumber(cost.hpp),
          subtotal_snapshot: toNumber(cost.subtotal),
          source_type: String((cost.id || '').startsWith('addon-') ? 'addon' : 'catalog'),
      }))

    return {
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
    baseline_costs: fallbackBaseline,
  }
  })

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
