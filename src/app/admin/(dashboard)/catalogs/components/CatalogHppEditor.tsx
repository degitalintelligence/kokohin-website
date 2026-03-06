'use client'

import { useMemo, useState } from 'react'
import type { Material } from '@/lib/types'
import { Plus, Trash2, Package, Layers, Box, DollarSign, Calculator, Copy } from 'lucide-react'
import { fetchCatalogHppComponents } from '@/app/actions/catalogs'

type HppComponentRow = {
  id?: string
  material_id: string
  quantity: number
  section?: string
  material?: Pick<Material, 'id' | 'name' | 'base_price_per_unit' | 'unit' | 'category'>
}

type CopySourceCatalog = {
  id: string
  title: string
  category?: string | null
}

export default function CatalogHppEditor({
  materials,
  initialComponents = [],
  copySourceCatalogs = [],
}: {
  materials: (Pick<Material, 'id' | 'name' | 'category' | 'base_price_per_unit' | 'unit'>)[]
  initialComponents?: HppComponentRow[]
  copySourceCatalogs?: CopySourceCatalog[]
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

  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyCatalogId, setCopyCatalogId] = useState<string>('')
  const [copyFactor, setCopyFactor] = useState<number>(1)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copyPreview, setCopyPreview] = useState<HppComponentRow[]>([])
  const [copyReplace, setCopyReplace] = useState(true)

  const materialMap = useMemo(() => new Map(materials.map((x) => [x.id, x])), [materials])
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, typeof materials> = { 
      atap: [], 
      rangka: [], 
      isian: [],
      finishing: [],
      aksesoris: [], 
      lainnya: [] 
    }
    for (const m of materials) {
      const cat = m.category === 'frame' ? 'rangka' : m.category
      if (cat && groups[cat]) groups[cat].push(m)
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
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-[#E30613] text-white rounded-lg hover:bg-[#c50511] transition-all text-sm font-semibold shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Komponen
          </button>
        </div>
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
                          const matCat = mat?.category === 'frame' ? 'rangka' : mat?.category
                          updateRow(idx, { material_id: e.target.value, section: matCat || 'lainnya' })
                        }}
                      >
                        {(['atap', 'rangka', 'isian', 'finishing', 'aksesoris', 'lainnya'] as const).map((cat) => (
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
                    
                    {/* Delete Button */}
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
              </div>
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
                          material_id: string
                          quantity: number
                          section?: string | null
                        }
                        const normalized: HppComponentRow[] = (raw as RawHpp[]).map((c) => {
                          const mat = materialMap.get(c.material_id)
                          const matCat = mat?.category === 'frame' ? 'rangka' : mat?.category
                          return {
                            id: undefined,
                            material_id: c.material_id,
                            quantity:
                              typeof c.quantity === 'number'
                                ? Number(c.quantity) * (copyFactor || 1)
                                : 0,
                            section: c.section || matCat || 'lainnya',
                            material: mat,
                          }
                        })
                        const filtered = normalized.filter((r) => materialMap.has(r.material_id))
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
                        const mat = materialMap.get(r.material_id)
                        const qty = typeof r.quantity === 'number' ? r.quantity : 0
                        const subtotal = (mat?.base_price_per_unit || 0) * qty
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-2.5 py-1">
                              <div className="font-medium text-gray-800 truncate max-w-xs">
                                {mat?.name ?? r.material_id}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {mat?.unit ? `Unit: ${mat.unit}` : null}
                              </div>
                            </td>
                            <td className="px-2.5 py-1 text-gray-700 whitespace-nowrap">
                              {r.section || mat?.category || 'lainnya'}
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
