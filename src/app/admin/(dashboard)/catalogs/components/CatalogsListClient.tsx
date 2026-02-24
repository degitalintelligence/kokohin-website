'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MoreHorizontal, Search } from 'lucide-react'

type Unit = 'm2' | 'm1' | 'unit'

type CatalogItem = {
  id: string
  title: string
  atapName: string
  rangkaName: string
  base_price_per_m2: number
  base_price_unit: Unit
  hpp_per_unit: number | null
  is_active: boolean
  created_at: string | null
  atap_id: string | null
  rangka_id: string | null
}

type Props = {
  catalogs: CatalogItem[]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const getCatalogType = (catalog: CatalogItem) => {
  if (catalog.atap_id && catalog.rangka_id) return 'Paket Lengkap'
  if (catalog.atap_id) return 'Hanya Atap'
  if (catalog.rangka_id) return 'Hanya Rangka'
  return 'Custom'
}

export default function CatalogsListClient({ catalogs }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'recent' | 'price_asc' | 'price_desc' | 'hpp_asc' | 'hpp_desc' | 'title_asc'>('recent')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setPage(1), 0)
    return () => window.clearTimeout(id)
  }, [query, sortKey, pageSize])

  const processed = useMemo(() => {
    const hppsSorted = catalogs
      .map((c) => Number(c.hpp_per_unit || 0))
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
    const lowCut = hppsSorted.length ? hppsSorted[Math.floor((hppsSorted.length - 1) * 0.33)] : 0
    const highCut = hppsSorted.length ? hppsSorted[Math.floor((hppsSorted.length - 1) * 0.66)] : 0
    const getPriority = (hpp?: number | null) => {
      const v = Number(hpp || 0)
      if (!(v > 0) || hppsSorted.length === 0)
        return {
          label: 'N/A',
          className: 'bg-gray-100 text-gray-800',
        }
      if (v <= lowCut)
        return {
          label: 'Prioritas Tinggi',
          className: 'bg-red-100 text-red-800',
        }
      if (v <= highCut)
        return {
          label: 'Prioritas Sedang',
          className: 'bg-yellow-100 text-yellow-800',
        }
      return {
        label: 'Prioritas Rendah',
        className: 'bg-green-100 text-green-800',
      }
    }
    const q = query.trim().toLowerCase()
    let rows = catalogs.slice()
    if (q) {
      rows = rows.filter((c) => {
        return (
          c.title.toLowerCase().includes(q) ||
          c.atapName.toLowerCase().includes(q) ||
          c.rangkaName.toLowerCase().includes(q)
        )
      })
    }
    rows.sort((a, b) => {
      if (sortKey === 'recent') {
        const da = a.created_at ? Date.parse(a.created_at) : 0
        const db = b.created_at ? Date.parse(b.created_at) : 0
        return db - da
      }
      if (sortKey === 'price_asc') {
        return a.base_price_per_m2 - b.base_price_per_m2
      }
      if (sortKey === 'price_desc') {
        return b.base_price_per_m2 - a.base_price_per_m2
      }
      if (sortKey === 'hpp_asc') {
        return (a.hpp_per_unit || 0) - (b.hpp_per_unit || 0)
      }
      if (sortKey === 'hpp_desc') {
        return (b.hpp_per_unit || 0) - (a.hpp_per_unit || 0)
      }
      if (sortKey === 'title_asc') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })
    return rows.map((c) => {
      const p = getPriority(c.hpp_per_unit)
      return {
        ...c,
        priorityLabel: p.label,
        priorityClassName: p.className,
      }
    })
  }, [catalogs, query, sortKey])

  const isFiltering = query.trim().length > 0

  const total = processed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageItems = processed.slice(startIndex, endIndex)

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleToggleMenu = (id: string) => {
    setMenuOpenId((prev) => (prev === id ? null : id))
  }

  const getTypeBadgeClass = (t: string) => {
    if (t === 'Custom') return 'bg-[#E30613]/10 text-[#E30613]'
    if (t === 'Paket Lengkap') return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari paket berdasarkan nama, atap, atau rangka..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          />
        </div>
        <div className="flex flex-wrap gap-3 justify-between md:justify-end">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          >
            <option value="recent">Terbaru</option>
            <option value="title_asc">Nama A-Z</option>
            <option value="price_asc">Harga jual termurah</option>
            <option value="price_desc">Harga jual termahal</option>
            <option value="hpp_asc">HPP terendah</option>
            <option value="hpp_desc">HPP tertinggi</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) || 10)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          >
            <option value={10}>10 / halaman</option>
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
          </select>
        </div>
      </div>

      {isFiltering && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Menyaring katalog...</span>
        </div>
      )}

      <div className="hidden lg:block overflow-x-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
              <tr className="bg-white border-b border-gray-200 text-xs md:text-sm">
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[30%]">Nama Paket</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[12%] hidden xl:table-cell">Jenis</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[18%]">Harga/Unit</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[14%]">HPP/Unit</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[12%] hidden xl:table-cell">Estimasi</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[8%]">Status</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap text-right w-[8%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {pageItems.map((catalog) => {
              const unitLabel = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'
              const sampleQty = catalog.base_price_unit === 'unit' ? 1 : 10
              const estimatedPrice = (catalog.base_price_per_m2 || 0) * sampleQty
              const isExpanded = expandedId === catalog.id
              const isMenuOpen = menuOpenId === catalog.id
              const typeLabel = getCatalogType(catalog)
              const typeClass = getTypeBadgeClass(typeLabel)
              return (
                <Fragment key={catalog.id}>
                <tr className="group hover:bg-gray-50 border-b border-gray-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(catalog.id)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-gray-900 max-w-[220px] xl:max-w-[320px] truncate" title={catalog.title}>{catalog.title}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Dibuat:{' '}
                          {catalog.created_at
                            ? new Date(catalog.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}`}>{typeLabel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(catalog.base_price_per_m2)} <span>/ {unitLabel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                      <div>
                        <div className="text-sm text-gray-900">{formatCurrency(catalog.hpp_per_unit)}</div>
                        <div className="mt-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                    <div>{formatCurrency(estimatedPrice)}</div>
                    <div>Estimasi {sampleQty} {unitLabel}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/catalogs/${catalog.id}`}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleMenu(catalog.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 z-20 w-40 rounded-md border border-gray-200 bg-white text-xs shadow-lg">
                          <Link
                            href={`/admin/catalogs/${catalog.id}`}
                            className="block px-3 py-2 hover:bg-gray-50 text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                          >
                            Edit paket
                          </Link>
                          <Link
                            href={`/kalkulator?catalog_id=${catalog.id}`}
                            className="block px-3 py-2 hover:bg-gray-50 text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                          >
                            Buka di kalkulator
                          </Link>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={7} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Ringkasan</div>
                          <div className="mt-1"><span className="text-gray-500">Jenis: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}`}>{typeLabel}</span></div>
                          <div className="mt-1"><span className="text-gray-500">Atap: </span><span className="font-medium text-gray-900">{catalog.atapName || '-'}</span></div>
                          <div className="mt-1"><span className="text-gray-500">Rangka: </span><span className="font-medium text-gray-900">{catalog.rangkaName || '-'}</span></div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Harga & HPP</div>
                          <div className="mt-1 font-medium text-gray-900">{formatCurrency(catalog.base_price_per_m2)} / {unitLabel}</div>
                          <div className="mt-1 flex items-center gap-2">
                            {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                              <>
                                <span className="text-gray-800">{formatCurrency(catalog.hpp_per_unit)}</span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
                              </>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Estimasi</div>
                          <div className="mt-1 text-gray-900">{formatCurrency(estimatedPrice)}</div>
                          <div className="text-xs text-gray-500">Estimasi {sampleQty} {unitLabel}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/admin/catalogs/${catalog.id}`}
                            className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                            >
                              Edit Paket
                            </Link>
                            <Link
                              href={`/kalkulator?catalog_id=${catalog.id}`}
                            className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                            >
                              Buka di Kalkulator
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
            {total === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  Tidak ada paket yang cocok dengan filter. Coba ubah kata kunci pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {pageItems.map((catalog) => {
          const unitLabel = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'
          const sampleQty = catalog.base_price_unit === 'unit' ? 1 : 10
          const estimatedPrice = (catalog.base_price_per_m2 || 0) * sampleQty
          return (
            <div
              key={catalog.id}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{catalog.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {getCatalogType(catalog)} •{' '}
                    {catalog.created_at
                      ? new Date(catalog.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <div className="text-xs text-gray-500">Atap</div>
                  <div className="font-medium">{catalog.atapName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Rangka</div>
                  <div className="font-medium">{catalog.rangkaName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Harga / {unitLabel}</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(catalog.base_price_per_m2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">HPP / {unitLabel}</div>
                  <div>
                    {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                      <span className="font-medium">{formatCurrency(catalog.hpp_per_unit)}</span>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Estimasi {sampleQty} {unitLabel}:{' '}
                  <span className="font-semibold text-gray-800">{formatCurrency(estimatedPrice)}</span>
                </div>
                {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 && (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Link
                  href={`/admin/catalogs/${catalog.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </Link>
                <Link
                  href={`/kalkulator?catalog_id=${catalog.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-[#E30613] px-4 py-2 text-sm font-medium text-white hover:bg-[#c50511] transition-colors"
                >
                  Kalkulator
                </Link>
              </div>
            </div>
          )
        })}
        {total === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            Tidak ada paket yang cocok dengan filter. Coba ubah kata kunci pencarian.
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Menampilkan{' '}
          <span className="font-semibold">
            {total === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, total)}
          </span>{' '}
          dari <span className="font-semibold">{total}</span> paket
        </div>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Sebelumnya
          </button>
          <div className="px-2">
            Halaman <span className="font-semibold">{currentPage}</span> dari{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}
