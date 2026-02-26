'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import { Plus, Trash2, Package, Ruler, CheckSquare, DollarSign, Wrench } from 'lucide-react'

type AddonRow = {
  id?: string
  material_id: string
  is_optional: boolean
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
  basis?: 'm2' | 'm1' | 'unit'
  qty_per_basis?: number
}

export default function CatalogAddonsEditor({
  materials,
  initialAddons = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'>)[]
  initialAddons?: AddonRow[]
}) {
  const [rows, setRows] = useState<AddonRow[]>(
    initialAddons.map((a: AddonRow) => ({
      id: a.id,
      material_id: a.material_id,
      is_optional: a.is_optional,
      material: a.material,
      basis: a.basis ?? 'm2',
      qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
    }))
  )

  const materialMap = useMemo(() => new Map(materials.map((x) => [x.id, x])), [materials])
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, typeof materials> = { 
      atap: [], 
      frame: [], 
      finishing: [],
      isian: [],
      aksesoris: [], 
      lainnya: [] 
    }
    for (const m of materials) {
      if (groups[m.category]) groups[m.category].push(m)
      else groups.lainnya.push(m)
    }
    return groups
  }, [materials])

  useEffect(() => {
    if (initialAddons.length > 0 && rows.length === 0) {
      setRows(
        initialAddons.map((a: AddonRow) => ({
          id: a.id,
          material_id: a.material_id,
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
          className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
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
                      <select
                        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all appearance-none cursor-pointer"
                        value={row.material_id}
                        onChange={(e) => updateRow(idx, { material_id: e.target.value })}
                      >
                        {(['atap','frame','aksesoris','lainnya'] as const).map((cat) => (
                          <optgroup key={cat} label={cat.toUpperCase()} className="font-bold">
                            {groupedMaterials[cat].map((m) => (
                              <option key={m.id} value={m.id} className="font-normal text-gray-600">
                                {m.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* Basis & Qty */}
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-gray-400" /> Basis & Qty
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                        value={row.basis ?? 'm2'}
                        onChange={(e) => updateRow(idx, { basis: e.target.value as 'm2' | 'm1' | 'unit' })}
                      >
                        <option value="m2">m²</option>
                        <option value="m1">m¹</option>
                        <option value="unit">unit</option>
                      </select>
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
                  <div className="lg:col-span-2 relative">
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
                      className="absolute -top-1 -right-1 lg:-right-4 lg:top-8 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-4 h-4" />
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
