'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Copy, Loader2 } from 'lucide-react'
import styles from '../../page.module.css'
import { useState, Fragment, useTransition } from 'react'
import { copyMaterial } from '../actions'
import { useToast } from '@/components/ui/use-toast'
import DeleteMaterialButton from './DeleteMaterialButton'

type Material = {
  id: string
  code: string
  name: string
  category: string
  variant_name?: string
  parent_material_id?: string | null
  parent?: { id: string; name: string; variant_name?: string } | null
  unit: string
  base_price_per_unit: number
  length_per_unit: number | null
  is_active: boolean
  updated_at?: string | null
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

const formatLengthUnit = (lengthPerUnit: number | null) => {
  if (!lengthPerUnit) return 'Satuan'
  return lengthPerUnit === 1 ? 'Satuan' : `${lengthPerUnit}m`
}

const getUpdateMeta = (updatedAt?: string | null) => {
  if (!updatedAt) {
    return {
      label: 'Belum ada data update',
      className: 'bg-gray-100 text-gray-700',
      days: Number.POSITIVE_INFINITY,
    }
  }
  const ts = new Date(updatedAt).getTime()
  if (!Number.isFinite(ts)) {
    return {
      label: 'Tanggal update tidak valid',
      className: 'bg-gray-100 text-gray-700',
      days: Number.POSITIVE_INFINITY,
    }
  }
  const diffMs = Date.now() - ts
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  if (days <= 3) {
    return { label: `Update ${days} hari lalu`, className: 'bg-green-100 text-green-700', days }
  }
  if (days <= 30) {
    return { label: `Update ${days} hari lalu`, className: 'bg-amber-100 text-amber-700', days }
  }
  return { label: `Update ${days} hari lalu`, className: 'bg-red-100 text-red-700', days }
}

const formatUpdateTimestamp = (updatedAt?: string | null) => {
  if (!updatedAt) return '-'
  const dt = new Date(updatedAt)
  if (!Number.isFinite(dt.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(dt)
}

type MaterialRowProps = {
  material: Material
  selected: boolean
  onToggleSelected: () => void
  depth: number
  childCount: number
  collapsed?: boolean
  onToggleCollapse?: () => void
  rootId: string
  groupHovered?: boolean
  onGroupHoverChange?: (hovered: boolean) => void
}

export default function MaterialRow({
  material,
  selected,
  onToggleSelected,
  depth,
  childCount,
  collapsed = false,
  onToggleCollapse,
  rootId,
  groupHovered = false,
  onGroupHoverChange,
}: MaterialRowProps) {
  const [open, setOpen] = useState(false)
  const [isCopying, startCopy] = useTransition()
  const router = useRouter()
  const { toast } = useToast()
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
  const isRootMaterial = !material.parent_material_id
  const isChild = depth > 0
  const variantLabel = material.variant_name || 'Default'
  const displayName = isChild ? variantLabel : material.name
  const updateMeta = getUpdateMeta(material.updated_at)
  const indentPx = Math.min(depth, 3) * 20
  const rowBgClass = isChild ? 'bg-gray-50/60 hover:bg-gray-100/60' : 'hover:bg-gray-50'
  const rowGroupHoverClass = groupHovered ? 'bg-[#E30613]/[0.04]' : ''
  return (
    <Fragment>
      <tr
        data-root-id={rootId}
        onMouseEnter={() => onGroupHoverChange?.(true)}
        onMouseLeave={() => onGroupHoverChange?.(false)}
        className={`group border-b border-gray-100 ${rowBgClass} ${rowGroupHoverClass}`}
      >
        <td className={`sticky left-0 z-10 px-4 py-3 border-r border-gray-100 ${groupHovered ? 'bg-[#fff5f5]' : isChild ? 'bg-gray-50/95' : 'bg-white'}`}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              aria-label={`Pilih material ${material.name}`}
              className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
            />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`mat-row-details-${material.id}`}
              aria-label={open ? `Sembunyikan detail ${material.name}` : `Tampilkan detail ${material.name}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
            >
              {open ? <ChevronUp className="h-3 w-3 text-[#E30613]" /> : <ChevronDown className="h-3 w-3 text-[#E30613]" />}
            </button>
          </div>
        </td>
        <td className={`${styles.bold} sticky left-10 z-10 border-r border-gray-100 min-w-[260px] ${groupHovered ? 'bg-[#fff5f5]' : isChild ? 'bg-gray-50/95' : 'bg-white'}`}>
          <div className="flex flex-col" style={{ paddingLeft: `${indentPx}px` }}>
            <span className="flex items-center gap-2">
              {isChild && <span className="text-gray-300 font-mono">└─</span>}
              {!isChild && childCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-[#E30613]/20 bg-[#E30613]/5 px-2 py-0.5 text-[10px] font-semibold text-[#E30613]">
                  Parent
                </span>
              )}
              {!isChild && childCount > 0 && onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={collapsed ? `Expand varian ${material.name}` : `Collapse varian ${material.name}`}
                  className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {collapsed ? 'Expand Varian' : 'Collapse Varian'}
                </button>
              )}
              <span>{displayName}</span>
            </span>
            <span className="text-xs font-medium text-gray-500">
              {isRootMaterial ? 'Tipe: Material Utama' : 'Tipe: Varian'}
              {!isChild && ` | Varian: ${variantLabel}`}
              {isRootMaterial && childCount > 0 ? ` | Jumlah Varian: ${childCount}` : ''}
            </span>
          </div>
        </td>
        <td className="hidden md:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryClass}`}>{material.category}</span>
        </td>
        <td className="hidden md:table-cell">{material.unit}</td>
        <td className={styles.bold}>
          <div className="flex flex-col gap-1">
            <span>{formatCurrency(material.base_price_per_unit)}</span>
            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${updateMeta.className}`}>
              {updateMeta.label}
            </span>
          </div>
        </td>
        <td className="hidden lg:table-cell">{formatLengthUnit(material.length_per_unit)}</td>
        <td className="hidden lg:table-cell">
          <span title="Waste batangan dibulatkan ke atas (Math.ceil)" className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${wasteClass}`}>{wasteLabel}</span>
        </td>
        <td className="hidden sm:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{material.is_active ? 'Aktif' : 'Nonaktif'}</span>
        </td>
        <td className={`sticky right-0 z-10 border-l border-gray-100 ${groupHovered ? 'bg-[#fff5f5]' : isChild ? 'bg-gray-50/95' : 'bg-white'}`}>
          <div className="flex flex-wrap gap-2">
            {isRootMaterial ? (
              <Link href={`/admin/materials/new?variant_of=${material.id}`} className="btn btn-outline-dark btn-sm">
                + Varian
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-400">
                Parent: {material.parent?.name || '-'}
              </span>
            )}
            <Link href={`/admin/materials/${material.id}`} className="btn btn-outline-dark btn-sm">
              Edit
            </Link>
            <button
              type="button"
              className="btn btn-outline-dark btn-sm inline-flex items-center gap-1 disabled:opacity-60"
              disabled={isCopying}
              aria-busy={isCopying}
              onClick={() => {
                startCopy(async () => {
                  try {
                    const result = await copyMaterial(material.id)
                    toast({
                      title: 'Material berhasil disalin',
                      description: `Salinan dari ${material.name}`,
                    })
                    router.push(`/admin/materials/${result.id}`)
                  } catch (e) {
                    const message =
                      e instanceof Error
                        ? e.message
                        : 'Gagal menyalin material. Silakan coba lagi.'
                    toast({
                      variant: 'destructive',
                      title: 'Gagal menyalin material',
                      description: message,
                    })
                  }
                })
              }}
            >
              {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              <span>{isCopying ? 'Menyalin...' : 'Copy'}</span>
            </button>
            <DeleteMaterialButton id={material.id} className="btn btn-outline-danger btn-sm" />
          </div>
        </td>
      </tr>
      {open && (
        <tr className={`border-t border-gray-200 ${groupHovered ? 'bg-[#fff5f5]' : 'bg-gray-50'}`}>
          <td colSpan={9} className="p-4">
            <div id={`mat-row-details-${material.id}`} role="region" aria-label={`Detail material ${material.name}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm transition-opacity duration-200">
              <div>
                <div className="text-xs text-gray-500">Ringkasan</div>
                <div className="mt-1"><span className="text-gray-500">Kategori: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryClass}`}>{material.category}</span></div>
                <div className="mt-1"><span className="text-gray-500">Tipe: </span><span className="font-medium text-gray-900">{isRootMaterial ? 'Material Utama' : 'Varian'}</span></div>
                <div className="mt-1"><span className="text-gray-500">Varian: </span><span className="font-medium text-gray-900">{material.variant_name || 'Default'}</span></div>
                {material.parent?.name && (
                  <div className="mt-1">
                    <span className="text-gray-500">Parent: </span>
                    <span className="font-medium text-gray-900">
                      {material.parent.name} ({material.parent.variant_name || 'Default'})
                    </span>
                  </div>
                )}
                <div className="mt-1"><span className="text-gray-500">Satuan: </span><span className="font-medium text-gray-900">{material.unit}</span></div>
                <div className="mt-1"><span className="text-gray-500">Panjang/Unit: </span><span className="font-medium text-gray-900">{formatLengthUnit(material.length_per_unit)}</span></div>
                <div className="mt-1"><span className="text-gray-500">Waste: </span><span title="Waste batangan dibulatkan ke atas (Math.ceil)" className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${wasteClass}`}>{wasteLabel}</span></div>
                <div className="mt-1"><span className="text-gray-500">Status: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{material.is_active ? 'Aktif' : 'Nonaktif'}</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Harga</div>
                <div className="mt-1"><span className="text-gray-500">Harga Dasar: </span><span className="font-medium text-gray-900">{formatCurrency(material.base_price_per_unit)}</span></div>
                <div className="mt-1">
                  <span className="text-gray-500">Update Harga Terakhir: </span>
                  <span className="font-medium text-gray-900">{formatUpdateTimestamp(material.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2">
                  {isRootMaterial && (
                    <Link href={`/admin/materials/new?variant_of=${material.id}`} className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]">
                      + Varian
                    </Link>
                  )}
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
