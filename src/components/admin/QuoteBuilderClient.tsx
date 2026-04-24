'use client'

import { Fragment, useState, useMemo, useEffect, useTransition } from 'react'
import { 
  Calculator, 
  HardHat, 
  AlertCircle, 
  History,
  ShieldCheck,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  MapPin,
  X,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { buildCostingItems, formatCurrency, type CatalogCosting, type CostingItem, type HppComponent } from '@/lib/utils/costing'
import { toast } from '@/components/ui/toaster'
import SearchDropdown, { type SearchDropdownOption } from '@/app/admin/(dashboard)/catalogs/components/SearchDropdown'

interface QuoteBuilderProps {
  initialData: {
    id?: string
    name: string
    unit: string
    quantity: number
    catalog_id?: string
    panjang?: number
    lebar?: number
    unit_qty?: number
    unit_price?: number
    builder_costs?: CostingItem[]
    zone_id?: string
    margin_percentage?: number
    markup_percentage?: number
    markup_flat_fee?: number
    type: string
    baseline_costs?: BaselineCostSnapshot[]
  }
  parentZoneId?: string
  customerInfo?: {
    name?: string
    phone?: string
    min_price_per_m2?: number
    tier?: string
  }
  disableFlatFee?: boolean
  onSave: (data: QuoteBuilderSavePayload) => void
  onClose: () => void
}

type QuoteBuilderSavePayload = QuoteBuilderProps['initialData'] & {
  unit_price: number
  subtotal: number
  total_hpp: number
}

interface Zone {
  id: string
  name: string
  markup_percentage: number
  flat_fee: number
}

type CostingGroup = {
  key: string
  label: string
  items: CostingItem[]
  subtotal: number
}

type AddonDraft = {
  id: string
  materialId?: string | null
  name: string
  section: string
  mode: 'fixed' | 'variable'
  baseQty: number
  hpp: number
  unit: string
}

type OverrideDraft = {
  id: string
  targetId: string
  targetName: string
  materialId?: string | null
  name: string
  section: string
  mode: 'fixed' | 'variable'
  baseQty: number
  hpp: number
  unit: string
}

type AddonMaterialOption = {
  id: string
  name: string
  variant_name?: string | null
  category?: string | null
  unit: string
  base_price_per_unit: number
}

type BaselineCostSnapshot = {
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

export default function QuoteBuilderClient({
  initialData,
  parentZoneId,
  customerInfo,
  disableFlatFee = false,
  onSave,
  onClose
}: QuoteBuilderProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const selectedZoneId = parentZoneId || initialData.zone_id || ''
  
  // Custom Pricing State
  const [activeCatalog, setActiveCatalog] = useState<CatalogCosting | null>(null)
  const [panjang, setPanjang] = useState(initialData.panjang || 1)
  const [lebar, setLebar] = useState(initialData.lebar || 1)
  const [unitQty, setUnitQty] = useState(initialData.unit_qty || 1)

  // Default unit price from catalog
  const defaultUnitPrice = Number(activeCatalog?.base_price_per_m2 || 0)
  const [unitPrice, setUnitPrice] = useState(initialData.unit_price || defaultUnitPrice)

  const [isSaving, startSaveTransition] = useTransition()
  const [hppComponents, setHppComponents] = useState<HppComponent[]>([])
  const [isLoadingComponents, setIsLoadingComponents] = useState(false)
  const [addonDrafts, setAddonDrafts] = useState<AddonDraft[]>([])
  const [overrideDrafts, setOverrideDrafts] = useState<OverrideDraft[]>([])
  const [overrideEditor, setOverrideEditor] = useState<OverrideDraft | null>(null)
  const [addonMaterials, setAddonMaterials] = useState<AddonMaterialOption[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  // 2. Constants & Derived Data
  const catalogUnit = activeCatalog?.base_price_unit ?? 'm2'
  const isCustom = initialData.type === 'manual' && !initialData.catalog_id
  const productLabel = activeCatalog?.title || initialData.name || 'Katalog tidak ditemukan'
  const unitLabel = catalogUnit === 'm2' ? 'm²' : catalogUnit === 'm1' ? 'm¹' : 'unit'
  const addonSectionOptions = useMemo(
    () => [
      { value: 'rangka', label: 'Rangka' },
      { value: 'atap', label: 'Atap' },
      { value: 'finishing', label: 'Finishing' },
      { value: 'isian', label: 'Isian' },
      { value: 'aksesoris', label: 'Aksesoris' },
      { value: 'lainnya', label: 'Lainnya' },
    ],
    [],
  )
  const addonMaterialOptions = useMemo(
    () =>
      addonMaterials.map((material) => {
        const variantLabel =
          material.variant_name && material.variant_name.toLowerCase() !== 'default'
            ? ` - ${material.variant_name}`
            : ''
        const unitLabelValue = material.unit ? ` (${material.unit})` : ''
        return {
          ...material,
          label: `${material.name}${variantLabel}${unitLabelValue}`,
        }
      }),
    [addonMaterials],
  )
  const addonMaterialSearchOptions = useMemo<SearchDropdownOption[]>(
    () =>
      addonMaterialOptions.map((material) => ({
        value: material.id,
        label: material.label,
        group: material.category || 'lainnya',
        keywords: `${material.name} ${material.variant_name ?? ''} ${material.category ?? ''} ${material.unit ?? ''}`,
      })),
    [addonMaterialOptions],
  )

  // Fetch Catalog & Zones & Components on mount
  useEffect(() => {
    async function fetchData() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // 1. Fetch Zones
      const { data: zonesData } = await supabase.from('zones').select('*').order('name')
      setZones(zonesData || [])

      // 1b. Fetch master materials for addon picker
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, name, variant_name, category, unit, base_price_per_unit')
        .eq('is_active', true)
        .order('name', { ascending: true })
      setAddonMaterials((materialsData || []) as AddonMaterialOption[])

      // 2. Fetch Catalog if present
      if (initialData.catalog_id) {
        const { data: catData } = await supabase
          .from('catalogs')
          .select('*, atap:atap_id(*), rangka:rangka_id(*), finishing:finishing_id(*), isian:isian_id(*)')
          .eq('id', initialData.catalog_id)
          .single()
        setActiveCatalog(catData as CatalogCosting)
        
        // 3. Fetch HPP Components
        setIsLoadingComponents(true)
        try {
          let data: unknown[] | null = null
          let error: { message?: string } | null = null

          const primaryResult = await supabase
            .from('catalog_hpp_components')
            .select('id, material_id, quantity, section, calculation_mode, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
            .eq('catalog_id', initialData.catalog_id)
          data = primaryResult.data
          error = primaryResult.error

          if (error) {
            const fallback = await supabase
              .from('catalog_hpp_components')
              .select('id, material_id, quantity, section, material:material_id(name, variant_name, unit, base_price_per_unit, length_per_unit)')
              .eq('catalog_id', initialData.catalog_id)
            data = fallback.data as unknown[] | null
            error = fallback.error as { message?: string } | null
          }

          if (error) throw error
          setHppComponents((data ?? []) as unknown as HppComponent[])
        } catch (err: unknown) {
          console.error('Error fetching catalog components:', err)
        } finally {
          setIsLoadingComponents(false)
        }
      }
    }
    fetchData()
  }, [initialData.catalog_id])

  // Update unitPrice if activeCatalog changes and initialData has no price
  useEffect(() => {
    if (activeCatalog && !initialData.unit_price) {
      setUnitPrice(Number(activeCatalog.base_price_per_m2 || 0))
    }
  }, [activeCatalog, initialData.unit_price])

  const normalizeSectionFromCategory = (category?: string | null): string => {
    const text = String(category ?? '').toLowerCase()
    if (text.includes('rangka') || text.includes('frame')) return 'rangka'
    if (text.includes('atap')) return 'atap'
    if (text.includes('finishing')) return 'finishing'
    if (text.includes('isian')) return 'isian'
    if (text.includes('aksesoris')) return 'aksesoris'
    return 'lainnya'
  }

  useEffect(() => {
    const rawCosts = initialData.builder_costs || []
    const loadedAddons: AddonDraft[] = rawCosts
      .filter((item) => String(item.id || '').startsWith('addon-'))
      .map((item, idx) => {
        const source = item as CostingItem & {
          addon_mode?: 'fixed' | 'variable'
          addon_base_qty?: number
          addon_section?: string
          addon_unit?: string
          addon_hpp?: number
          addon_material_id?: string
        }
        return {
          id: source.id || `addon-${idx + 1}`,
          materialId: source.addon_material_id || null,
          name: source.name || 'Addon',
          section: source.addon_section || source.type || 'lainnya',
          mode: source.addon_mode === 'fixed' ? 'fixed' : 'variable',
          baseQty: Number(source.addon_base_qty ?? source.qtyNeeded ?? source.qtyCharged ?? 1),
          hpp: Number(source.addon_hpp ?? source.hpp ?? 0),
          unit: source.addon_unit || source.unit || 'unit',
        }
      })
    setAddonDrafts(loadedAddons)

    const loadedOverrides: OverrideDraft[] = rawCosts
      .filter((item) => String(item.id || '').startsWith('override-'))
      .map((item, idx) => {
        const source = item as CostingItem & {
          override_target_id?: string
          override_target_name?: string
          override_mode?: 'fixed' | 'variable'
          override_base_qty?: number
          override_section?: string
          override_unit?: string
          override_hpp?: number
          override_material_id?: string
        }
        const fallbackTargetId = String(source.id || `override-${idx + 1}`).replace(/^override-/, '')
        return {
          id: source.id || `override-${fallbackTargetId}`,
          targetId: source.override_target_id || fallbackTargetId,
          targetName: source.override_target_name || source.name || 'Komponen',
          materialId: source.override_material_id || null,
          name: source.name || 'Material Override',
          section: source.override_section || source.type || 'lainnya',
          mode: source.override_mode === 'fixed' ? 'fixed' : 'variable',
          baseQty: Number(source.override_base_qty ?? source.qtyNeeded ?? source.qtyCharged ?? 1),
          hpp: Number(source.override_hpp ?? source.hpp ?? 0),
          unit: source.override_unit || source.unit || 'unit',
        }
      })
    setOverrideDrafts(loadedOverrides)
  }, [initialData.builder_costs])

  // 3. Dynamic Calculations
  const computedQty = useMemo(() => {
    if (catalogUnit === 'm2') return Math.max(0, panjang) * Math.max(0, lebar)
    if (catalogUnit === 'm1') return Math.max(0, panjang)
    return Math.max(1, unitQty)
  }, [catalogUnit, panjang, lebar, unitQty])

  const { costingItems: baseCostingItems } = useMemo(() => {
    const snapshotItems = (initialData.builder_costs || []).filter(
      (item) =>
        !String(item.id || '').startsWith('addon-') &&
        !String(item.id || '').startsWith('override-'),
    )
    if (!activeCatalog) {
      return { costingItems: snapshotItems }
    }
    const items = buildCostingItems(activeCatalog, { panjang, lebar, unitQty }, isCustom, hppComponents)
    return { costingItems: items }
  }, [activeCatalog, panjang, lebar, unitQty, isCustom, hppComponents, initialData.builder_costs])

  const addonCostingItems = useMemo<CostingItem[]>(() => {
    const stdCalc = activeCatalog?.std_calculation && activeCatalog.std_calculation > 0
      ? activeCatalog.std_calculation
      : 1
    const scale = computedQty / stdCalc
    return addonDrafts
      .map((addon) => {
        const qtyNeeded = addon.mode === 'fixed' ? addon.baseQty : addon.baseQty * scale
        const qtyCharged = Math.ceil(Math.max(0, qtyNeeded))
        const subtotal = Math.ceil(Math.max(0, addon.hpp) * qtyCharged)
        if (!addon.name || qtyCharged <= 0) return null
        const addonItem = {
          id: addon.id,
          name: addon.name,
          unit: addon.unit || 'unit',
          hpp: Math.max(0, addon.hpp),
          lengthPerUnit: 1,
          qtyNeeded,
          qtyCharged,
          subtotal,
          type: addon.section || 'lainnya',
          addon_mode: addon.mode,
          addon_base_qty: addon.baseQty,
          addon_section: addon.section || 'lainnya',
          addon_unit: addon.unit || 'unit',
          addon_hpp: addon.hpp,
          addon_material_id: addon.materialId || null,
        } as CostingItem
        return addonItem
      })
      .filter((item): item is CostingItem => item !== null)
  }, [addonDrafts, computedQty, activeCatalog?.std_calculation])

  const overrideCostingItems = useMemo<CostingItem[]>(() => {
    const stdCalc = activeCatalog?.std_calculation && activeCatalog.std_calculation > 0
      ? activeCatalog.std_calculation
      : 1
    const scale = computedQty / stdCalc
    return overrideDrafts
      .map((override) => {
        const qtyNeeded = override.mode === 'fixed' ? override.baseQty : override.baseQty * scale
        const qtyCharged = Math.ceil(Math.max(0, qtyNeeded))
        const subtotal = Math.ceil(Math.max(0, override.hpp) * qtyCharged)
        if (!override.name || !override.targetId || qtyCharged <= 0) return null
        return {
          id: override.id || `override-${override.targetId}`,
          name: override.name,
          unit: override.unit || 'unit',
          hpp: Math.max(0, override.hpp),
          lengthPerUnit: 1,
          qtyNeeded,
          qtyCharged,
          subtotal,
          type: override.section || 'lainnya',
          override_target_id: override.targetId,
          override_target_name: override.targetName,
          override_mode: override.mode,
          override_base_qty: override.baseQty,
          override_section: override.section || 'lainnya',
          override_unit: override.unit || 'unit',
          override_hpp: override.hpp,
          override_material_id: override.materialId || null,
        } as CostingItem
      })
      .filter((item): item is CostingItem => item !== null)
  }, [overrideDrafts, computedQty, activeCatalog?.std_calculation])

  const overriddenTargetIds = useMemo(
    () => new Set(overrideDrafts.map((item) => item.targetId).filter(Boolean)),
    [overrideDrafts],
  )

  const visibleBaseCostingItems = useMemo(
    () => baseCostingItems.filter((item) => !overriddenTargetIds.has(item.id)),
    [baseCostingItems, overriddenTargetIds],
  )

  const costingItems = useMemo(
    () => [...visibleBaseCostingItems, ...overrideCostingItems, ...addonCostingItems],
    [visibleBaseCostingItems, overrideCostingItems, addonCostingItems],
  )

  const totalHpp = useMemo(
    () => costingItems.reduce((acc, item) => acc + item.subtotal, 0),
    [costingItems],
  )

  const groupedCostingItems = useMemo<CostingGroup[]>(() => {
    const sectionLabelMap: Record<string, string> = {
      atap: 'Atap',
      rangka: 'Rangka',
      frame: 'Rangka',
      finishing: 'Finishing',
      isian: 'Isian',
      aksesoris: 'Aksesoris',
      labor: 'Jasa',
      overhead: 'Overhead',
      lainnya: 'Lainnya',
      material: 'Material Lain',
      global: 'Global',
      custom: 'Custom',
    }
    const sectionOrder = ['rangka', 'atap', 'finishing', 'isian', 'aksesoris', 'labor', 'overhead', 'lainnya', 'material', 'global', 'custom']

    const normalizeKey = (rawType?: string): string => {
      const key = String(rawType ?? '').toLowerCase().trim()
      if (!key) return 'lainnya'
      if (key === 'frame') return 'rangka'
      return key
    }

    const grouped = new Map<string, CostingGroup>()
    costingItems.forEach((item) => {
      const key = normalizeKey(item.type)
      const existing = grouped.get(key)
      if (existing) {
        existing.items.push(item)
        existing.subtotal += item.subtotal || 0
        return
      }
      grouped.set(key, {
        key,
        label: sectionLabelMap[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
        items: [item],
        subtotal: item.subtotal || 0,
      })
    })

    return Array.from(grouped.values()).sort((a, b) => {
      const ia = sectionOrder.indexOf(a.key)
      const ib = sectionOrder.indexOf(b.key)
      const pa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia
      const pb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib
      if (pa !== pb) return pa - pb
      return a.label.localeCompare(b.label)
    })
  }, [costingItems])

  const baselineTotalHpp = useMemo(
    () => (initialData.baseline_costs || []).reduce((sum, row) => sum + Number(row.subtotal_snapshot || 0), 0),
    [initialData.baseline_costs],
  )
  const hppDelta = totalHpp - baselineTotalHpp
  const hasBaseline = (initialData.baseline_costs?.length || 0) > 0

  // Pricing Logic
  const matchedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  const markupPercentage = matchedZone?.markup_percentage ?? 0
  const flatFee = disableFlatFee ? 0 : (matchedZone?.flat_fee ?? 0)

  const catalogMargin = Number(activeCatalog?.margin_percentage || 30)
  
  // Calculate Minimum Price with Markup
  const minPricePerUnit = useMemo(() => {
    const baseHppPerUnit = totalHpp / (computedQty || 1)
    const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)
    
    // Static markup only if this is line #1 (we can pass this info via props if needed, 
    // but for now let's assume if flatFee > 0 it's intended)
    // Actually, requirement says static markup ONLY for line #1.
    const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))
    return Math.ceil(priceAfterMargin + markupNominalPerUnit)
  }, [totalHpp, computedQty, catalogMargin, markupPercentage, flatFee])
  
  const currentTotalAmount = Math.ceil(unitPrice * computedQty)
  
  // Use customerInfo for comparison
  const customerMinPrice = customerInfo?.min_price_per_m2 || 0
  const historicalUnitPrice = initialData.unit_price || 0

  // Status Check
  const isBelowMin = unitPrice < minPricePerUnit
  const isBelowCustomerMin = customerMinPrice > 0 && unitPrice < customerMinPrice
  const isNearMin = unitPrice >= minPricePerUnit && unitPrice < minPricePerUnit * 1.05
  
  const priceStatus = useMemo(() => {
    if (isBelowMin || isBelowCustomerMin) return { label: 'DI BAWAH MINIMUM', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldAlert }
    if (isNearMin) return { label: 'MENDEKATI MINIMUM', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertCircle }
    return { label: 'BATAS AMAN', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: ShieldCheck }
  }, [isBelowMin, isBelowCustomerMin, isNearMin])

  // 5. Handlers
  const handleSaveBuilder = async () => {
    if (isBelowMin || isBelowCustomerMin) {
      toast.error('Gagal Simpan', 'Harga satuan yang Anda input berada di bawah ambang batas minimum yang diizinkan.')
      return
    }

    startSaveTransition(async () => {
      try {
        // Prepare line item data
        const updatedLine = {
          ...initialData,
          panjang: panjang || undefined,
          lebar: lebar || undefined,
          unit_qty: unitQty || undefined,
          quantity: computedQty, // Sync computed quantity back to the main item
          unit_price: unitPrice,
          subtotal: currentTotalAmount,
          total_hpp: totalHpp,
          builder_costs: costingItems,
          catalog_id: activeCatalog?.id,
          zone_id: selectedZoneId || undefined,
          markup_percentage: markupPercentage,
          markup_flat_fee: flatFee
        }

        onSave(updatedLine)
        toast.success('Sukses', 'Kalkulasi item telah diperbarui.')
        onClose()
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.'
        toast.error('Gagal', errorMessage)
      }
    })
  }

  const addAddonRow = () => {
    const nextNumber = addonDrafts.length + 1
    const defaultMaterial = addonMaterialOptions[0]
    setAddonDrafts((prev) => [
      ...prev,
      {
        id: `addon-${Date.now()}-${nextNumber}`,
        materialId: defaultMaterial?.id ?? null,
        name: defaultMaterial?.label || `Addon ${nextNumber}`,
        section: normalizeSectionFromCategory(defaultMaterial?.category),
        mode: 'variable',
        baseQty: 1,
        hpp: Number(defaultMaterial?.base_price_per_unit || 0),
        unit: defaultMaterial?.unit || 'unit',
      },
    ])
  }

  const updateAddon = (id: string, patch: Partial<AddonDraft>) => {
    setAddonDrafts((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeAddon = (id: string) => {
    setAddonDrafts((prev) => prev.filter((item) => item.id !== id))
  }

  const upsertOverride = (draft: OverrideDraft) => {
    setOverrideDrafts((prev) => {
      const next = prev.filter((item) => item.targetId !== draft.targetId)
      return [...next, { ...draft, id: `override-${draft.targetId}` }]
    })
  }

  const removeOverride = (targetId: string) => {
    setOverrideDrafts((prev) => prev.filter((item) => item.targetId !== targetId))
    setOverrideEditor((current) => (current?.targetId === targetId ? null : current))
  }

  const openOverrideEditor = (item: CostingItem) => {
    const existing = overrideDrafts.find((override) => override.targetId === item.id)
    if (existing) {
      setOverrideEditor(existing)
      return
    }
    const stdCalc = activeCatalog?.std_calculation && activeCatalog.std_calculation > 0
      ? activeCatalog.std_calculation
      : 1
    const scale = Math.max(1e-9, computedQty / stdCalc)
    const normalizedBaseQty = item.qtyNeeded > 0 ? item.qtyNeeded / scale : 1
    setOverrideEditor({
      id: `override-${item.id}`,
      targetId: item.id,
      targetName: item.name,
      materialId: null,
      name: item.name,
      section: item.type || 'lainnya',
      mode: 'variable',
      baseQty: Number.isFinite(normalizedBaseQty) ? normalizedBaseQty : 1,
      hpp: item.hpp || 0,
      unit: item.unit || 'unit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div
        className={`bg-white shadow-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          isFullscreen
            ? 'max-w-[100vw] max-h-[100vh] h-[100vh] rounded-none'
            : 'max-w-[96vw] xl:max-w-7xl max-h-[96vh] rounded-2xl'
        }`}
      >
        <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#E30613]/10 rounded-xl">
                <Calculator size={24} className="text-[#E30613]" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                Costing Builder
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                <Package size={12} className="text-[#E30613]" />
                {customerInfo?.name || 'Customer'} | {initialData.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900"
              aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
              title={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              {/* Input Parameters */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <Package size={16} className="text-[#E30613]" /> Konfigurasi Utama
                  </h4>
                  <span className="text-[10px] font-black bg-[#1D1D1B] text-white px-2 py-0.5 rounded uppercase">
                    {productLabel}
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex justify-between items-center">
                        <span>Volume & Dimensi</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Satuan: {unitLabel}</span>
                    </div>
                    {catalogUnit === 'm2' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Panjang (m)</label>
                          <input 
                            type="number" 
                            value={panjang || ''} 
                            onChange={(e) => setPanjang(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Lebar (m)</label>
                          <input 
                            type="number" 
                            value={lebar || ''} 
                            onChange={(e) => setLebar(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Quantity ({unitLabel})</label>
                        <input 
                          type="number" 
                          value={unitQty || ''} 
                          onChange={(e) => setUnitQty(parseFloat(e.target.value) || 1)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                        />
                      </div>
                    )}
                    
                    {/* Zone Selector (Locked to Parent Editor) */}
                    <div className="space-y-1.5 opacity-80">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" /> Zona Lokasi (Terkunci)
                        </label>
                        <div className="relative">
                            <div 
                                className="w-full px-4 py-2.5 bg-gray-100/50 border border-transparent rounded-xl font-bold text-gray-500 cursor-not-allowed flex items-center justify-between transition-all"
                                title="Zona hanya dapat diubah melalui editor utama"
                            >
                                <span className={selectedZone ? 'text-gray-700' : 'text-gray-400'}>
                                    {selectedZone ? selectedZone.name : 'Zona tidak diset'}
                                </span>
                                <div className="text-gray-300">
                                    <ShieldCheck size={14} />
                                </div>
                            </div>
                        </div>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight ml-1">
                            * Mengikuti pengaturan di editor penawaran
                        </p>
                    </div>

                    <div className="p-4 bg-[#1D1D1B] rounded-2xl flex justify-between items-center shadow-inner">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Volume</div>
                      <div className="text-xl font-black text-white">{formatCurrency(computedQty)} <span className="text-xs text-gray-400">{unitLabel}</span></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Penentuan Harga Satuan</div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Harga Per {unitLabel} (Rp)</label>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">Input Kustom</span>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 group-focus-within:text-[#E30613]">Rp</div>
                            <input 
                                type="number" 
                                value={unitPrice || ''} 
                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                className={`w-full pl-12 pr-4 py-3 bg-white border-2 rounded-2xl font-black text-xl text-gray-900 focus:outline-none transition-all shadow-sm ${isBelowMin ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#E30613] focus:ring-[#E30613]/10'}`}
                            />
                        </div>
                    </div>
                    
                    {/* Visual Comparison Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><History size={10} /> Estimasi Awal</div>
                            <div className="text-xs font-black text-gray-600">Rp {formatCurrency(historicalUnitPrice)}</div>
                        </div>
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="text-[9px] font-black text-blue-400 uppercase mb-1 flex items-center gap-1"><ShieldCheck size={10} /> Harga Minimum</div>
                            <div className="text-xs font-black text-blue-700">Rp {formatCurrency(minPricePerUnit)}</div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                            <span className="text-gray-400">Rincian Markup Zona:</span>
                            <span className="text-blue-600">+{markupPercentage}% + Rp {formatCurrency(flatFee)}</span>
                        </div>
                        {customerInfo && (
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight border-t border-gray-100 pt-2">
                              <span className="text-gray-400">Harga Minimal Customer ({customerInfo.tier}):</span>
                              <span className="text-orange-600">Rp {formatCurrency(customerMinPrice)}</span>
                          </div>
                        )}
                        <p className="text-[9px] text-gray-400 font-medium leading-tight">
                            * Harga minimum otomatis naik berdasarkan zona lokasi dan profil customer.
                        </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Addon Penawaran (Tanpa Ubah Katalog)</h4>
                  <button
                    type="button"
                    onClick={addAddonRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-[#E30613] rounded-lg hover:bg-[#c50511]"
                  >
                    <Plus size={14} />
                    Tambah Addon
                  </button>
                </div>
                <div className="p-4 space-y-3 overflow-visible">
                  {addonDrafts.length === 0 ? (
                    <p className="text-xs text-gray-500">Belum ada addon custom. Tambahkan untuk upgrade spek/aksesoris khusus penawaran ini.</p>
                  ) : (
                    addonDrafts.map((addon) => (
                      <div key={addon.id} className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-3 border border-gray-100 rounded-lg p-3">
                        <div className="md:col-span-3 xl:col-span-4">
                          <SearchDropdown
                            options={addonMaterialSearchOptions}
                            value={addon.materialId || ''}
                            onChange={(nextMaterialId) => {
                              const selected = addonMaterialOptions.find((opt) => opt.id === nextMaterialId)
                              if (!selected) {
                                updateAddon(addon.id, { materialId: null })
                                return
                              }
                              updateAddon(addon.id, {
                                materialId: selected.id,
                                name: selected.label,
                                unit: selected.unit || 'unit',
                                hpp: Number(selected.base_price_per_unit || 0),
                                section: normalizeSectionFromCategory(selected.category),
                              })
                            }}
                            placeholder="Pilih material addon..."
                            searchPlaceholder="Cari material/variant/kategori..."
                          />
                        </div>
                        <input
                          value={addon.name}
                          onChange={(e) => updateAddon(addon.id, { name: e.target.value, materialId: null })}
                          className="md:col-span-3 xl:col-span-3 h-10 px-3 border border-gray-200 rounded-lg text-sm"
                          placeholder="Nama addon"
                        />
                        <select
                          value={addon.section}
                          onChange={(e) => updateAddon(addon.id, { section: e.target.value })}
                          className="md:col-span-2 xl:col-span-2 h-10 px-2 border border-gray-200 rounded-lg text-sm"
                        >
                          {addonSectionOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <select
                          value={addon.mode}
                          onChange={(e) => updateAddon(addon.id, { mode: e.target.value === 'fixed' ? 'fixed' : 'variable' })}
                          className="md:col-span-1 xl:col-span-1 h-10 px-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="variable">Var</option>
                          <option value="fixed">Fix</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={addon.baseQty}
                          onChange={(e) => updateAddon(addon.id, { baseQty: Number(e.target.value || 0) })}
                          className="md:col-span-1 xl:col-span-1 h-10 px-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={addon.hpp}
                          onChange={(e) => updateAddon(addon.id, { hpp: Number(e.target.value || 0) })}
                          className="md:col-span-2 xl:col-span-1 h-10 px-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="HPP"
                        />
                        <div className="md:col-span-6 xl:col-span-12 flex items-center justify-end gap-2">
                          <input
                            value={addon.unit}
                            onChange={(e) => updateAddon(addon.id, { unit: e.target.value })}
                            className="h-9 w-24 px-2 border border-gray-200 rounded-lg text-xs"
                            placeholder="Unit"
                          />
                          <button
                            type="button"
                            onClick={() => removeAddon(addon.id)}
                            className="h-9 w-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                            aria-label="Hapus addon"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* HPP Reference Breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HardHat size={16} className="text-gray-400" />
                    <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Referensi HPP (Modal Produksi)</h4>
                  </div>
                  <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    MODAL: Rp {formatCurrency(totalHpp)}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/40 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wide">
                    <div className="text-gray-600">
                      Baseline Katalog
                      <div className="text-sm font-black text-gray-900 normal-case">Rp {formatCurrency(baselineTotalHpp)}</div>
                    </div>
                    <div className="text-gray-600">
                      Aktual Penawaran
                      <div className="text-sm font-black text-gray-900 normal-case">Rp {formatCurrency(totalHpp)}</div>
                    </div>
                    <div className={hppDelta >= 0 ? 'text-red-600' : 'text-green-600'}>
                      Delta
                      <div className="text-sm font-black normal-case">
                        {hppDelta >= 0 ? '+' : '-'} Rp {formatCurrency(Math.abs(hppDelta))}
                      </div>
                    </div>
                </div>
                {!hasBaseline && (
                  <div className="px-4 py-2 border-b border-gray-100 text-[11px] font-semibold text-amber-700 bg-amber-50/70">
                    Baseline tabel belum tersedia untuk item lama. Ditampilkan fallback dari snapshot biaya terakhir item ini.
                  </div>
                )}
                {overrideEditor && (
                  <div className="p-4 border-b border-gray-100 bg-red-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wide">
                        Ganti Material: {overrideEditor.targetName}
                      </p>
                      <button
                        type="button"
                        onClick={() => setOverrideEditor(null)}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-800"
                      >
                        Tutup
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                      <div className="lg:col-span-6 min-w-0">
                        <SearchDropdown
                          options={addonMaterialSearchOptions}
                          value={overrideEditor.materialId || ''}
                          onChange={(nextMaterialId) => {
                            const selected = addonMaterialOptions.find((opt) => opt.id === nextMaterialId)
                            if (!selected) {
                              setOverrideEditor((prev) => (prev ? { ...prev, materialId: null } : prev))
                              return
                            }
                            setOverrideEditor((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    materialId: selected.id,
                                    name: selected.label,
                                    unit: selected.unit || 'unit',
                                    hpp: Number(selected.base_price_per_unit || 0),
                                    section: normalizeSectionFromCategory(selected.category),
                                  }
                                : prev,
                            )
                          }}
                          placeholder="Pilih material pengganti..."
                          searchPlaceholder="Cari material/variant/kategori..."
                        />
                      </div>
                      <input
                        value={overrideEditor.name}
                        onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, name: e.target.value, materialId: null } : prev))}
                        className="lg:col-span-4 h-10 w-full min-w-0 px-3 border border-gray-200 rounded-lg text-sm"
                        placeholder="Nama material"
                      />
                      <select
                        value={overrideEditor.section}
                        onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, section: e.target.value } : prev))}
                        className="lg:col-span-2 h-10 w-full px-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {addonSectionOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select
                        value={overrideEditor.mode}
                        onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, mode: e.target.value === 'fixed' ? 'fixed' : 'variable' } : prev))}
                        className="sm:col-span-1 lg:col-span-2 h-10 w-full px-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="variable">Var</option>
                        <option value="fixed">Fix</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={overrideEditor.baseQty}
                        onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, baseQty: Number(e.target.value || 0) } : prev))}
                        className="sm:col-span-1 lg:col-span-1 h-10 w-full px-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={overrideEditor.hpp}
                        onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, hpp: Number(e.target.value || 0) } : prev))}
                        className="sm:col-span-2 lg:col-span-3 h-10 w-full px-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="HPP"
                      />
                      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <input
                          value={overrideEditor.unit}
                          onChange={(e) => setOverrideEditor((prev) => (prev ? { ...prev, unit: e.target.value } : prev))}
                          className="h-10 w-full px-3 border border-gray-200 rounded-lg text-sm"
                          placeholder="Unit"
                        />
                        <button
                          type="button"
                          onClick={() => removeOverride(overrideEditor.targetId)}
                          className="h-10 w-full px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-[11px] font-black uppercase whitespace-nowrap"
                        >
                          Batalkan Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!overrideEditor.name.trim()) return
                            upsertOverride(overrideEditor)
                            setOverrideEditor(null)
                          }}
                          className="h-10 w-full px-3 rounded-lg border border-[#E30613] text-white bg-[#E30613] hover:bg-[#c50511] text-[11px] font-black uppercase whitespace-nowrap"
                        >
                          Simpan Pengganti
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                        <th className="p-4">Komponen Material</th>
                        <th className="p-4 text-center">Volume</th>
                        <th className="p-4 text-right">HPP Satuan</th>
                        <th className="p-4 text-right">Subtotal</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {groupedCostingItems.map((group) => (
                        <Fragment key={`group-${group.key}`}>
                          <tr>
                            <td colSpan={5} className="p-0">
                              <div className="bg-gray-50/80 border-y border-gray-100 px-4 py-2 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                                  Segmen: {group.label}
                                </span>
                                <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide">
                                  Subtotal Rp {formatCurrency(group.subtotal)}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {group.items.map((item, idx) => (
                            <tr key={`${group.key}-${item.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-gray-800">{item.name}</div>
                                <div className="text-[9px] text-gray-400 uppercase font-black">{group.label}</div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="font-black text-gray-900">{formatCurrency(item.qtyCharged)}</span>
                                <span className="text-[9px] text-gray-400 ml-1 uppercase">{item.unit}</span>
                              </td>
                              <td className="p-4 text-right text-gray-500 font-medium">Rp {formatCurrency(item.hpp)}</td>
                              <td className="p-4 text-right font-black text-gray-900">Rp {formatCurrency(item.subtotal)}</td>
                              <td className="p-4 text-right">
                                {String(item.id || '').startsWith('addon-') ? (
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Addon</span>
                                ) : String(item.id || '').startsWith('override-') ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const source = item as CostingItem & { override_target_id?: string }
                                      if (source.override_target_id) removeOverride(source.override_target_id)
                                    }}
                                    className="text-[10px] font-black text-gray-600 uppercase hover:text-red-600"
                                  >
                                    Batalkan Ganti
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openOverrideEditor(item)}
                                    className="text-[10px] font-black text-[#E30613] uppercase hover:text-[#c50511]"
                                  >
                                    Ganti Material
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      {!isLoadingComponents && costingItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400 uppercase">
                            Belum ada komponen HPP untuk ditampilkan.
                          </td>
                        </tr>
                      )}
                      {isLoadingComponents && (
                          <tr>
                              <td colSpan={5} className="p-12 text-center">
                                  <Loader2 className="animate-spin mx-auto text-gray-300" size={32} />
                                  <p className="mt-2 text-xs font-bold text-gray-400 uppercase">Menghitung modal...</p>
                              </td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Price Status & Action Sidebar */}
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden sticky top-0">
                <div className={`p-6 border-b text-center transition-colors duration-300 ${priceStatus.bg} ${priceStatus.border}`}>
                    <div className="flex justify-center mb-3">
                        <div className={`p-3 rounded-full bg-white shadow-sm ${priceStatus.color}`}>
                            <priceStatus.icon size={28} />
                        </div>
                    </div>
                    <h5 className={`text-[11px] font-black uppercase tracking-[0.2em] ${priceStatus.color}`}>
                        {priceStatus.label}
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium px-4">
                        {isBelowMin 
                            ? "Harga berada di bawah modal + margin + markup zona. Penjualan ini berisiko rugi." 
                            : isNearMin 
                                ? "Harga aman namun tipis. Pastikan volume pekerjaan sudah sesuai." 
                                : "Harga berada dalam batas aman dan menguntungkan."}
                    </p>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Penawaran</p>
                        <h2 className={`text-4xl font-black leading-none transition-colors duration-300 ${priceStatus.color}`}>
                            Rp {formatCurrency(currentTotalAmount)}
                        </h2>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold uppercase">Margin Profit (Est)</span>
                            <span className={`font-black ${isBelowMin ? 'text-red-500' : 'text-green-600'}`}>
                                Rp {formatCurrency(currentTotalAmount - totalHpp)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold uppercase">Deviasi Katalog</span>
                            <div className="flex items-center gap-1 font-black">
                                {unitPrice > defaultUnitPrice ? <ArrowUpCircle size={14} className="text-green-500" /> : <ArrowDownCircle size={14} className="text-red-500" />}
                                <span className={unitPrice > defaultUnitPrice ? 'text-green-600' : 'text-red-600'}>
                                    {defaultUnitPrice > 0 ? Math.round(Math.abs((unitPrice - defaultUnitPrice) / defaultUnitPrice) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/80 space-y-4">
                    <button 
                        onClick={handleSaveBuilder}
                        disabled={isSaving || isLoadingComponents || isBelowMin}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${isBelowMin ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#1D1D1B] text-white hover:bg-gray-800'}`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        {isSaving ? 'Menyimpan...' : 'Finalisasi Penawaran'}
                    </button>
                    
                    {isBelowMin && (
                        <div className="flex items-start gap-2 p-3 bg-red-100/50 border border-red-200 rounded-xl shadow-sm">
                            <ShieldAlert size={16} className="text-red-600 shrink-0" />
                            <p className="text-[9px] font-bold text-red-800 uppercase leading-tight">
                                Sistem mengunci tombol simpan karena harga di bawah ambang batas minimum (HPP + Margin + Markup).
                            </p>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
