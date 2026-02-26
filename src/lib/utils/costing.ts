export const formatCurrency = (value: number) => value.toLocaleString('id-ID')

export const getStatusLabel = (status?: string | null) => {
  const normalized = (status ?? '').toString().toLowerCase()
  if (normalized.includes('manual')) return 'Need Manual Quote'
  if (normalized.includes('quote')) return 'Quoted'
  if (normalized.includes('survey')) return 'Surveyed'
  if (normalized === 'new') return 'New'
  if (normalized === 'contacted') return 'Contacted'
  if (normalized === 'closed') return 'Closed'
  return status ?? 'New'
}

export const getStatusStyle = (status?: string | null) => {
  const label = getStatusLabel(status)
  if (label === 'Need Manual Quote') return 'bg-red-50 text-[#E30613] border-red-200'
  if (label === 'Quoted') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (label === 'Surveyed') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

export type CatalogCosting = {
  id: string
  title?: string | null
  base_price_per_m2: number | null
  base_price_unit: 'm2' | 'm1' | 'unit' | null
  labor_cost: number | null
  transport_cost: number | null
  margin_percentage: number | null
  hpp_per_unit: number | null
  atap_id: string | null
  rangka_id: string | null
  finishing_id?: string | null
  isian_id?: string | null
  use_std_calculation?: boolean | null
  std_calculation?: number | null
}

export type HppComponent = {
  id: string
  material_id: string
  quantity: number
  section?: string
  material?: {
    name: string
    unit: string
    base_price_per_unit: number
  }
}

export const buildCostingItems = (
  activeCatalog: CatalogCosting | null,
  dimensions: { panjang: number; lebar: number; unitQty: number },
  isCustom: boolean,
  hppComponents: HppComponent[] = []
) => {
  if (isCustom) {
    return [
      {
        id: 'custom-placeholder',
        name: 'Desain Custom - Perlu Quotation Manual',
        unit: 'unit',
        hpp: 0,
        lengthPerUnit: 1,
        qtyNeeded: 1,
        qtyCharged: 1,
        subtotal: 0,
        type: 'custom'
      }
    ]
  }

  if (!activeCatalog) return []

  const unit = activeCatalog.base_price_unit ?? 'm2'
  const { panjang, lebar, unitQty } = dimensions

  const orderedQty = unit === 'm2'
    ? Math.max(0, panjang) * Math.max(0, lebar)
    : unit === 'm1'
      ? Math.max(0, panjang)
      : Math.max(1, unitQty)

  const items: any[] = []
  const useStd = activeCatalog.use_std_calculation ?? false
  const stdCalc = activeCatalog.std_calculation && activeCatalog.std_calculation > 0 ? activeCatalog.std_calculation : 1
  
  const ratio = useStd ? (orderedQty / stdCalc) : orderedQty

  // 1. Add Main Components (Atap, Rangka, Finishing, Isian) if not already in hppComponents
  const hppMaterialIds = new Set(hppComponents.map(c => c.material_id))
  
  const mainComponents = [
    { id: activeCatalog.atap_id, material: (activeCatalog as any).atap, type: 'atap' },
    { id: activeCatalog.rangka_id, material: (activeCatalog as any).rangka, type: 'rangka' },
    { id: activeCatalog.finishing_id, material: (activeCatalog as any).finishing, type: 'finishing' },
    { id: activeCatalog.isian_id, material: (activeCatalog as any).isian, type: 'isian' }
  ].filter(c => c.id && !hppMaterialIds.has(c.id))

  mainComponents.forEach((comp) => {
    if (!comp.material) return
    const hpp = comp.material.base_price_per_unit || 0
    const qtyNeeded = 1 * ratio // Default 1 unit per ratio
    const qtyCharged = Math.ceil(qtyNeeded)
    const subtotal = Math.ceil(hpp * qtyCharged)
    
    items.push({
      id: `main-${comp.type}-${comp.id}`,
      name: comp.material.name,
      unit: comp.material.unit || 'unit',
      hpp,
      lengthPerUnit: 1,
      qtyNeeded,
      qtyCharged,
      subtotal,
      type: comp.type
    })
  })

  // 2. Add HPP Components from table
  hppComponents.forEach((comp) => {
    const baseQty = comp.quantity || 0
    const qtyNeeded = Math.ceil(baseQty * ratio)
    const qtyCharged = qtyNeeded
    const hpp = comp.material?.base_price_per_unit ?? 0
    const subtotal = Math.ceil(hpp * qtyCharged)

    if (qtyCharged > 0) {
      items.push({
        id: comp.id,
        name: comp.material?.name || 'Material',
        unit: comp.material?.unit || 'unit',
        hpp,
        lengthPerUnit: 1,
        qtyNeeded,
        qtyCharged,
        subtotal,
        type: comp.section || 'material'
      })
    }
  })

  if (activeCatalog.labor_cost && activeCatalog.labor_cost > 0) {
    const baseLabor = activeCatalog.labor_cost
    const laborSubtotal = Math.ceil(useStd ? (baseLabor * ratio) : (baseLabor * orderedQty))
    
    items.push({
      id: 'labor-cost',
      name: 'Biaya Tenaga Kerja (Jasa)',
      unit: 'ls',
      hpp: orderedQty > 0 ? Math.ceil(laborSubtotal / orderedQty) : 0,
      lengthPerUnit: 1,
      qtyNeeded: 1,
      qtyCharged: 1,
      subtotal: laborSubtotal,
      type: 'labor'
    })
  }

  if (activeCatalog.transport_cost && activeCatalog.transport_cost > 0) {
    const baseTransport = activeCatalog.transport_cost
    const transportSubtotal = Math.ceil(useStd ? (baseTransport * ratio) : (baseTransport * orderedQty))
    
    items.push({
      id: 'transport-cost',
      name: 'Biaya Transport & Overhead',
      unit: 'ls',
      hpp: orderedQty > 0 ? Math.ceil(transportSubtotal / orderedQty) : 0,
      lengthPerUnit: 1,
      qtyNeeded: 1,
      qtyCharged: 1,
      subtotal: transportSubtotal,
      type: 'overhead'
    })
  }

  if (items.length === 0 && activeCatalog.hpp_per_unit && activeCatalog.hpp_per_unit > 0) {
    const hppPerUnit = activeCatalog.hpp_per_unit
    items.push({
      id: `${activeCatalog.id}-${orderedQty}`,
      name: activeCatalog.title || 'Katalog Item (Global)',
      unit,
      hpp: hppPerUnit,
      lengthPerUnit: 1,
      qtyNeeded: orderedQty,
      qtyCharged: orderedQty,
      subtotal: Math.ceil(hppPerUnit * orderedQty),
      type: 'global'
    })
  }

  return items
}
