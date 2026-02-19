import { CalculatorInput, CalculatorResult, Material } from './types'

/**
 * Utility function untuk menghitung waste material menggunakan Ceiling Math (Math.ceil())
 * Sesuai aturan: sisa potongan dibebankan ke customer
 */
export function calculateWasteQuantity(qtyNeeded: number, lengthPerUnit: number): number {
  if (lengthPerUnit <= 0) return qtyNeeded
  if (lengthPerUnit === 1) return qtyNeeded
  
  // Math.ceil() untuk pembulatan ke atas
  const unitsNeeded = Math.ceil(qtyNeeded / lengthPerUnit)
  return unitsNeeded * lengthPerUnit
}

/**
 * Kalkulasi harga material dengan waste calculation
 */
export function calculateMaterialCost(material: Material, qtyNeeded: number): {
  qtyCharged: number
  subtotal: number
  wasteQty: number
} {
  // Hitung qty yang dibebankan ke customer (termasuk waste)
  const qtyCharged = calculateWasteQuantity(qtyNeeded, material.length_per_unit)
  
  // Hitung waste (kelebihan dari kebutuhan sebenarnya)
  const wasteQty = qtyCharged - qtyNeeded
  
  // Hitung subtotal
  const subtotal = qtyCharged * material.price
  
  return { qtyCharged, subtotal, wasteQty }
}

/**
 * Kalkulasi harga berdasarkan katalog paket
 */
export function calculateCatalogPrice(basePricePerM2: number, luas: number): number {
  return basePricePerM2 * luas
}

/**
 * Apply zona markup dan flat fee
 */
export function applyZoneMarkup(basePrice: number, markupPercentage: number, flatFee: number): number {
  const markupAmount = basePrice * (markupPercentage / 100)
  return basePrice + markupAmount + flatFee
}

/**
 * Main calculator function dengan escape hatch untuk custom request
 * Sesuai aturan: jika jenis == 'custom', bypass semua fungsi auto-kalkulasi
 */
export async function calculateCanopyPrice(input: CalculatorInput): Promise<CalculatorResult> {
  // ESCAPE HATCH: Jika custom request, return structure khusus
  if (input.jenis === 'custom') {
    return {
      luas: input.panjang * input.lebar,
      materialCost: 0,
      wasteCost: 0,
      totalHpp: 0,
      marginPercentage: 0,
      markupPercentage: 0,
      flatFee: 0,
      totalSellingPrice: 0,
      estimatedPrice: 0,
      breakdown: []
    }
  }
  
  const luas = input.panjang * input.lebar
  
  // TODO: Implementasi fetch material data dari Supabase
  // Untuk sekarang, kita buat dummy data
  const dummyMaterial: Material = {
    id: 'dummy',
    code: 'BJR-01',
    name: 'Baja Ringan 0.75mm',
    category: 'frame',
    unit: 'batang',
    price: 125000,
    length_per_unit: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Hitung kebutuhan material (dummy calculation)
  // Asumsi: untuk kanopi 1m² butuh 0.5 batang rangka
  const qtyNeededPerM2 = 0.5
  const totalQtyNeeded = luas * qtyNeededPerM2
  
  // Hitung material cost dengan waste calculation
  const materialCalc = calculateMaterialCost(dummyMaterial, totalQtyNeeded)
  
  // Hitung waste cost
  const wasteCost = materialCalc.wasteQty * dummyMaterial.price
  
  // Total HPP (material cost saja untuk sekarang)
  const totalHpp = materialCalc.subtotal
  
  // Default margin 30%
  const marginPercentage = 30
  
  // Apply margin
  const priceBeforeMarkup = totalHpp * (1 + marginPercentage / 100)
  
  // TODO: Fetch zone data dan apply markup
  const markupPercentage = 5 // Default Jabodetabek
  const flatFee = 0
  
  const priceAfterMarkup = applyZoneMarkup(priceBeforeMarkup, markupPercentage, flatFee)
  
  // Estimated price (final)
  const estimatedPrice = priceAfterMarkup
  
  return {
    luas,
    materialCost: materialCalc.subtotal,
    wasteCost,
    totalHpp,
    marginPercentage,
    markupPercentage,
    flatFee,
    totalSellingPrice: estimatedPrice,
    estimatedPrice,
    breakdown: [
      {
        name: dummyMaterial.name,
        qtyNeeded: totalQtyNeeded,
        qtyCharged: materialCalc.qtyCharged,
        unit: dummyMaterial.unit,
        pricePerUnit: dummyMaterial.price,
        subtotal: materialCalc.subtotal
      }
    ]
  }
}

/**
 * Format angka ke Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format angka dengan separator ribuan
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}