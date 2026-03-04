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
  material: {
    name: string
    unit: string
    base_price_per_unit: number
  }
}

export interface LeadData {
  id: string
  name: string | null
  phone: string | null
  location: string | null
}
