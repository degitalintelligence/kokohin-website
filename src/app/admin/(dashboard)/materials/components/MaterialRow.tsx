'use client'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import styles from '../../page.module.css'
import { useState, Fragment } from 'react'

type Material = {
  id: string
  code: string
  name: string
  category: string
  unit: string
  base_price_per_unit: number
  length_per_unit: number | null
  is_active: boolean
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

const formatLengthUnit = (lengthPerUnit: number | null) => {
  if (!lengthPerUnit) return 'Satuan'
  return lengthPerUnit === 1 ? 'Satuan' : `${lengthPerUnit}m`
}

export default function MaterialRow({ material }: { material: Material }) {
  const [open, setOpen] = useState(false)
  const wasteLabel = material.length_per_unit && material.length_per_unit > 1 ? 'Math.ceil()' : 'Satuan'
  const categoryClass =
    material.category === 'atap'
      ? 'bg-[#E30613]/10 text-[#E30613]'
      : 'bg-gray-100 text-gray-800'
  const wasteClass =
    material.length_per_unit && material.length_per_unit > 1
      ? 'bg-[#E30613]/10 text-[#E30613]'
      : 'bg-gray-100 text-gray-800'
  const statusClass = material.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
        <td className={styles.bold}>{material.name}</td>
        <td className="hidden md:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryClass}`}>{material.category}</span>
        </td>
        <td className="hidden md:table-cell">{material.unit}</td>
        <td className={styles.bold}>{formatCurrency(material.base_price_per_unit)}</td>
        <td className="hidden lg:table-cell">{formatLengthUnit(material.length_per_unit)}</td>
        <td className="hidden lg:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${wasteClass}`}>{wasteLabel}</span>
        </td>
        <td className="hidden sm:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{material.is_active ? 'Aktif' : 'Nonaktif'}</span>
        </td>
        <td>
          <div className="flex gap-2">
            <Link href={`/admin/materials/${material.id}`} className="btn btn-outline-dark btn-sm">
              Edit
            </Link>
            <button className="btn btn-outline-danger btn-sm">
              Hapus
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 border-t border-gray-200">
          <td colSpan={9} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm transition-opacity duration-200">
              <div>
                <div className="text-xs text-gray-500">Ringkasan</div>
                <div className="mt-1"><span className="text-gray-500">Kategori: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryClass}`}>{material.category}</span></div>
                <div className="mt-1"><span className="text-gray-500">Satuan: </span><span className="font-medium text-gray-900">{material.unit}</span></div>
                <div className="mt-1"><span className="text-gray-500">Panjang/Unit: </span><span className="font-medium text-gray-900">{formatLengthUnit(material.length_per_unit)}</span></div>
                <div className="mt-1"><span className="text-gray-500">Waste: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${wasteClass}`}>{wasteLabel}</span></div>
                <div className="mt-1"><span className="text-gray-500">Status: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{material.is_active ? 'Aktif' : 'Nonaktif'}</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Harga</div>
                <div className="mt-1"><span className="text-gray-500">Harga Dasar: </span><span className="font-medium text-gray-900">{formatCurrency(material.base_price_per_unit)}</span></div>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2">
                  <Link href={`/admin/materials/${material.id}`} className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]">
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
