'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Material } from '@/lib/types'

type AddonRow = {
  id?: string
  material_id: string
  is_optional: boolean
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
  // Basis dan qty per basis untuk perhitungan end-to-end
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
    const groups: Record<string, typeof materials> = { atap: [], frame: [], aksesoris: [], lainnya: [] }
    for (const m of materials) {
      if (groups[m.category]) groups[m.category].push(m)
      else groups.lainnya.push(m)
    }
    return groups
  }, [materials])

  useEffect(() => {
    // Sync initial addons if provided later
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
    // Only keep necessary fields for server action
    return JSON.stringify(
      rows.map((r) => ({
        id: r.id ?? null,
        material_id: r.material_id,
        is_optional: !!r.is_optional,
        basis: r.basis ?? 'm2',
        qty_per_basis: typeof r.qty_per_basis === 'number' ? r.qty_per_basis : 0,
        // extra metadata for client-side preview (ignored by server)
        material_price: materialMap.get(r.material_id)?.base_price_per_unit ?? 0,
        material_category: materialMap.get(r.material_id)?.category ?? 'lainnya',
        material_name: materialMap.get(r.material_id)?.name ?? '',
      }))
    )
  }, [rows, materialMap])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Komponen Tambahan</h3>
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-2 bg-[#E30613] text-white rounded-md hover:brightness-90 text-sm"
        >
          + Tambah Baris
        </button>
      </div>

      <input type="hidden" name="addons_json" value={serialized} />

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-600">
            Belum ada komponen tambahan. Klik &quot;Tambah Baris&quot; untuk menambahkan.
          </p>
        ) : (
          rows.map((row, idx) => {
            const mat = materialMap.get(row.material_id)
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-md border">
                <div className="md:col-span-5">
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
                  <p className="text-xs text-gray-500 mt-1">
                    Kategori: {materialMap.get(row.material_id)?.category ?? '-'}
                  </p>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Basis & Qty</label>
                  <div className="flex gap-2">
                    <select
                      className="w-28 px-3 py-2 border rounded-md bg-white"
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
                      className="flex-1 px-3 py-2 border rounded-md"
                      value={typeof row.qty_per_basis === 'number' ? row.qty_per_basis : 0}
                      onChange={(e) => updateRow(idx, { qty_per_basis: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="mt-1">
                    <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border">
                      per {row.basis === 'm1' ? 'm¹' : row.basis === 'unit' ? 'unit' : 'm²'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Per {row.basis ?? 'm2'}: { (row.basis ?? 'm2') === 'm2' ? 'total mengikuti luas (panjang×lebar)' : (row.basis ?? 'm2') === 'm1' ? 'total mengikuti panjang' : 'total per unit' }.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Opsional?</label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.is_optional}
                      onChange={(e) => updateRow(idx, { is_optional: e.target.checked })}
                    />
                    <span className="text-sm">Ya</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Estimasi per {row.basis ?? 'm2'}</label>
                  <div className="px-3 py-2 border rounded-md bg-gray-100 text-sm">
                    Rp {(
                      (mat?.base_price_per_unit || 0) *
                      (typeof row.qty_per_basis === 'number' ? row.qty_per_basis : 0)
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
