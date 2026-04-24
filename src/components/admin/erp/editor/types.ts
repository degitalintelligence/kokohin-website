import type { CatalogCosting as CostingCatalogCosting, CostingItem } from '@/lib/utils/costing'

export type CatalogCosting = CostingCatalogCosting & {
  image_url?: string | null
}

export interface ErpItem {
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

export interface CustomerProfile {
  name?: string
  phone?: string
  email?: string
  address?: string
  ktp_number?: string
  min_price_per_m2?: number
  tier?: string
}

export interface Zone {
  id: string
  name: string
  markup_percentage: number
  flat_fee: number
}

export interface PaymentTerm {
  id: string
  name: string
  is_default?: boolean
}

export interface Attachment {
  name: string
  url: string
  type: string
  created_at: string
}

export interface Catalog {
  id: string
  title: string
  image_url?: string | null
  base_price_unit?: string
  base_price_per_m2?: number
  atap_id?: string | null
  rangka_id?: string | null
  finishing_id?: string | null
  isian_id?: string | null
}

export interface CatalogHppComponent {
  id: string
  catalog_id: string
  material_id: string
  quantity: number
  calculation_mode?: 'variable' | 'fixed'
  material: {
    name: string
    variant_name?: string | null
    unit: string
    base_price_per_unit: number
    length_per_unit?: number | null
  }
}

export interface LeadData {
  id: string
  name: string | null
  phone: string | null
  location: string | null
}
