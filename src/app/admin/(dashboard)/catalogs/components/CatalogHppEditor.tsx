'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import {
  Plus,
  Trash2,
  Package,
  Layers,
  Box,
  DollarSign,
  Calculator,
  Copy,
  ChevronDown,
  GripVertical,
  MoveVertical,
} from 'lucide-react'
import { fetchCatalogHppComponents } from '@/app/actions/catalogs'

type HppComponentRow = {
  id?: string
  material_id?: string | null
  source_catalog_id?: string | null
  quantity: number
  section?: string
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

export default function CatalogHppEditor({
  materials,
  initialComponents = [],
  copySourceCatalogs = [],
  sections = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'>)[]
  initialComponents?: HppComponentRow[]
  copySourceCatalogs?: CopySourceCatalog[]
  sections?: HppSection[]
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

  const normalizeSection = (value?: string | null): string => {
    const normalized = toLegacyNormalized(value)
    if (sectionCodes.includes(normalized)) return normalized
    if (sectionCodes.includes('lainnya')) return 'lainnya'
    return sectionCodes[0] ?? 'lainnya'
  }

  const [rows, setRows] = useState<HppComponentRow[]>(
    initialComponents.map((c: HppComponentRow) => ({
      id: c.id,
      material_id: c.material_id ?? null,
      source_catalog_id: c.source_catalog_id ?? null,
      quantity: typeof c.quantity === 'number' ? c.quantity : 0,
      section: toLegacyNormalized(c.section),
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
  const catalogMap = useMemo(() => new Map(copySourceCatalogs.map((x) => [x.id, x])), [copySourceCatalogs])
  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, typeof materials[number][]>()
    for (const section of sectionCodes) groups.set(section, [])
    for (const m of materials) {
      const section = normalizeSection(m.category)
      const current = groups.get(section) ?? []
      current.push(m)
      groups.set(section, current)
    }
    return groups
  }, [materials, sectionCodes])

  const addRow = () => {
    const firstMaterial = materials[0]
    if (!firstMaterial) return
    setRows((prev) => [
      ...prev,
      {
        material_id: firstMaterial.id,
        source_catalog_id: null,
        quantity: 1,
        section: normalizeSection(firstMaterial.category),
      },
    ])
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
      })),
    )
  }, [rows])

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
  }, [rows, search, sectionFilter, materialMap, catalogMap])

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
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm active:scale-95"
            >
              <Copy className="w-4 h-4" />
              Copy Komponen dari Katalog
            </button>
          )}
          <button
            type="button"
            onClick={addCatalogRow}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all text-sm font-semibold shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Katalog
          </button>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
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
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        />
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option value="all">Semua Segmen</option>
          {sectionCodes.map((section) => (
            <option key={section} value={section}>
              {sectionNameMap.get(section) ?? section}
            </option>
          ))}
        </select>
        <div className="px-3 py-2 bg-white rounded-md border border-gray-200 text-sm font-semibold text-gray-700">
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
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-xl"
                  onClick={() => setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{sectionNameMap.get(section) ?? section}</p>
                      <p className="text-xs text-gray-500">{stats?.count ?? 0} item</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-500">Subtotal Segmen</p>
                    <p className="text-sm font-black text-[#1D1D1B]">Rp {(stats?.subtotal ?? 0).toLocaleString('id-ID')}</p>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <div className="sticky top-20 z-[1] bg-white/95 backdrop-blur rounded-lg border border-gray-100 px-3 py-2 mt-3 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">Ringkasan {section}</span>
                      <span className="font-bold text-[#E30613]">
                        {stats?.count ?? 0} item | Rp {(stats?.subtotal ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
                        Belum ada komponen di segmen ini.
                      </div>
                    ) : (
                      items.map(({ row, idx, mat, sourceCatalog, subtotal }) => (
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
                          className={`group relative bg-white p-5 rounded-xl border shadow-sm transition-all duration-200 ${
                            draggingIndex === idx
                              ? 'border-[#E30613] opacity-70'
                              : 'border-gray-200 hover:shadow-md hover:border-[#E30613]/30'
                          }`}
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                            <div className="lg:col-span-1">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Move</label>
                              <div className="h-[42px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="lg:col-span-4">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Package className="w-3 h-3 text-gray-400" /> Komponen
                              </label>
                              <div className="space-y-2">
                                <select
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                                  value={row.material_id ? 'material' : 'catalog'}
                                  onChange={(e) => {
                                    if (e.target.value === 'catalog') {
                                      const firstCatalog = copySourceCatalogs[0]
                                      updateRow(idx, {
                                        material_id: null,
                                        source_catalog_id: firstCatalog?.id ?? null,
                                        section,
                                      })
                                      return
                                    }
                                    const firstMaterial = materials[0]
                                    updateRow(idx, {
                                      material_id: firstMaterial?.id ?? null,
                                      source_catalog_id: null,
                                      section: normalizeSection(firstMaterial?.category),
                                    })
                                  }}
                                >
                                  <option value="material">Material</option>
                                  <option value="catalog">Katalog</option>
                                </select>
                                {row.material_id ? (
                                  <select
                                    className="w-full pl-3 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800"
                                    value={row.material_id}
                                    onChange={(e) => {
                                      const selected = materialMap.get(e.target.value)
                                      updateRow(idx, {
                                        material_id: e.target.value,
                                        source_catalog_id: null,
                                        section: normalizeSection(selected?.category),
                                      })
                                    }}
                                  >
                                    {sectionCodes.map((cat) => (
                                      <optgroup key={cat} label={cat.toUpperCase()}>
                                        {(groupedMaterials.get(cat) ?? []).map((m) => (
                                          <option key={m.id} value={m.id}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                ) : (
                                  <select
                                    className="w-full pl-3 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800"
                                    value={row.source_catalog_id ?? ''}
                                    onChange={(e) => updateRow(idx, { source_catalog_id: e.target.value, material_id: null })}
                                  >
                                    <option value="">Pilih katalog sumber...</option>
                                    {copySourceCatalogs.map((catalog) => (
                                      <option key={catalog.id} value={catalog.id}>
                                        {catalog.title} ({catalog.category || 'lainnya'})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-gray-400" /> Segmen
                              </label>
                              <select
                                className="w-full pl-3 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800"
                                value={normalizeSection(row.section)}
                                onChange={(e) => updateRow(idx, { section: normalizeSection(e.target.value) })}
                              >
                                {sectionCodes.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {sectionNameMap.get(opt) ?? opt}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="lg:col-span-2">
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

                            <div className="lg:col-span-2 relative">
                              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-gray-400" /> Subtotal
                              </label>
                              <div className="w-full px-3 py-2.5 bg-gray-100 border border-transparent rounded-lg text-sm font-black text-gray-700 text-right">
                                Rp {subtotal.toLocaleString('id-ID')}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="absolute -top-1 -right-1 lg:-right-4 lg:top-8 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all lg:opacity-0 lg:group-hover:opacity-100"
                                title="Hapus Komponen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {!row.material_id && (
                            <p className="mt-2 text-[11px] text-gray-500">
                              Sumber biaya dari HPP katalog: {sourceCatalog?.title || '-'}
                            </p>
                          )}
                        </div>
                      ))
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
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                    value={copyCatalogId}
                    onChange={(e) => setCopyCatalogId(e.target.value)}
                  >
                    <option value="">-- Pilih Katalog --</option>
                    {copySourceCatalogs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} {c.category ? `(${c.category})` : ''}
                      </option>
                    ))}
                  </select>
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
                        }
                        const normalized: HppComponentRow[] = (raw as RawHpp[]).map((c) => {
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
