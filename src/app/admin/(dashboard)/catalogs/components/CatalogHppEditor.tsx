'use client'

import { useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import { Plus, Trash2, Package, Layers, Box, DollarSign, Calculator } from 'lucide-react'

type HppComponentRow = {
  id?: string
  material_id: string
  quantity: number
  section?: string
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
}

export default function CatalogHppEditor({
  materials,
  initialComponents = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'>)[]
  initialComponents?: HppComponentRow[]
}) {
  const [rows, setRows] = useState<HppComponentRow[]>(
    initialComponents.map((c: HppComponentRow) => ({
      id: c.id,
      material_id: c.material_id,
      quantity: typeof c.quantity === 'number' ? c.quantity : 0,
      section: c.section || 'lainnya',
      material: c.material,
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

  const addRow = () => {
    const firstMaterial = materials[0]
    if (!firstMaterial) return
    setRows((prev) => [
      ...prev,
      {
        material_id: firstMaterial.id,
        quantity: 1,
        section: firstMaterial.category || 'lainnya',
      },
    ])
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

  const serialized = useMemo(() => {
    return JSON.stringify(
      rows.map((r) => ({
        id: r.id ?? null,
        material_id: r.material_id,
        quantity: typeof r.quantity === 'number' ? r.quantity : 0,
        section: r.section || 'lainnya',
      }))
    )
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#E30613]" />
          Komponen Biaya HPP
        </h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Tambah Komponen
        </button>
      </div>

      <input type="hidden" name="hpp_components_json" value={serialized} />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              Belum ada komponen HPP.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klik &quot;Tambah Komponen&quot; untuk mulai menyusun formulasi harga.
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
                        onChange={(e) => {
                          const mat = materialMap.get(e.target.value)
                          updateRow(idx, { material_id: e.target.value, section: mat?.category || 'lainnya' })
                        }}
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

                  {/* Section Selection */}
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-gray-400" /> Segmen
                    </label>
                    <div className="relative">
                      <select
                        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all appearance-none cursor-pointer"
                        value={row.section || 'lainnya'}
                        onChange={(e) => updateRow(idx, { section: e.target.value })}
                      >
                        <option value="atap">Atap</option>
                        <option value="rangka">Rangka</option>
                        <option value="isian">Isian</option>
                        <option value="finishing">Finishing</option>
                        <option value="aksesoris">Aksesoris</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Box className="w-3 h-3 text-gray-400" /> Qty
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-full pl-3 pr-12 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                        value={typeof row.quantity === 'number' ? row.quantity : 0}
                        onChange={(e) => updateRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {mat?.unit ?? '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal Display */}
                  <div className="lg:col-span-2 relative">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-gray-400" /> Subtotal
                    </label>
                    <div className="w-full px-3 py-2.5 bg-gray-100 border border-transparent rounded-lg text-sm font-black text-gray-700 text-right">
                      Rp {(
                        (mat?.base_price_per_unit || 0) *
                        (typeof row.quantity === 'number' ? row.quantity : 0)
                      ).toLocaleString('id-ID')}
                    </div>
                    
                    {/* Delete Button (Absolute positioned for layout cleanliness) */}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="absolute -top-1 -right-1 lg:-right-4 lg:top-8 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Komponen"
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
