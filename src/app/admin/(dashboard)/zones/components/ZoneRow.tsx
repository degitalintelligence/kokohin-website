'use client'
import Link from 'next/link'
import styles from '../../page.module.css'
import { ChevronDown, ChevronUp } from 'lucide-react'
import DeleteZoneButton from '../components/DeleteZoneButton'
import { useState, Fragment } from 'react'

type Zone = {
  id: string
  name: string
  cities: string[] | null
  markup_percentage: number
  flat_fee: number
  description: string | null
  order_index: number | null
  is_active?: boolean | null
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
const formatPercentage = (pct: number) => `${(pct || 0).toFixed(2).replace(/\\.00$/, '')}%`

export default function ZoneRow({ zone, index }: { zone: Zone; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Fragment>
      <tr className="group hover:bg-gray-50 border-b border-gray-100">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
          >
            {open ? <ChevronUp className="h-3 w-3 text-[#E30613]" /> : <ChevronDown className="h-3 w-3 text-[#E30613]" />}
          </button>
        </td>
        <td className={`hidden sm:table-cell ${styles.bold}`}>
          <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full">
            {zone.order_index ?? index + 1}
          </div>
        </td>
        <td className={styles.bold}>{zone.name}</td>
        <td className="hidden md:table-cell">
          <div className="text-sm text-gray-700">{zone.cities?.join(', ') || 'Semua'}</div>
        </td>
        <td className={styles.bold}>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${zone.markup_percentage > 0 ? 'bg-[#E30613]/10 text-[#E30613]' : 'bg-gray-100 text-gray-800'}`}>
            {formatPercentage(zone.markup_percentage)}
          </span>
        </td>
        <td className={`hidden lg:table-cell ${styles.bold}`}>
          {zone.flat_fee ? formatCurrency(zone.flat_fee) : '—'}
        </td>
        <td className="hidden lg:table-cell" style={{ maxWidth: 200 }}>
          {zone.description || '—'}
        </td>
        <td className="hidden sm:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(zone.is_active ?? true) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {(zone.is_active ?? true) ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td>
          <div className="flex gap-2">
            <Link href={`/admin/zones/${zone.id}`} className="btn btn-outline-dark btn-sm">
              Edit
            </Link>
            <DeleteZoneButton id={zone.id} label="Hapus" className="btn btn-outline-danger btn-sm" />
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 border-t border-gray-200">
          <td colSpan={9} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Ringkasan</div>
                <div className="mt-1"><span className="text-gray-500">Kota/Kecamatan: </span><span className="font-medium text-gray-900">{zone.cities?.join(', ') || 'Semua'}</span></div>
                <div className="mt-1"><span className="text-gray-500">Deskripsi: </span><span className="font-medium text-gray-900">{zone.description || '—'}</span></div>
                <div className="mt-1"><span className="text-gray-500">Status: </span><span className="font-medium text-gray-900">{(zone.is_active ?? true) ? 'Aktif' : 'Nonaktif'}</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Markup & Fee</div>
                <div className="mt-1"><span className="text-gray-500">Markup: </span><span className="font-medium text-gray-900">{formatPercentage(zone.markup_percentage)}</span></div>
                <div className="mt-1"><span className="text-gray-500">Flat Fee: </span><span className="font-medium text-gray-900">{zone.flat_fee ? formatCurrency(zone.flat_fee) : '—'}</span></div>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2">
                  <Link href={`/admin/zones/${zone.id}`} className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}
