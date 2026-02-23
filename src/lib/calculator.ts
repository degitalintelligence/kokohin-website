import { CalculatorInput, CalculatorResult, Material } from './types'
import { createClient } from '@/lib/supabase/client'

/**
 * Utility function untuk menghitung waste material menggunakan Ceiling Math (Math.ceil())
 * Sesuai aturan: sisa potongan dibebankan ke customer
 */
export function calculateWasteQuantity(qtyNeeded: number, lengthPerUnit: number): number {
  const safeLength = lengthPerUnit > 0 ? lengthPerUnit : 1
  if (safeLength === 1) return qtyNeeded

  // Math.ceil() untuk pembulatan ke atas
  const unitsNeeded = Math.ceil(qtyNeeded / safeLength)
  return unitsNeeded * safeLength
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
 * basePriceValue: harga dasar sesuai satuan
 * unit:
 *  - 'm2' => kuantitas = panjang * lebar
 *  - 'm1' => kuantitas = panjang
 *  - 'unit' => kuantitas = 1
 */
export function calculateCatalogPrice(
  basePriceValue: number,
  unit: 'm2' | 'm1' | 'unit' = 'm2',
  panjang = 0,
  lebar = 0
): number {
  let quantity = 1
  if (unit === 'm2') {
    quantity = Math.max(0, panjang) * Math.max(0, lebar)
  } else if (unit === 'm1') {
    quantity = Math.max(0, panjang)
  } else {
    quantity = 1
  }
  return basePriceValue * quantity
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
  try {
    const res = await fetch(`/api/public/materials?search=${encodeURIComponent(materialName)}`, { cache: 'no-store' })
    if (!res.ok) return defaultPrice
    const json = await res.json() as { material?: { base_price_per_unit?: number } | null }
    const price = json?.material?.base_price_per_unit
    return typeof price === 'number' ? price : defaultPrice
  } catch {
    return defaultPrice
  }
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
  try {
    const res = await fetch(`/api/public/materials?id=${encodeURIComponent(materialId)}`, { cache: 'no-store' })
    if (!res.ok) {
      return { isTemperedGlass: false, requiresSealant: false, sealantMaterialName: '' }
    }
    const json = await res.json() as { material?: { name?: string; requires_sealant?: boolean } }
    const mat = json.material || {}
    const materialName = (mat.name || '').toLowerCase()
    const isTemperedGlass = materialName.includes('tempered') || materialName.includes('kaca tempered')
    const requiresSealant = typeof mat.requires_sealant === 'boolean' ? mat.requires_sealant : isTemperedGlass
    return {
      isTemperedGlass,
      requiresSealant,
      sealantMaterialName: requiresSealant ? 'Sealant Karet Kaca' : ''
    }
  } catch {
    return { isTemperedGlass: false, requiresSealant: false, sealantMaterialName: '' }
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
    type CatalogRow = {
      id: string
      base_price_per_m2: number | null
      base_price_unit: 'm2' | 'm1' | 'unit' | null
      labor_cost: number | null
      transport_cost: number | null
      margin_percentage: number | null
      atap_id: string | null
      rangka_id: string | null
    }
    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .select('id, base_price_per_m2, base_price_unit, labor_cost, transport_cost, margin_percentage, atap_id, rangka_id')
      .eq('id', input.catalogId)
      .eq('is_active', true)
      .maybeSingle()
    if (catalogError || !catalog) {
      throw new Error('Katalog belum tersedia')
    }

    const row = catalog as CatalogRow
    const unit = (row.base_price_unit ?? 'm2')
    const basePrice = calculateCatalogPrice(row.base_price_per_m2 ?? 0, unit, input.panjang, input.lebar)
    const laborCostUnit = calculateCatalogPrice(row.labor_cost ?? 0, unit, input.panjang, input.lebar)
    const transportCost = row.transport_cost ?? 0

    // Fetch catalog addons with material info
    type AddonWithMaterial = {
      id: string
      qty_per_m2: number
      basis?: 'm2' | 'm1' | 'unit' | null
      qty_per_basis?: number | null
      is_optional: boolean
      material_id?: string | null
      material?: { name: string; base_price_per_unit: number; unit: string }
    }

    const { data: addons } = await supabase
      .from('catalog_addons')
      .select('id, basis, qty_per_basis, is_optional, material_id')
      .eq('catalog_id', input.catalogId)

    const selectedSet = new Set(input.selectedAddonIds ?? [])
    const baseAddons: AddonWithMaterial[] = (addons as AddonWithMaterial[] | null | undefined) ?? []
    const enriched: AddonWithMaterial[] = await Promise.all(
      baseAddons.map(async (a) => {
        const matId = a.material_id || ''
        if (!matId) return { ...a, material: { name: 'Addon', base_price_per_unit: 0, unit: '' } }
        try {
          const res = await fetch(`/api/public/materials?id=${encodeURIComponent(matId)}`, { cache: 'no-store' })
          if (!res.ok) return { ...a, material: { name: 'Addon', base_price_per_unit: 0, unit: '' } }
          const json = await res.json() as { material?: { name?: string; base_price_per_unit?: number; unit?: string } }
          const m = json.material || {}
          return {
            ...a,
            material: {
              name: String(m.name || 'Addon'),
              base_price_per_unit: Number(m.base_price_per_unit || 0),
              unit: String(m.unit || '')
            }
          }
        } catch {
          return { ...a, material: { name: 'Addon', base_price_per_unit: 0, unit: '' } }
        }
      })
    )
    const includedAddons = enriched.filter(a => !a.is_optional || selectedSet.has(a.id))

    const addonCost = includedAddons.reduce((sum, a) => {
      const price = a.material?.base_price_per_unit ?? 0
      const basis = (a.basis ?? 'm2')
      const qty = (typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0)
      let multiplier = 1
      if (basis === 'm2') {
        multiplier = luas
      } else if (basis === 'm1') {
        multiplier = Math.max(0, input.panjang)
      } else {
        multiplier = 1
      }
      return sum + price * qty * multiplier
    }, 0)

    let markupPercentage = 0
    let flatFee = 0
    if (input.zoneId) {
      try {
        const zr = await fetch(`/api/public/zones?id=${encodeURIComponent(input.zoneId)}`, { cache: 'no-store' })
        if (zr.ok) {
          const zj = await zr.json() as { zone?: { markup_percentage?: number; flat_fee?: number } }
          markupPercentage = Number(zj.zone?.markup_percentage || 0)
          flatFee = Number(zj.zone?.flat_fee || 0)
        }
      } catch {}
    }
    const hppBeforeMargin = basePrice + addonCost + laborCostUnit + transportCost
    const marginPct = row.margin_percentage ?? 0
    const totalHpp = hppBeforeMargin * (1 + (marginPct / 100))
    const estimatedPrice = applyZoneMarkup(totalHpp, markupPercentage, flatFee)

    // Validasi auto-upsell constraints
    const warnings: string[] = []
    const suggestedItems: { name: string; reason: string; estimatedCost: number }[] = []

    // 1. Anti-sagging validation (lebar > 4.5m)
    const antiSagging = await validateAntiSagging(input.lebar)
    if (antiSagging.needsAntiSagging) {
      warnings.push(antiSagging.warning)
      const matNames = antiSagging.suggestedMaterials
      const prices = await Promise.all(matNames.map((m) => getMaterialPriceByName(m)))
      matNames.forEach((matName, idx) => {
        let quantity = 1
        if (matName.includes('Hollow')) quantity = 2
        const pricePerUnit = prices[idx] ?? 0
        const estimatedCost = pricePerUnit * quantity
        suggestedItems.push({
          name: matName,
          reason: `Bentangan lebar ${input.lebar}m > 4.5m memerlukan ${matName} untuk mencegah sagging`,
          estimatedCost
        })
      })
    }

    // 2. Tempered glass validation (jika ada atap_id)
    if (catalog.atap_id) {
      const temperedGlass = await validateTemperedGlass(catalog.atap_id)
      if (temperedGlass.isTemperedGlass && temperedGlass.requiresSealant) {
        warnings.push(`Material atap adalah Kaca Tempered, memerlukan ${temperedGlass.sealantMaterialName}`)
        let sealantPricePerUnit = 0
        const { data: sealantSetting } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'sealant_material_id')
          .maybeSingle()
        const sealantId = sealantSetting?.value ?? null
        if (sealantId) {
          const { data: sealantMat } = await supabase
            .from('materials')
            .select('base_price_per_unit')
            .eq('id', sealantId)
            .maybeSingle()
          sealantPricePerUnit = sealantMat?.base_price_per_unit ?? 0
        }
        const sealantQuantity = 2
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
      materialCost: totalHpp,
      wasteCost: 0,
      totalHpp,
      marginPercentage: marginPct,
      markupPercentage,
      flatFee,
      totalSellingPrice: estimatedPrice,
      estimatedPrice,
      breakdown: includedAddons.map((a) => {
        const basis = (a.basis ?? 'm2')
        const qtyBasis = (typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0)
        let multiplier = 1
        if (basis === 'm2') {
          multiplier = luas
        } else if (basis === 'm1') {
          multiplier = Math.max(0, input.panjang)
        } else {
          multiplier = 1
        }
        const qtyNeeded = qtyBasis * multiplier
        const pricePerUnit = a.material?.base_price_per_unit ?? 0
        return {
          name: a.material?.name ?? 'Addon',
          qtyNeeded,
          qtyCharged: qtyNeeded,
          unit: a.material?.unit ?? '',
          pricePerUnit,
          subtotal: pricePerUnit * qtyNeeded,
        }
      }),
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedItems: suggestedItems.length > 0 ? suggestedItems : undefined
    }
  }
  let material: Partial<Material> | null = null
  if (input.materialId) {
    try {
      const res = await fetch(`/api/public/materials?id=${encodeURIComponent(input.materialId)}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json() as { material?: Partial<Material> }
        material = json.material ?? null
      }
    } catch {}
  } else {
    try {
      const resList = await fetch('/api/public/materials?category=frame', { cache: 'no-store' })
      const listJson = await resList.json() as { materials?: Array<{ id: string }> }
      const firstId = listJson.materials && listJson.materials[0]?.id
      if (firstId) {
        const resOne = await fetch(`/api/public/materials?id=${encodeURIComponent(firstId)}`, { cache: 'no-store' })
        if (resOne.ok) {
          const oneJson = await resOne.json() as { material?: Partial<Material> }
          material = oneJson.material ?? null
        }
      }
    } catch {}
  }
  if (!material) throw new Error('Material belum tersedia')

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
  let markupPercentage = 0
  let flatFee = 0
  if (input.zoneId) {
    try {
      const zr = await fetch(`/api/public/zones?id=${encodeURIComponent(input.zoneId)}`, { cache: 'no-store' })
      if (zr.ok) {
        const zj = await zr.json() as { zone?: { markup_percentage?: number; flat_fee?: number } }
        markupPercentage = Number(zj.zone?.markup_percentage || 0)
        flatFee = Number(zj.zone?.flat_fee || 0)
      }
    } catch {}
  }

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
    const matNames = antiSagging.suggestedMaterials
    const prices = await Promise.all(matNames.map((m) => getMaterialPriceByName(m)))
    matNames.forEach((matName, idx) => {
      let quantity = 1
      if (matName.includes('Hollow')) quantity = 2
      const pricePerUnit = prices[idx] ?? 0
      const estimatedCost = pricePerUnit * quantity
      suggestedItems.push({
        name: matName,
        reason: `Bentangan lebar ${input.lebar}m > 4.5m memerlukan ${matName} untuk mencegah sagging`,
        estimatedCost
      })
    })
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
