'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import {
  Plus,
  Trash2,
  Package,
  Box,
  DollarSign,
  Calculator,
  Copy,
  ChevronDown,
  GripVertical,
  MoveVertical,
} from 'lucide-react'
import { fetchCatalogHppComponents } from '@/app/actions/catalogs'
import SearchDropdown, { type SearchDropdownOption } from './SearchDropdown'

type HppComponentRow = {
  id?: string
  material_id?: string | null
  material_category?: string
  source_catalog_id?: string | null
  quantity: number
  section?: string
  note?: string
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
  source_catalog?: { id: string; title: string; hpp_per_unit?: number | null } | null
}

type CopySourceCatalog = {
  id: string
  title: string
  category?: string | null
  hpp_per_unit?: number | null
}

type HppSection = {
  code: string
  name: string
  sort_order?: number | null
  is_active?: boolean | null
}

type MaterialCategoryOption = {
  code: string
  name: string
}

type UiRow = {
  row: HppComponentRow
  idx: number
  mat: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'> | null
  sourceCatalog: CopySourceCatalog | null
  name: string
  section: string
  subtotal: number
}

const FALLBACK_SECTION_CODES = ['atap', 'rangka', 'isian', 'finishing', 'aksesoris', 'lainnya']

const toLegacyNormalized = (value?: string | null): string => {
  if (!value) return 'lainnya'
  const lowered = value.toLowerCase()
  if (lowered === 'frame') return 'rangka'
  return lowered
}

const formatCategoryLabel = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

export default function CatalogHppEditor({
  materials,
  initialComponents = [],
  copySourceCatalogs = [],
  sections = [],
  materialCategories = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'> & {
    variant_name?: string | null
  })[]
  initialComponents?: HppComponentRow[]
  copySourceCatalogs?: CopySourceCatalog[]
  sections?: HppSection[]
  materialCategories?: MaterialCategoryOption[]
}) {
  const sectionDefs = useMemo(() => {
    const active = (sections ?? []).filter((item) => item.is_active !== false && !!item.code)
    if (active.length === 0) {
      return FALLBACK_SECTION_CODES.map((code, idx) => ({
        code,
        name: code.charAt(0).toUpperCase() + code.slice(1),
        sort_order: (idx + 1) * 10,
      }))
    }
    return active
      .map((item) => ({
        code: String(item.code).toLowerCase(),
        name: item.name || item.code,
        sort_order: item.sort_order ?? 999,
      }))
      .sort((a, b) => Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999))
  }, [sections])

  const sectionCodes = useMemo(() => {
    const normalized = Array.from(new Set(sectionDefs.map((item) => item.code)))
    if (normalized.length === 0) return FALLBACK_SECTION_CODES
    return normalized
  }, [sectionDefs])

  const sectionNameMap = useMemo(
    () => new Map(sectionDefs.map((item) => [item.code, item.name])),
    [sectionDefs],
  )

  const normalizeSection = useCallback(
    (value?: string | null): string => {
      const normalized = toLegacyNormalized(value)
      if (sectionCodes.includes(normalized)) return normalized
      if (sectionCodes.includes('lainnya')) return 'lainnya'
      return sectionCodes[0] ?? 'lainnya'
    },
    [sectionCodes],
  )

  const [rows, setRows] = useState<HppComponentRow[]>(
    initialComponents.map((c: HppComponentRow) => ({
      id: c.id,
      material_id: c.material_id ?? null,
      material_category: c.material?.category ?? undefined,
      source_catalog_id: c.source_catalog_id ?? null,
      quantity: typeof c.quantity === 'number' ? c.quantity : 0,
      section: toLegacyNormalized(c.section),
      note: String(c.note ?? ''),
      material: c.material,
      source_catalog: c.source_catalog ?? null,
    })),
  )
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyCatalogId, setCopyCatalogId] = useState<string>('')
  const [copyFactor, setCopyFactor] = useState<number>(1)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copyPreview, setCopyPreview] = useState<HppComponentRow[]>([])
  const [copyReplace, setCopyReplace] = useState(true)

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next: Record<string, boolean> = {}
      for (const section of sectionCodes) next[section] = prev[section] ?? false
      return next
    })
  }, [sectionCodes])

  const materialMap = useMemo(() => new Map(materials.map((x) => [x.id, x])), [materials])
  const materialCategoryNameMap = useMemo(
    () => new Map(materialCategories.map((item) => [item.code.toLowerCase(), item.name])),
    [materialCategories],
  )
  const catalogMap = useMemo(() => new Map(copySourceCatalogs.map((x) => [x.id, x])), [copySourceCatalogs])
  const sectionFilterOptions = useMemo<SearchDropdownOption[]>(
    () => [
      { value: 'all', label: 'Semua Segmen' },
      ...sectionCodes.map((section) => ({
        value: section,
        label: sectionNameMap.get(section) ?? section,
      })),
    ],
    [sectionCodes, sectionNameMap],
  )
  const rowTypeOptions: SearchDropdownOption[] = [
    { value: 'material', label: 'Material' },
    { value: 'catalog', label: 'Katalog' },
  ]
  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, typeof materials[number][]>()
    for (const material of materials) {
      const categoryKey = String(material.category ?? 'lainnya').toLowerCase()
      const current = groups.get(categoryKey) ?? []
      current.push(material)
      groups.set(categoryKey, current)
    }
    return groups
  }, [materials])
  const materialCategoryOptions = useMemo<SearchDropdownOption[]>(
    () => {
      const categories = Array.from(groupedMaterials.keys()).sort((a, b) => a.localeCompare(b))
      return categories.map((category) => ({
        value: category,
        label: materialCategoryNameMap.get(category) ?? formatCategoryLabel(category),
      }))
    },
    [groupedMaterials, materialCategoryNameMap],
  )
  const sourceCatalogOptions = useMemo<SearchDropdownOption[]>(
    () =>
      copySourceCatalogs.map((catalog) => ({
        value: catalog.id,
        label: `${catalog.title} (${catalog.category || 'lainnya'})`,
        keywords: `${catalog.title} ${catalog.category || ''}`,
      })),
    [copySourceCatalogs],
  )

  const addRow = () => {
    const firstMaterial = materials[0]
    if (!firstMaterial) return
    setRows((prev) => [
      ...prev,
      {
        material_id: firstMaterial.id,
        material_category: String(firstMaterial.category ?? 'lainnya').toLowerCase(),
        source_catalog_id: null,
        quantity: 1,
        section: normalizeSection(firstMaterial.category),
        note: '',
      },
    ])
  }

  const addRowToSection = (targetSection: string) => {
    const firstMaterialInSection =
      materials.find((material) => normalizeSection(material.category) === targetSection) ?? materials[0]
    if (!firstMaterialInSection) return

    const newRow: HppComponentRow = {
      material_id: firstMaterialInSection.id,
      material_category: String(firstMaterialInSection.category ?? 'lainnya').toLowerCase(),
      source_catalog_id: null,
      quantity: 1,
      section: targetSection,
      note: '',
    }

    setRows((prev) => {
      const next = [...prev]
      let insertAt = next.length
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (normalizeSection(next[i].section) === targetSection) {
          insertAt = i + 1
          break
        }
      }
      next.splice(insertAt, 0, newRow)
      return next
    })
  }

  const addCatalogRow = () => {
    const firstCatalog = copySourceCatalogs[0]
    if (!firstCatalog) return
    setRows((prev) => [
      ...prev,
      {
        material_id: null,
        source_catalog_id: firstCatalog.id,
        quantity: 1,
        section: normalizeSection('lainnya'),
        note: '',
      },
    ])
  }

  const applyCopiedRows = (copied: HppComponentRow[]) => {
    if (!copied.length) return
    setRows((prev) => (copyReplace ? copied : [...prev, ...copied]))
    setCopyModalOpen(false)
    setCopyPreview([])
    setCopyCatalogId('')
    setCopyFactor(1)
    setCopyError(null)
  }

  const updateRow = (index: number, patch: Partial<HppComponentRow>) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const moveRow = (fromIndex: number, toIndex: number, targetSection?: string) => {
    if (fromIndex === toIndex) return
    setRows((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, targetSection ? { ...moved, section: targetSection } : moved)
      return next
    })
  }

  const moveRowToSectionEnd = (fromIndex: number, section: string) => {
    setRows((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      let insertAt = next.length
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (normalizeSection(next[i].section) === section) {
          insertAt = i + 1
          break
        }
      }
      next.splice(insertAt, 0, { ...moved, section })
      return next
    })
  }

  const serialized = useMemo(() => {
    return JSON.stringify(
      rows.map((r) => ({
        id: r.id ?? null,
        material_id: r.material_id ?? null,
        source_catalog_id: r.source_catalog_id ?? null,
        quantity: typeof r.quantity === 'number' ? r.quantity : 0,
        section: normalizeSection(r.section),
        note: String(r.note ?? ''),
      })),
    )
  }, [rows, normalizeSection])

  const visibleRows = useMemo<UiRow[]>(() => {
    const q = search.trim().toLowerCase()
    return rows
      .map((row, idx) => {
        const mat = row.material_id ? materialMap.get(row.material_id) ?? null : null
        const sourceCatalog = row.source_catalog_id ? catalogMap.get(row.source_catalog_id) ?? null : null
        const section = normalizeSection(row.section)
        const name = mat?.name || sourceCatalog?.title || ''
        const subtotal =
          Number(row.quantity || 0) *
          (row.material_id ? Number(mat?.base_price_per_unit || 0) : Number(sourceCatalog?.hpp_per_unit || 0))
        return { row, idx, mat, sourceCatalog, name, section, subtotal }
      })
      .filter((item) => (sectionFilter === 'all' ? true : item.section === sectionFilter))
      .filter((item) => (q ? `${item.name} ${item.section}`.toLowerCase().includes(q) : true))
  }, [rows, search, sectionFilter, materialMap, catalogMap, normalizeSection])

  const rowsBySection = useMemo(() => {
    const mapped = new Map<string, UiRow[]>()
    for (const section of sectionCodes) mapped.set(section, [])
    for (const item of visibleRows) {
      const current = mapped.get(item.section) ?? []
      current.push(item)
      mapped.set(item.section, current)
    }
    return mapped
  }, [visibleRows, sectionCodes])

  const sectionSummary = useMemo(() => {
    const summary = new Map<string, { count: number; subtotal: number }>()
    for (const section of sectionCodes) {
      const items = rowsBySection.get(section) ?? []
      summary.set(section, {
        count: items.length,
        subtotal: items.reduce((sum, row) => sum + row.subtotal, 0),
      })
    }
    return summary
  }, [rowsBySection, sectionCodes])

  const totalCost = useMemo(() => visibleRows.reduce((sum, row) => sum + row.subtotal, 0), [visibleRows])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#E30613]" />
          Komponen Biaya HPP
        </h3>
        <div className="flex items-center gap-2">
          {copySourceCatalogs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCopyModalOpen(true)
                setCopyError(null)
              }}
              className="h-10 flex items-center gap-2 px-4 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm active:scale-95"
            >
              <Copy className="w-4 h-4" />
              Copy Komponen dari Katalog
            </button>
          )}
          <button
            type="button"
            onClick={addCatalogRow}
            className="h-10 flex items-center gap-2 px-4 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Katalog
          </button>
          <button
            type="button"
            onClick={addRow}
            className="h-10 flex items-center gap-2 px-4 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Komponen
          </button>
        </div>
      </div>

      <input type="hidden" name="hpp_components_json" value={serialized} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari komponen..."
          className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm bg-white"
        />
        <SearchDropdown
          options={sectionFilterOptions}
          value={sectionFilter}
          onChange={setSectionFilter}
          placeholder="Pilih segmen..."
          searchPlaceholder="Cari segmen..."
        />
        <div className="h-11 px-3 bg-white rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 flex items-center">
          Menampilkan {visibleRows.length} dari {rows.length} komponen
        </div>
      </div>

      {rows.length > 0 && (
        <div className="sticky top-3 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-semibold text-gray-700">
              <MoveVertical className="w-4 h-4 text-gray-500" />
              Drag komponen untuk reorder atau pindah segmen.
            </div>
            <div className="font-black text-[#E30613]">Total visible: Rp {totalCost.toLocaleString('id-ID')}</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Belum ada komponen HPP.</p>
            <p className="text-xs text-gray-400 mt-1">Klik &quot;Tambah Komponen&quot; untuk mulai menyusun formulasi harga.</p>
          </div>
        ) : (
          sectionCodes.map((section) => {
            const items = rowsBySection.get(section) ?? []
            const stats = sectionSummary.get(section)
            const isCollapsed = collapsedSections[section]
            return (
              <section
                key={section}
                className="border border-gray-200 rounded-xl bg-white"
                onDragOver={(e) => {
                  if (draggingIndex === null) return
                  e.preventDefault()
                }}
                onDrop={(e) => {
                  if (draggingIndex === null) return
                  e.preventDefault()
                  moveRowToSectionEnd(draggingIndex, section)
                  setDraggingIndex(null)
                }}
              >
                <div className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-t-xl">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left min-w-0"
                    onClick={() => setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))}
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{sectionNameMap.get(section) ?? section}</p>
                      <p className="text-xs text-gray-500">{stats?.count ?? 0} item</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => addRowToSection(section)}
                      className="h-9 px-3 rounded-lg border border-[#E30613]/30 text-[#E30613] text-xs font-semibold hover:bg-[#E30613]/5 transition-colors"
                    >
                      + Tambah Komponen
                    </button>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">Subtotal Segmen</p>
                      <p className="text-sm font-black text-[#1D1D1B]">Rp {(stats?.subtotal ?? 0).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    {items.length === 0 ? (
                      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
                        Belum ada komponen di segmen ini.
                      </div>
                    ) : (
                      items.map(({ row, idx, mat, sourceCatalog, subtotal }) => {
                        const selectedMaterialCategory = String(
                          row.material_category ||
                            mat?.category ||
                            materialCategoryOptions[0]?.value ||
                            'lainnya',
                        ).toLowerCase()
                        const materialOptions: SearchDropdownOption[] = (
                          groupedMaterials.get(selectedMaterialCategory) ?? []
                        ).map((materialOption) => ({
                          value: materialOption.id,
                          label: (() => {
                            const variant =
                              materialOption.variant_name &&
                              materialOption.variant_name.toLowerCase() !== 'default'
                                ? ` - ${materialOption.variant_name}`
                                : ''
                            const unit = materialOption.unit ? ` (${materialOption.unit})` : ''
                            return `${materialOption.name}${variant}${unit}`
                          })(),
                          keywords: `${materialOption.name} ${materialOption.category ?? ''} ${
                            materialOption.unit ?? ''
                          } ${
                            materialOption.variant_name ?? ''
                          }`,
                        }))
                        return (
                        <div
                          key={row.id ? `${row.id}-${idx}` : `new-${idx}`}
                          draggable
                          onDragStart={() => setDraggingIndex(idx)}
                          onDragEnd={() => setDraggingIndex(null)}
                          onDragOver={(e) => {
                            if (draggingIndex === null) return
                            e.preventDefault()
                          }}
                          onDrop={(e) => {
                            if (draggingIndex === null) return
                            e.preventDefault()
                            moveRow(draggingIndex, idx, section)
                            setDraggingIndex(null)
                          }}
                          className={`group relative bg-white p-5 rounded-xl border shadow-sm transition-all duration-200 2xl:max-w-[1500px] 2xl:mx-auto ${
                            draggingIndex === idx
                              ? 'border-[#E30613] opacity-70'
                              : 'border-gray-200 hover:shadow-md hover:border-[#E30613]/30'
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 md:gap-5 items-end">
                            <div className="md:col-span-1 xl:col-span-1">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Move</label>
                              <div className="h-[42px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="md:col-span-5 xl:col-span-7">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Package className="w-3 h-3 text-gray-400" /> Komponen
                              </label>
                              <div className="space-y-2">
                                <SearchDropdown
                                  options={rowTypeOptions}
                                  value={row.material_id ? 'material' : 'catalog'}
                                  onChange={(nextType) => {
                                    if (nextType === 'catalog') {
                                      const firstCatalog = copySourceCatalogs[0]
                                      updateRow(idx, {
                                        material_id: null,
                                        material_category: undefined,
                                        source_catalog_id: firstCatalog?.id ?? null,
                                        section,
                                      })
                                      return
                                    }
                                    const firstMaterial = materials[0]
                                    updateRow(idx, {
                                      material_id: firstMaterial?.id ?? null,
                                      material_category: String(
                                        firstMaterial?.category ?? 'lainnya',
                                      ).toLowerCase(),
                                      source_catalog_id: null,
                                      section,
                                    })
                                  }}
                                  placeholder="Tipe komponen..."
                                  searchPlaceholder="Cari tipe..."
                                />
                                {row.material_id ? (
                                  <div className="space-y-2">
                                    <SearchDropdown
                                      options={materialCategoryOptions}
                                      value={selectedMaterialCategory}
                                      onChange={(nextCategory) => {
                                        const firstMaterialInCategory =
                                          (groupedMaterials.get(nextCategory) ?? [])[0]
                                        updateRow(idx, {
                                          material_category: nextCategory,
                                          material_id: firstMaterialInCategory?.id ?? null,
                                          source_catalog_id: null,
                                        })
                                      }}
                                      placeholder="Pilih Kategori Material..."
                                      searchPlaceholder="Cari Kategori Material..."
                                    />
                                    <SearchDropdown
                                      options={materialOptions}
                                      value={row.material_id ?? ''}
                                      onChange={(nextMaterialId) => {
                                        const selected = materialMap.get(nextMaterialId)
                                        updateRow(idx, {
                                          material_id: nextMaterialId,
                                          material_category: String(
                                            selected?.category ?? 'lainnya',
                                          ).toLowerCase(),
                                          source_catalog_id: null,
                                        })
                                      }}
                                      placeholder="Pilih material..."
                                      searchPlaceholder="Cari material..."
                                      disabled={materialOptions.length === 0}
                                    />
                                  </div>
                                ) : (
                                  <SearchDropdown
                                    options={sourceCatalogOptions}
                                    value={row.source_catalog_id ?? ''}
                                    onChange={(nextCatalogId) =>
                                      updateRow(idx, {
                                        source_catalog_id: nextCatalogId,
                                        material_id: null,
                                        material_category: undefined,
                                      })
                                    }
                                    placeholder="Pilih katalog sumber..."
                                    searchPlaceholder="Cari katalog sumber..."
                                  />
                                )}
                              </div>
                            </div>

                            <div className="md:col-span-3 xl:col-span-2">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Box className="w-3 h-3 text-gray-400" /> Qty
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="w-full pl-3 pr-12 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900"
                                  value={typeof row.quantity === 'number' ? row.quantity : 0}
                                  onChange={(e) => updateRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                    {row.material_id ? (mat?.unit ?? '-') : 'paket'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="md:col-span-3 xl:col-span-2">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-gray-400" /> Subtotal
                              </label>
                              <div className="w-full px-3 py-2.5 bg-gray-100 border border-transparent rounded-lg text-sm font-black text-gray-700 text-right">
                                Rp {subtotal.toLocaleString('id-ID')}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="mt-2 w-full md:w-auto px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                title="Hapus Komponen"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Hapus
                                </span>
                              </button>
                            </div>

                            <div className="md:col-span-6 xl:col-span-12">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Catatan BOM
                              </label>
                              <textarea
                                value={String(row.note ?? '')}
                                onChange={(e) => updateRow(idx, { note: e.target.value })}
                                placeholder="Contoh: wajib pakai bracket L tiap 1m, sambungan overlap 15 cm, dll."
                                className="w-full min-h-[70px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              />
                            </div>
                          </div>
                          {!row.material_id && (
                            <p className="mt-2 text-[11px] text-gray-500">
                              Sumber biaya dari HPP katalog: {sourceCatalog?.title || '-'}
                            </p>
                          )}
                        </div>
                        )
                      })
                    )}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      {copyModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#E30613]" />
                Copy Komponen HPP dari Katalog
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (!copyLoading) setCopyModalOpen(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Pilih Katalog Sumber
                  </label>
                  <SearchDropdown
                    options={sourceCatalogOptions}
                    value={copyCatalogId}
                    onChange={setCopyCatalogId}
                    placeholder="-- Pilih Katalog --"
                    searchPlaceholder="Cari katalog..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Faktor Penyesuaian Qty
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={copyFactor}
                    onChange={(e) => setCopyFactor(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Contoh: 2 untuk proyek dua kali lebih besar dari katalog sumber.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613]"
                    checked={copyReplace}
                    onChange={(e) => setCopyReplace(e.target.checked)}
                  />
                  Ganti komponen HPP yang ada dengan hasil copy
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!copyCatalogId || copyLoading}
                    onClick={async () => {
                      if (!copyCatalogId) {
                        setCopyError('Silakan pilih katalog sumber terlebih dahulu')
                        return
                      }
                      setCopyLoading(true)
                      setCopyError(null)
                      try {
                        const raw = await fetchCatalogHppComponents(copyCatalogId)
                        type RawHpp = {
                          material_id?: string | null
                          source_catalog_id?: string | null
                          quantity: number
                          section?: string | null
                          note?: string | null
                        }
                        const rawRows: RawHpp[] = (Array.isArray(raw) ? (raw as unknown[]) : [])
                          .map((item) => {
                            const safe = typeof item === 'object' && item !== null
                              ? (item as Record<string, unknown>)
                              : {}
                            return {
                              material_id:
                                typeof safe.material_id === 'string' ? safe.material_id : null,
                              source_catalog_id:
                                typeof safe.source_catalog_id === 'string'
                                  ? safe.source_catalog_id
                                  : null,
                              quantity:
                                typeof safe.quantity === 'number'
                                  ? safe.quantity
                                  : Number(safe.quantity || 0),
                              section:
                                typeof safe.section === 'string' ? safe.section : null,
                              note: typeof safe.note === 'string' ? safe.note : null,
                            }
                          })
                        const normalized: HppComponentRow[] = rawRows.map((c) => {
                          const mat = c.material_id ? materialMap.get(c.material_id) : undefined
                          const sourceCatalog = c.source_catalog_id
                            ? catalogMap.get(c.source_catalog_id)
                            : undefined
                          return {
                            id: undefined,
                            material_id: c.material_id ?? null,
                            source_catalog_id: c.source_catalog_id ?? null,
                            quantity:
                              typeof c.quantity === 'number'
                                ? Number(c.quantity) * (copyFactor || 1)
                                : 0,
                            section: normalizeSection(c.section || mat?.category),
                            note: String(c.note ?? ''),
                            material: mat,
                            source_catalog: sourceCatalog ?? null,
                          }
                        })
                        const filtered = normalized.filter((r) =>
                          r.material_id ? materialMap.has(r.material_id) : !!r.source_catalog_id,
                        )
                        if (!filtered.length) {
                          setCopyError(
                            'Tidak ada komponen yang cocok dengan daftar material di proyek ini.',
                          )
                        } else {
                          setCopyPreview(filtered)
                        }
                      } catch (e) {
                        setCopyError(
                          e instanceof Error
                            ? e.message
                            : 'Gagal mengambil komponen HPP dari katalog sumber',
                        )
                      } finally {
                        setCopyLoading(false)
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copyLoading ? 'Memuat...' : 'Preview Komponen'}
                  </button>
                  {copyPreview.length > 0 && (
                    <button
                      type="button"
                      onClick={() => applyCopiedRows(copyPreview)}
                      className="px-4 py-2 rounded-lg bg-[#E30613] text-white text-xs font-semibold hover:bg-[#c50511]"
                    >
                      Copy ke Formulir HPP
                    </button>
                  )}
                </div>
              </div>

              {copyError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {copyError}
                </div>
              )}

              {copyPreview.length > 0 && (
                <div className="border border-gray-200 rounded-lg mt-2 max-h-72 overflow-auto">
                  <table className="min-w-full text-[11px] leading-snug">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600">
                          Material
                        </th>
                        <th className="px-2.5 py-1.5 text-left font-semibold text-gray-600">
                          Segmen
                        </th>
                        <th className="px-2.5 py-1.5 text-right font-semibold text-gray-600">
                          Qty (disesuaikan)
                        </th>
                        <th className="px-2.5 py-1.5 text-right font-semibold text-gray-600">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {copyPreview.map((r, idx) => {
                        const mat = r.material_id ? materialMap.get(r.material_id) : null
                        const sourceCatalog = r.source_catalog_id ? catalogMap.get(r.source_catalog_id) : null
                        const qty = typeof r.quantity === 'number' ? r.quantity : 0
                        const subtotal = (r.material_id ? (mat?.base_price_per_unit || 0) : Number(sourceCatalog?.hpp_per_unit || 0)) * qty
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-2.5 py-1">
                              <div className="font-medium text-gray-800 truncate max-w-xs">
                                {mat?.name ?? sourceCatalog?.title ?? r.material_id ?? r.source_catalog_id}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {r.material_id ? (mat?.unit ? `Unit: ${mat.unit}` : null) : 'Sumber: Katalog'}
                              </div>
                            </td>
                            <td className="px-2.5 py-1 text-gray-700 whitespace-nowrap">
                              {normalizeSection(r.section || mat?.category)}
                            </td>
                            <td className="px-2.5 py-1 text-right whitespace-nowrap">
                              {qty.toLocaleString('id-ID')}
                            </td>
                            <td className="px-2.5 py-1 text-right whitespace-nowrap">
                              Rp {subtotal.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
