'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import { Plus, Trash2, Package, Ruler, CheckSquare, DollarSign, Wrench } from 'lucide-react'
import SearchDropdown, { type SearchDropdownOption } from './SearchDropdown'

type AddonRow = {
  id?: string
  material_id: string
  material_category?: string
  is_optional: boolean
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
  basis?: 'm2' | 'm1' | 'unit'
  qty_per_basis?: number
}

type MaterialCategoryOption = {
  code: string
  name: string
}

export default function CatalogAddonsEditor({
  materials,
  materialCategories = [],
  initialAddons = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'>)[]
  materialCategories?: MaterialCategoryOption[]
  initialAddons?: AddonRow[]
}) {
  const [rows, setRows] = useState<AddonRow[]>(
    initialAddons.map((a: AddonRow) => ({
      id: a.id,
      material_id: a.material_id,
      material_category: a.material?.category ?? '',
      is_optional: a.is_optional,
      material: a.material,
      basis: a.basis ?? 'm2',
      qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
    }))
  )

  const materialMap = useMemo(() => new Map(materials.map((x) => [x.id, x])), [materials])
  const materialCategoryNameMap = useMemo(
    () => new Map(materialCategories.map((item) => [item.code.toLowerCase(), item.name])),
    [materialCategories],
  )
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, typeof materials> = {}
    for (const m of materials) {
      const key = String(m.category ?? 'lainnya').toLowerCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }
    return groups
  }, [materials])
  const materialCategoryOptions = useMemo<SearchDropdownOption[]>(
    () =>
      Object.keys(groupedMaterials)
        .sort((a, b) => a.localeCompare(b))
        .map((category) => ({
          value: category,
          label: materialCategoryNameMap.get(category) ?? category,
        })),
    [groupedMaterials, materialCategoryNameMap],
  )
  const basisOptions: SearchDropdownOption[] = [
    { value: 'm2', label: 'm²' },
    { value: 'm1', label: 'm¹' },
    { value: 'unit', label: 'unit' },
  ]

  useEffect(() => {
    if (initialAddons.length > 0 && rows.length === 0) {
      setRows(
        initialAddons.map((a: AddonRow) => ({
          id: a.id,
          material_id: a.material_id,
          material_category: a.material?.category ?? '',
          is_optional: a.is_optional,
          material: a.material,
          basis: a.basis ?? 'm2',
          qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
        }))
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddons])

  const addRow = () => {
    const firstMaterial = materials[0]
    if (!firstMaterial) return
    setRows((prev) => [
      ...prev,
      {
        material_id: firstMaterial.id,
        material_category: firstMaterial.category ?? '',
        is_optional: true,
        basis: 'm2',
        qty_per_basis: 1,
      },
    ])
  }

  const updateRow = (index: number, patch: Partial<AddonRow>) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const serialized = useMemo(() => {
    return JSON.stringify(
      rows.map((r) => ({
        id: r.id ?? null,
        material_id: r.material_id,
        is_optional: !!r.is_optional,
        basis: r.basis ?? 'm2',
        qty_per_basis: typeof r.qty_per_basis === 'number' ? r.qty_per_basis : 0,
        material_price: materialMap.get(r.material_id)?.base_price_per_unit ?? 0,
        material_category: materialMap.get(r.material_id)?.category ?? 'lainnya',
        material_name: materialMap.get(r.material_id)?.name ?? '',
      }))
    )
  }, [rows, materialMap])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#E30613]" />
          Komponen Tambahan (Addons)
        </h3>
        <button
          type="button"
          onClick={addRow}
          className="h-10 flex items-center gap-2 px-4 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Tambah Baris
        </button>
      </div>

      <input type="hidden" name="addons_json" value={serialized} />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              Belum ada komponen tambahan.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klik &quot;Tambah Baris&quot; untuk menambahkan opsi material ekstra.
            </p>
          </div>
        ) : (
          rows.map((row, idx) => {
            const mat = materialMap.get(row.material_id)
            const selectedCategory = String(
              row.material_category || mat?.category || materialCategoryOptions[0]?.value || '',
            ).toLowerCase()
            const materialOptions: SearchDropdownOption[] = (
              groupedMaterials[selectedCategory] ?? []
            ).map((item) => ({
              value: item.id,
              label: `${item.name}${item.unit ? ` (${item.unit})` : ''}`,
              keywords: `${item.name} ${item.category ?? ''} ${item.unit ?? ''}`,
            }))
            return (
              <div 
                key={idx} 
                className="group relative bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#E30613]/30 transition-all duration-200"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                  
                  {/* Material Selection */}
                  <div className="lg:col-span-5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Package className="w-3 h-3 text-gray-400" /> Material
                    </label>
                    <div className="relative">
                      <div className="space-y-2">
                        <SearchDropdown
                          options={materialCategoryOptions}
                          value={selectedCategory}
                          onChange={(nextCategory) => {
                            const firstInCategory = (groupedMaterials[nextCategory] ?? [])[0]
                            updateRow(idx, {
                              material_category: nextCategory,
                              material_id: firstInCategory?.id ?? '',
                            })
                          }}
                          placeholder="Pilih kategori material..."
                          searchPlaceholder="Cari kategori material..."
                        />
                        <SearchDropdown
                          options={materialOptions}
                          value={row.material_id}
                          onChange={(nextMaterialId) =>
                            updateRow(idx, {
                              material_id: nextMaterialId,
                              material_category:
                                materialMap.get(nextMaterialId)?.category ?? selectedCategory,
                            })
                          }
                          placeholder="Pilih material..."
                          searchPlaceholder="Cari material..."
                          disabled={materialOptions.length === 0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Basis & Qty */}
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-gray-400" /> Basis & Qty
                    </label>
                    <div className="flex gap-2">
                      <div className="w-28">
                        <SearchDropdown
                          options={basisOptions}
                          value={row.basis ?? 'm2'}
                          onChange={(nextValue) =>
                            updateRow(idx, { basis: nextValue as 'm2' | 'm1' | 'unit' })
                          }
                          placeholder="Basis"
                          searchPlaceholder="Cari basis..."
                        />
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                        value={typeof row.qty_per_basis === 'number' ? row.qty_per_basis : 0}
                        onChange={(e) => updateRow(idx, { qty_per_basis: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {/* Optional Checkbox */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-gray-400" /> Opsional?
                    </label>
                    <label className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer h-4 w-4 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613] cursor-pointer"
                          checked={row.is_optional}
                          onChange={(e) => updateRow(idx, { is_optional: e.target.checked })}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 select-none">Ya, Opsional</span>
                    </label>
                  </div>

                  {/* Subtotal Display */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" /> Est. Harga
                    </label>
                    <div className="w-full px-3 py-2.5 bg-gray-100 border border-transparent rounded-lg text-sm font-black text-gray-700 text-right">
                      Rp {(
                        (mat?.base_price_per_unit || 0) *
                        (typeof row.qty_per_basis === 'number' ? row.qty_per_basis : 0)
                      ).toLocaleString('id-ID')}
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="mt-2 w-full lg:w-auto px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hapus Baris"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </span>
                    </button>
                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
