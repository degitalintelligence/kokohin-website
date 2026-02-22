'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatRupiah } from '@/lib/calculator'
import { createClient } from '@/lib/supabase/client'
import type { Zone } from '@/lib/types'

function getNumber(el: HTMLInputElement | HTMLSelectElement | null): number {
  if (!el) return 0
  const val = parseFloat(el.value)
  return isNaN(val) ? 0 : val
}

export default function CatalogEstimatePreview({ formId }: { formId: string }) {
  const [unit, setUnit] = useState<'m2' | 'm1' | 'unit'>('m2')
  const [basePrice, setBasePrice] = useState(0)
  const [labor, setLabor] = useState(0)
  const [transport, setTransport] = useState(0)
  const [marginPct, setMarginPct] = useState(0)
  const [addonsPerUnit, setAddonsPerUnit] = useState(0)
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [zoneMarkup, setZoneMarkup] = useState(0)
  const [zoneFlatFee, setZoneFlatFee] = useState(0)

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    const baseEl = form.elements.namedItem('base_price_per_m2') as HTMLInputElement | null
    const unitEl = form.elements.namedItem('base_price_unit') as HTMLSelectElement | null
    const laborEl = form.elements.namedItem('labor_cost') as HTMLInputElement | null
    const transportEl = form.elements.namedItem('transport_cost') as HTMLInputElement | null
    const marginEl = form.elements.namedItem('margin_percentage') as HTMLInputElement | null
    const addonsEl = form.elements.namedItem('addons_json') as HTMLInputElement | null

    const readAll = () => {
      setBasePrice(getNumber(baseEl))
      setUnit((unitEl?.value as 'm2' | 'm1' | 'unit') || 'm2')
      setLabor(getNumber(laborEl))
      setTransport(getNumber(transportEl))
      setMarginPct(getNumber(marginEl))
      // addons default (non-opsional) dihitung hanya jika basis sama dengan satuan harga dasar
      try {
        const raw = addonsEl?.value
          ? (JSON.parse(addonsEl.value) as Array<{
              is_optional: boolean
              material_price?: number
              basis?: 'm2' | 'm1' | 'unit'
              qty_per_basis?: number
            }>)
          : []
        const perUnit = raw
          .filter((a) => !a.is_optional)
          .reduce((sum, a) => {
            const basis = (a.basis ?? 'm2')
            const qty = typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0
            const price = Number(a.material_price) || 0
            return sum + (basis === ((unitEl?.value as 'm2'|'m1'|'unit') || 'm2') ? qty * price : 0)
          }, 0)
        setAddonsPerUnit(perUnit)
      } catch {
        setAddonsPerUnit(0)
      }
    }

    readAll()
    const handlers: Array<[Element, string]> = []
    for (const el of [baseEl, unitEl, laborEl, transportEl, marginEl, addonsEl]) {
      if (!el) continue
      const evt = el instanceof HTMLSelectElement ? 'change' : 'input'
      el.addEventListener(evt, readAll)
      handlers.push([el, evt])
    }
    return () => {
      for (const [el, evt] of handlers) {
        el.removeEventListener(evt, readAll)
      }
    }
  }, [formId])

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
            setZoneFlatFee(data[0].flat_fee)
          }
        }
      })
  }, [zoneId])

  const hppPerUnit = useMemo(() => Math.max(0, basePrice) + Math.max(0, labor) + Math.max(0, addonsPerUnit), [basePrice, labor, addonsPerUnit])
  const priceAfterMarginPerUnit = useMemo(
    () => hppPerUnit * (1 + Math.max(0, marginPct) / 100),
    [hppPerUnit, marginPct]
  )
  const afterZonePerUnit = useMemo(
    () => priceAfterMarginPerUnit * (1 + Math.max(0, zoneMarkup) / 100),
    [priceAfterMarginPerUnit, zoneMarkup]
  )

  return (
    <div className="mt-6 rounded-lg border bg-white">
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview Estimasi</h3>
        <div className="flex items-center gap-2">
          {zones.length > 0 && (
            <>
              <label className="text-xs text-gray-600">Zona</label>
              <select
                className="text-xs px-2 py-1 border rounded"
                value={zoneId ?? ''}
                onChange={(e) => {
                  const z = zones.find(zz => zz.id === e.target.value) || null
                  setZoneId(z?.id ?? null)
                  setZoneMarkup(z?.markup_percentage ?? 0)
                  setZoneFlatFee(z?.flat_fee ?? 0)
                }}
              >
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </>
          )}
          <span className="text-xs px-2 py-1 rounded bg-gray-100 border">{unit}</span>
        </div>
      </div>
      <div className="px-4 py-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="text-sm text-gray-600">Addons Default per {unit}</div>
        <div className="text-right">{formatRupiah(Math.round(Math.max(0, addonsPerUnit)))}</div>

        <div className="text-sm text-gray-600">HPP per {unit}</div>
        <div className="text-right font-semibold">{formatRupiah(Math.round(hppPerUnit))}</div>

        <div className="text-sm text-gray-600">Setelah Margin ({Math.max(0, marginPct)}%)</div>
        <div className="text-right font-semibold">{formatRupiah(Math.round(priceAfterMarginPerUnit))}</div>

        <div className="text-sm text-gray-600">Markup Zona ({Math.max(0, zoneMarkup)}%)</div>
        <div className="text-right font-semibold">{formatRupiah(Math.round(afterZonePerUnit))}</div>

        <div className="text-sm text-gray-600">Transport (flat, per proyek)</div>
        <div className="text-right">{formatRupiah(Math.round(Math.max(0, transport)))}</div>

        <div className="text-sm text-gray-600">Perkiraan Harga Jual per {unit}</div>
        <div className="text-right text-[#E30613] font-bold">{formatRupiah(Math.round(afterZonePerUnit))}</div>
      </div>
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-gray-500">
          Komponen Tambahan default dihitung hanya jika basisnya sama dengan satuan harga dasar ({unit}).
          Flat Fee Zona ({formatRupiah(Math.round(Math.max(0, zoneFlatFee)))}) dan Transport ditambahkan di total proyek saat penawaran final.
        </p>
      </div>
    </div>
  )
}
