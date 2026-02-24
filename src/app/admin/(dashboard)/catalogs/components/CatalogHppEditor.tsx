'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'

type HppComponentRow = {
  id?: string
  material_id: string
  quantity: number
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
      material: c.material,
    }))
  )

  const materialMap = useMemo(() => new Map(materials.map((x) => [x.id, x])), [materials])
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, typeof materials> = { atap: [], frame: [], aksesoris: [], lainnya: [] }
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
      }))
    )
  }, [rows])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Komponen Biaya HPP</h3>
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-2 bg-[#E30613] text-white rounded-md hover:brightness-90 text-sm"
        >
          + Tambah Komponen
        </button>
      </div>

      <input type="hidden" name="hpp_components_json" value={serialized} />

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">
            Belum ada komponen HPP. Klik &quot;Tambah Komponen&quot; untuk memulai.
          </p>
        ) : (
          rows.map((row, idx) => {
            const mat = materialMap.get(row.material_id)
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-md border">
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium mb-1">Material</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-white"
                    value={row.material_id}
                    onChange={(e) => updateRow(idx, { material_id: e.target.value })}
                  >
                    {(['atap','frame','aksesoris','lainnya'] as const).map((cat) => (
                      <optgroup key={cat} label={cat.toUpperCase()}>
                        {groupedMaterials[cat].map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Kuantitas</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 border rounded-md"
                    value={typeof row.quantity === 'number' ? row.quantity : 0}
                    onChange={(e) => updateRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Satuan: {mat?.unit ?? '-'}
                  </p>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Subtotal</label>
                  <div className="px-3 py-2 border rounded-md bg-gray-100 text-sm">
                    Rp {(
                      (mat?.base_price_per_unit || 0) *
                      (typeof row.quantity === 'number' ? row.quantity : 0)
                    ).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
