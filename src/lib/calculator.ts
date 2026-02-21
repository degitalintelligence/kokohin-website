import { CalculatorInput, CalculatorResult, Material } from './types'
import { createClient } from '@/lib/supabase/client'

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
 * Kalkulasi kebutuhan lembar standar untuk material laser cut
 * Asumsi ukuran lembar standar: 1.22m x 2.44m = 2.9768 m² per lembar
 * Sesuai PRD: Material Plat Laser Cut dihitung berdasarkan Lembar Standar
 */
export function calculateLaserCutSheets(areaNeededM2: number): {
  sheetsNeeded: number
  wasteAreaM2: number
  sheetAreaM2: number
} {
  const sheetAreaM2 = 1.22 * 2.44 // 2.9768 m² per lembar standar
  const sheetsNeeded = Math.ceil(areaNeededM2 / sheetAreaM2)
  const totalSheetArea = sheetsNeeded * sheetAreaM2
  const wasteAreaM2 = totalSheetArea - areaNeededM2
  
  return { sheetsNeeded, wasteAreaM2, sheetAreaM2 }
}

/**
 * Kalkulasi harga material dengan waste calculation
 */
export function calculateMaterialCost(material: Material, qtyNeeded: number): {
  qtyCharged: number
  subtotal: number
  wasteQty: number
} {
  // ESCAPE HATCH untuk material laser cut
  if (material.is_laser_cut) {
    // qtyNeeded adalah luas dalam m² untuk material laser cut
    const { sheetsNeeded, wasteAreaM2 } = calculateLaserCutSheets(qtyNeeded)
    // qtyCharged adalah jumlah lembar standar
    const qtyCharged = sheetsNeeded
    // wasteQty adalah luas waste dalam m² (konversi ke unit lembar jika perlu)
    const wasteQty = wasteAreaM2
    // subtotal berdasarkan jumlah lembar
    const subtotal = qtyCharged * material.base_price_per_unit
    return { qtyCharged, subtotal, wasteQty }
  }

  // Hitung qty yang dibebankan ke customer (termasuk waste)
  const qtyCharged = calculateWasteQuantity(qtyNeeded, material.length_per_unit ?? 1)

  // Hitung waste (kelebihan dari kebutuhan sebenarnya)
  const wasteQty = qtyCharged - qtyNeeded

  // Hitung subtotal
  const subtotal = qtyCharged * material.base_price_per_unit

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
 * Cari harga material berdasarkan nama (case-insensitive partial match)
 * Return base_price_per_unit jika ditemukan, otherwise return default price
 */
async function getMaterialPriceByName(materialName: string, defaultPrice = 0): Promise<number> {
  const supabase = createClient()
  const { data: materials } = await supabase
    .from('materials')
    .select('base_price_per_unit')
    .ilike('name', `%${materialName}%`)
    .limit(1)
  
  if (materials && materials.length > 0) {
    return materials[0].base_price_per_unit
  }
  return defaultPrice
}

/**
 * Validasi anti-sagging constraint untuk kanopi dengan bentangan lebar > 4.5m
 * Sesuai PRD: jika jenis == 'kanopi' DAN lebar > 4.5 meter, flagging/warning ke admin
 * dan sarankan "Tiang Tengah (V-Shape)" atau upgrade rangka ke Hollow 5x10
 */
export async function validateAntiSagging(width: number): Promise<{
  needsAntiSagging: boolean
  warning: string
  suggestedMaterials: string[]
}> {
  const needsAntiSagging = width > 4.5
  return {
    needsAntiSagging,
    warning: needsAntiSagging 
      ? `Bentangan lebar (${width}m) > 4.5m memerlukan tiang tengah V-Shape atau rangka Hollow 5x10 untuk mencegah sagging`
      : '',
    suggestedMaterials: needsAntiSagging 
      ? ['Tiang Tengah (V-Shape)', 'Hollow 5x10'] 
      : []
  }
}

/**
 * Validasi kaca tempered constraint
 * Sesuai PRD: jika material atap_id merujuk pada Kaca Tempered,
 * otomatis tambahkan item material Sealant Karet Kaca ke kalkulasi total_hpp
 */
export async function validateTemperedGlass(materialId: string): Promise<{
  isTemperedGlass: boolean
  requiresSealant: boolean
  sealantMaterialName: string
}> {
  // Gunakan flag requires_sealant dari database
  const supabase = createClient()
  const { data: material } = await supabase
    .from('materials')
    .select('name, requires_sealant')
    .eq('id', materialId)
    .maybeSingle()
  
  const materialName = material?.name.toLowerCase() || ''
  const isTemperedGlass = materialName.includes('tempered') || materialName.includes('kaca tempered')
  // Prioritaskan flag dari database, fallback ke deteksi nama
  const requiresSealant = material?.requires_sealant ?? isTemperedGlass
  
  return {
    isTemperedGlass,
    requiresSealant,
    sealantMaterialName: requiresSealant ? 'Sealant Karet Kaca' : ''
  }
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
  const supabase = createClient()
  if (input.catalogId) {
    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .select('id, base_price_per_m2, atap_id, rangka_id')
      .eq('id', input.catalogId)
      .eq('is_active', true)
      .maybeSingle()
    if (catalogError || !catalog) {
      throw new Error('Katalog belum tersedia')
    }

    const basePrice = calculateCatalogPrice(catalog.base_price_per_m2 ?? 0, luas)
    const { data: zone } = input.zoneId
      ? await supabase.from('zones').select('*').eq('id', input.zoneId).maybeSingle()
      : { data: null }
    const markupPercentage = zone?.markup_percentage ?? 0
    const flatFee = zone?.flat_fee ?? 0
    const estimatedPrice = applyZoneMarkup(basePrice, markupPercentage, flatFee)

    // Validasi auto-upsell constraints
    const warnings: string[] = []
    const suggestedItems: { name: string; reason: string; estimatedCost: number }[] = []

    // 1. Anti-sagging validation (lebar > 4.5m)
    const antiSagging = await validateAntiSagging(input.lebar)
    if (antiSagging.needsAntiSagging) {
      warnings.push(antiSagging.warning)
      for (const matName of antiSagging.suggestedMaterials) {
        // Estimasi quantity berdasarkan material
        let quantity = 1
        if (matName.includes('Hollow')) {
          quantity = 2 // 2 batang hollow untuk reinforcement
        }
        const pricePerUnit = await getMaterialPriceByName(matName)
        const estimatedCost = pricePerUnit * quantity
        suggestedItems.push({
          name: matName,
          reason: `Bentangan lebar ${input.lebar}m > 4.5m memerlukan ${matName} untuk mencegah sagging`,
          estimatedCost
        })
      }
    }

    // 2. Tempered glass validation (jika ada atap_id)
    if (catalog.atap_id) {
      const temperedGlass = await validateTemperedGlass(catalog.atap_id)
      if (temperedGlass.isTemperedGlass && temperedGlass.requiresSealant) {
        warnings.push(`Material atap adalah Kaca Tempered, memerlukan ${temperedGlass.sealantMaterialName}`)
        const sealantPricePerUnit = await getMaterialPriceByName(temperedGlass.sealantMaterialName, 10000) // default Rp 10,000
        const sealantQuantity = 2 // 2 tube sealant untuk standar kanopi
        const estimatedSealantCost = sealantPricePerUnit * sealantQuantity
        suggestedItems.push({
          name: temperedGlass.sealantMaterialName,
          reason: 'Kaca Tempered memerlukan sealant untuk mencegah kebocoran',
          estimatedCost: estimatedSealantCost
        })
      }
    }

    return {
      luas,
      materialCost: basePrice,
      wasteCost: 0,
      totalHpp: basePrice,
      marginPercentage: 0,
      markupPercentage,
      flatFee,
      totalSellingPrice: estimatedPrice,
      estimatedPrice,
      breakdown: [],
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedItems: suggestedItems.length > 0 ? suggestedItems : undefined
    }
  }
  const materialQuery = input.materialId
    ? supabase.from('materials').select('*').eq('id', input.materialId).eq('is_active', true).maybeSingle()
    : supabase.from('materials').select('*').eq('category', 'frame').eq('is_active', true).order('name').limit(1).maybeSingle()
  const { data: material, error: materialError } = await materialQuery
  if (materialError || !material) {
    throw new Error('Material belum tersedia')
  }

  // Hitung kebutuhan material (dummy calculation)
  // Asumsi: untuk kanopi 1m² butuh 0.5 batang rangka
  const qtyNeededPerM2 = 0.5
  const totalQtyNeeded = luas * qtyNeededPerM2

  // Hitung material cost dengan waste calculation
  const materialCalc = calculateMaterialCost(material as Material, totalQtyNeeded)

  // Hitung waste cost
  const wasteCost = materialCalc.wasteQty * (material as Material).base_price_per_unit

  // Total HPP (material cost saja untuk sekarang)
  const totalHpp = materialCalc.subtotal

  // Default margin 30%
  const marginPercentage = 30

  // Apply margin
  const priceBeforeMarkup = totalHpp * (1 + marginPercentage / 100)

  // TODO: Fetch zone data dan apply markup
  const { data: zone } = input.zoneId
    ? await supabase.from('zones').select('*').eq('id', input.zoneId).maybeSingle()
    : { data: null }
  const markupPercentage = zone?.markup_percentage ?? 0
  const flatFee = zone?.flat_fee ?? 0

  const priceAfterMarkup = applyZoneMarkup(priceBeforeMarkup, markupPercentage, flatFee)

  // Estimated price (final)
  const estimatedPrice = priceAfterMarkup

  // Validasi auto-upsell constraints (hanya anti-sagging untuk non-catalog)
  const warnings: string[] = []
  const suggestedItems: { name: string; reason: string; estimatedCost: number }[] = []

  // Anti-sagging validation (lebar > 4.5m)
  const antiSagging = await validateAntiSagging(input.lebar)
  if (antiSagging.needsAntiSagging) {
    warnings.push(antiSagging.warning)
    for (const matName of antiSagging.suggestedMaterials) {
      // Estimasi quantity berdasarkan material
      let quantity = 1
      if (matName.includes('Hollow')) {
        quantity = 2 // 2 batang hollow untuk reinforcement
      }
      const pricePerUnit = await getMaterialPriceByName(matName)
      const estimatedCost = pricePerUnit * quantity
      suggestedItems.push({
        name: matName,
        reason: `Bentangan lebar ${input.lebar}m > 4.5m memerlukan ${matName} untuk mencegah sagging`,
        estimatedCost
      })
    }
  }

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
        name: (material as Material).name,
        qtyNeeded: totalQtyNeeded,
        qtyCharged: materialCalc.qtyCharged,
        unit: (material as Material).unit,
        pricePerUnit: (material as Material).base_price_per_unit,
        subtotal: materialCalc.subtotal
      }
    ],
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestedItems: suggestedItems.length > 0 ? suggestedItems : undefined
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
