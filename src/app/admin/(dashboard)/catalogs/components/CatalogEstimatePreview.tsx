'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatRupiah } from '@/lib/calculator'
import { createClient } from '@/lib/supabase/client'
import type { Zone, Material } from '@/lib/types'

function getNumber(el: HTMLInputElement | HTMLSelectElement | null): number {
  if (!el) return 0
  const val = parseFloat(el.value)
  return isNaN(val) ? 0 : val
}

export default function CatalogEstimatePreview({ 
  formId, 
  materials = [] 
}: { 
  formId: string,
  materials?: (Pick<Material, 'id' | 'name' | 'base_price_per_unit'>)[]
}) {
  const [unit, setUnit] = useState<'m2' | 'm1' | 'unit'>('m2')
  const [basePrice, setBasePrice] = useState(0) // Ini adalah Harga Jual target dari form
  const [labor, setLabor] = useState(0)
  const [transport, setTransport] = useState(0)
  const [marginPct, setMarginPct] = useState(0)
  const [hppComponentsTotal, setHppComponentsTotal] = useState(0)
  const [stdCalc, setStdCalc] = useState(1)
  const [useStd, setUseStd] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [zoneMarkup, setZoneMarkup] = useState(0)

  const materialPriceMap = useMemo(() => new Map(materials.map(m => [m.id, m.base_price_per_unit])), [materials])

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    const baseEl = form.elements.namedItem('base_price_per_m2') as HTMLInputElement | null
    const unitEl = form.elements.namedItem('base_price_unit') as HTMLSelectElement | null
    const laborEl = form.elements.namedItem('labor_cost') as HTMLInputElement | null
    const transportEl = form.elements.namedItem('transport_cost') as HTMLInputElement | null
    const marginEl = form.elements.namedItem('margin_percentage') as HTMLInputElement | null
    const atapEl = form.elements.namedItem('atap_id') as HTMLSelectElement | null
    const rangkaEl = form.elements.namedItem('rangka_id') as HTMLSelectElement | null
    const finishingEl = form.elements.namedItem('finishing_id') as HTMLSelectElement | null
    const isianEl = form.elements.namedItem('isian_id') as HTMLSelectElement | null
    const hppEl = form.elements.namedItem('hpp_components_json') as HTMLInputElement | null
    const useStdEl = form.elements.namedItem('use_std_calculation') as HTMLInputElement | null
    const stdCalcEl = form.elements.namedItem('std_calculation') as HTMLInputElement | null

    const readAll = () => {
      setBasePrice(getNumber(baseEl))
      setUnit((unitEl?.value as 'm2' | 'm1' | 'unit') || 'm2')
      setLabor(getNumber(laborEl))
      setTransport(getNumber(transportEl))
      setMarginPct(getNumber(marginEl))
      setUseStd(useStdEl?.checked ?? false)
      setStdCalc(Math.max(0.01, getNumber(stdCalcEl)))

      // 1. Hitung Komponen HPP dari material
      try {
        interface HppComponent {
          material_id: string
          quantity: number
        }
        const rawHpp = hppEl?.value ? JSON.parse(hppEl.value) as HppComponent[] : []
        const hppMaterialIds = new Set(rawHpp.map(item => item.material_id))
        
        const totalMatFromTable = rawHpp.reduce((sum, item) => {
          const matPrice = materialPriceMap.get(item.material_id) || 0
          const qty = Number(item.quantity) || 0
          return sum + (matPrice * qty)
        }, 0)

        // Add main fields if not in table
        const mainMatIds = [atapEl?.value, rangkaEl?.value, finishingEl?.value, isianEl?.value].filter(Boolean) as string[]
        const totalMatFromMain = mainMatIds.reduce((sum, id) => {
          if (hppMaterialIds.has(id)) return sum
          const matPrice = materialPriceMap.get(id) || 0
          return sum + matPrice // 1 unit default
        }, 0)

        setHppComponentsTotal(totalMatFromTable + totalMatFromMain)
      } catch { setHppComponentsTotal(0) }
    }

    readAll()
    const handlers: Array<[Element, string]> = []
    const elsToWatch = [baseEl, unitEl, laborEl, transportEl, marginEl, atapEl, rangkaEl, finishingEl, isianEl, hppEl, useStdEl, stdCalcEl]
    for (const el of elsToWatch) {
      if (!el) continue
      const evt = (el instanceof HTMLSelectElement || el.type === 'checkbox') ? 'change' : 'input'
      el.addEventListener(evt, readAll)
      handlers.push([el, evt])
    }
    return () => {
      for (const [el, evt] of handlers) {
        el.removeEventListener(evt, readAll)
      }
    }
  }, [formId, materialPriceMap])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('zones')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setZones(data as Zone[])
          if (!zoneId && data.length > 0) {
            setZoneId(data[0].id)
            setZoneMarkup(data[0].markup_percentage)
          }
        }
      })
  }, [zoneId])

  // Perhitungan HPP per unit (m2/m1/unit)
  // Formula: (Total Material + Labor + Transport) / (stdCalc if useStd)
  const hppPerUnit = useMemo(() => {
    const totalBaseCost = Math.max(0, hppComponentsTotal) + Math.max(0, labor) + Math.max(0, transport)
    if (useStd && stdCalc > 0) {
      return totalBaseCost / stdCalc
    }
    return totalBaseCost
  }, [hppComponentsTotal, labor, transport, useStd, stdCalc])

  // Harga setelah margin
  const priceAfterMarginPerUnit = useMemo(
    () => hppPerUnit * (1 + Math.max(0, marginPct) / 100),
    [hppPerUnit, marginPct]
  )

  // Harga setelah markup zona
  const afterZonePerUnit = useMemo(
    () => priceAfterMarginPerUnit * (1 + Math.max(0, zoneMarkup) / 100),
    [priceAfterMarginPerUnit, zoneMarkup]
  )

  return (
    <div className="mt-6 rounded-lg border bg-white">
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview Estimasi HPP & Jual</h3>
        <div className="flex items-center gap-2">
          {zones.length > 0 && (
            <>
              <label className="text-xs text-gray-600">Zona</label>
              <select
                className="text-xs px-2 py-1 border rounded focus:outline-none focus:border-[#E30613]"
                value={zoneId ?? ''}
                onChange={(e) => {
                  const z = zones.find(zz => zz.id === e.target.value) || null
                  setZoneId(z?.id ?? null)
                  setZoneMarkup(z?.markup_percentage ?? 0)
                }}
              >
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </>
          )}
          <span className="text-xs px-2 py-1 rounded bg-gray-100 border font-medium">{unit}</span>
        </div>
      </div>
      <div className="px-4 py-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="text-sm text-gray-600">HPP per {unit}</div>
        <div className="text-right font-semibold text-gray-800">{formatRupiah(Math.round(hppPerUnit))}</div>

        <div className="text-sm text-gray-600">Setelah Margin ({Math.max(0, marginPct)}%)</div>
        <div className="text-right font-semibold text-gray-800">{formatRupiah(Math.round(priceAfterMarginPerUnit))}</div>

        <div className="text-sm text-gray-600">Markup Zona ({Math.max(0, zoneMarkup)}%)</div>
        <div className="text-right font-semibold text-gray-800">{formatRupiah(Math.round(afterZonePerUnit))}</div>

        <div className="text-sm text-gray-600">Transport (flat, per proyek)</div>
        <div className="text-right text-gray-800">{formatRupiah(Math.round(Math.max(0, transport)))}</div>

        <div className="pt-2 border-t md:col-span-2"></div>

        <div className="text-sm font-medium text-gray-800">Perkiraan Harga Jual per {unit}</div>
        <div className="text-right text-[#E30613] font-bold text-lg">{formatRupiah(Math.round(afterZonePerUnit))}</div>
        
        <div className="text-xs text-gray-500">Target Harga di Form</div>
        <div className="text-right text-xs text-gray-500 line-through">{formatRupiah(Math.round(basePrice))}</div>
      </div>
      <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
        <p className="text-[10px] text-gray-500 leading-tight">
          HPP dihitung dari: (Total Material + Tukang + Transport) {useStd ? `dibagi Luas Standar (${stdCalc} m²)` : ''}.
          Addons Opsional dihitung terpisah saat penawaran.
          Markup Zona ditambahkan di atas harga dasar + margin.
        </p>
      </div>
    </div>
  )
}

