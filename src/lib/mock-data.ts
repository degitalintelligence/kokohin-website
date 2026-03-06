import type { CalculatorResult } from '@/lib/types'

export const mockResultData: CalculatorResult & { isCustom?: boolean } = {
  luas: 15,
  materialCost: 7500000,
  wasteCost: 750000,
  totalHpp: 8250000,
  marginPercentage: 30,
  markupPercentage: 10,
  flatFee: 500000,
  totalSellingPrice: 12200000,
  estimatedPrice: 12200000,
  breakdown: [
    {
      name: 'Material Utama - Rangka',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 3500000,
      subtotal: 3500000
    },
    {
      name: 'Material Utama - Atap',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 2800000,
      subtotal: 2800000
    },
    {
      name: 'Material Tambahan',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 1200000,
      subtotal: 1200000
    },
    {
      name: 'Waste Material (10%)',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 750000,
      subtotal: 750000
    },
    {
      name: 'Markup Zona (10%)',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 825000,
      subtotal: 825000
    },
    {
      name: 'Margin Profit (30%)',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 2545000,
      subtotal: 2545000
    },
    {
      name: 'Flat Fee',
      qtyNeeded: 1,
      qtyCharged: 1,
      unit: 'unit',
      pricePerUnit: 500000,
      subtotal: 500000
    }
  ],
  unitUsed: 'm2',
  computedQty: 15,
  isCustom: false
}

export const mockLeadInfo = {
  name: 'Budi Santoso',
  whatsapp: '081234567890',
  address: 'Jl. Merdeka No. 123, Jakarta Selatan'
}

export const mockCompanyData = {
  logoUrl: 'https://via.placeholder.com/200x100/FF0000/FFFFFF?text=Kokohin',
  companyName: 'PT Kokohin Sejahtera',
  companyAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
  companyPhone: '021-12345678',
  companyEmail: 'info@kokohin.com'
}

export const mockProjectData = {
  projectId: 'proj-123456789',
  catalogTitle: 'Kanopi Minimalis Modern',
  customNotes: 'Permintaan custom dengan spesifikasi khusus untuk area taman belakang'
}