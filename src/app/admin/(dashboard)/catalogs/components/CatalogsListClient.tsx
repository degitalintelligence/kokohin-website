'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MoreHorizontal, Search, Star } from 'lucide-react'

type Unit = 'm2' | 'm1' | 'unit'

type CatalogItem = {
  id: string
  title: string
  category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya' | null
  atapName: string
  rangkaName: string
  finishingName?: string
  isianName?: string
  base_price_per_m2: number
  base_price_unit: Unit
  hpp_per_unit: number | null
  is_active: boolean
  is_popular?: boolean
  created_at: string | null
  atap_id: string | null
  rangka_id: string | null
  finishing_id?: string | null
  isian_id?: string | null
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

export default function CatalogsListClient({ catalogs }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'recent' | 'price_asc' | 'price_desc' | 'hpp_asc' | 'hpp_desc' | 'title_asc'>('recent')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [onlyPopular, setOnlyPopular] = useState(false)
  const [rowsState, setRowsState] = useState<CatalogItem[]>(catalogs)
  const [confirm, setConfirm] = useState<{ id: string; nextVal: boolean; title: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmActive, setConfirmActive] = useState<{ id: string; nextVal: boolean; title: string } | null>(null)
  const [savingActive, setSavingActive] = useState(false)

  useEffect(() => {
    setRowsState(catalogs)
  }, [catalogs])

  useEffect(() => {
    const id = window.setTimeout(() => setPage(1), 0)
    return () => window.clearTimeout(id)
  }, [query, sortKey, pageSize])

  useEffect(() => {
    if (menuOpenId) {
      setTimeout(() => {
        const first = document.querySelector(`#row-menu-\${menuOpenId} a`) as HTMLAnchorElement | null
        first?.focus()
      }, 0)
    }
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpenId) return
      const t = e.target as HTMLElement
      const within = t.closest(`[data-menu-id="${menuOpenId}"]`)
      if (!within) setMenuOpenId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpenId])

  const processed = useMemo(() => {
    const hppsSorted = rowsState
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
    let rows = rowsState.slice()
    if (q) {
      rows = rows.filter((c) => {
        return (
          c.title.toLowerCase().includes(q) ||
          c.atapName.toLowerCase().includes(q) ||
          c.rangkaName.toLowerCase().includes(q) ||
          (c.finishingName || '').toLowerCase().includes(q) ||
          (c.isianName || '').toLowerCase().includes(q)
        )
      })
    }
    if (onlyPopular) {
      rows = rows.filter((c) => !!c.is_popular)
    }
    if (categoryFilter !== 'all') {
      rows = rows.filter((c) => (c.category ?? null) === categoryFilter)
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
  }, [rowsState, query, sortKey, onlyPopular, categoryFilter])

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

  const getCategoryBadgeClass = (cat?: string | null) => {
    if (cat === 'kanopi') return 'bg-[#E30613]/10 text-[#E30613]'
    if (cat === 'pagar') return 'bg-blue-100 text-blue-800'
    if (cat === 'railing') return 'bg-violet-100 text-violet-800'
    if (cat === 'aksesoris') return 'bg-emerald-100 text-emerald-800'
    if (cat === 'lainnya') return 'bg-gray-100 text-gray-800'
    return 'bg-gray-100 text-gray-800'
  }

  const openConfirm = (id: string, nextVal: boolean, title: string) => {
    setConfirm({ id, nextVal, title })
  }

  const doConfirm = async () => {
    if (!confirm) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/catalogs/popular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirm.id, is_popular: confirm.nextVal })
      })
      if (!res.ok) return
      setRowsState((prev) => prev.map((c) => (c.id === confirm.id ? { ...c, is_popular: confirm.nextVal } : c)))
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  const openConfirmActive = (id: string, nextVal: boolean, title: string) => {
    setConfirmActive({ id, nextVal, title })
  }

  const doConfirmActive = async () => {
    if (!confirmActive) return
    setSavingActive(true)
    try {
      const res = await fetch('/api/admin/catalogs/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmActive.id, is_active: confirmActive.nextVal })
      })
      if (!res.ok) return
      setRowsState((prev) => prev.map((c) => (c.id === confirmActive.id ? { ...c, is_active: confirmActive.nextVal } : c)))
    } finally {
      setSavingActive(false)
      setConfirmActive(null)
    }
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
            aria-label="Cari paket"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          />
        </div>
        <div className="flex flex-wrap gap-3 justify-between md:justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            aria-label="Filter kategori"
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          >
            <option value="all">Semua Kategori</option>
            <option value="kanopi">kanopi</option>
            <option value="pagar">pagar</option>
            <option value="railing">railing</option>
            <option value="aksesoris">aksesoris</option>
            <option value="lainnya">lainnya</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyPopular}
              onChange={(e) => setOnlyPopular(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
            />
            Hanya populer
          </label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            aria-label="Urutkan daftar katalog"
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
            aria-label="Jumlah item per halaman"
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          >
            <option value={10}>10 / halaman</option>
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
          </select>
        </div>
      </div>

      {isFiltering && (
        <div className="flex items-center gap-2 text-xs text-gray-400" role="status" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Menyaring katalog...</span>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setConfirm(null)} />
          <div className="relative w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900">Ubah Status Populer</h3>
            <p className="mt-2 text-sm text-gray-600">
              {`Tandai paket "`}<span className="font-semibold text-gray-900">{confirm.title}</span>{`" sebagai `}
              <span className="font-semibold">{confirm.nextVal ? 'populer' : 'tidak populer'}</span>
              {`?`}
            </p>
            {saving && (
              <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan perubahan...</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !saving && setConfirm(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doConfirm}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#E30613] text-white hover:bg-[#c10510] font-bold"
              >
                {confirm.nextVal ? 'Tandai Populer' : 'Batalkan Populer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => !savingActive && setConfirmActive(null)} />
          <div className="relative w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900">Ubah Status Aktif</h3>
            <p className="mt-2 text-sm text-gray-600">
              {`Ubah paket "`}<span className="font-semibold text-gray-900">{confirmActive.title}</span>{`" menjadi `}
              <span className="font-semibold">{confirmActive.nextVal ? 'Aktif' : 'Nonaktif'}</span>
              {`?`}
            </p>
            {savingActive && (
              <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan perubahan...</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !savingActive && setConfirmActive(null)}
                disabled={savingActive}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doConfirmActive}
                disabled={savingActive}
                className="px-4 py-2 rounded-lg bg-[#E30613] text-white hover:bg-[#c10510] font-bold"
              >
                {confirmActive.nextVal ? 'Aktifkan' : 'Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:block overflow-x-hidden">
        <table id="catalogs-table" className="w-full table-fixed text-left border-collapse">
          <caption className="sr-only">Daftar paket katalog</caption>
          <thead className="sticky top-0 z-10">
              <tr className="bg-white border-b border-gray-200 text-xs md:text-sm">
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[30%]" aria-sort={sortKey === 'title_asc' ? 'ascending' : undefined}>Nama Paket</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[12%] hidden xl:table-cell">Kategori</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[18%]" aria-sort={sortKey === 'price_asc' ? 'ascending' : sortKey === 'price_desc' ? 'descending' : undefined}>Harga/Unit</th>
              <th scope="col" className="px-4 py-3 font-bold text-gray-500 whitespace-nowrap w-[14%]" aria-sort={sortKey === 'hpp_asc' ? 'ascending' : sortKey === 'hpp_desc' ? 'descending' : undefined}>HPP/Unit</th>
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
              const categoryClass = getCategoryBadgeClass(catalog.category ?? null)
              return (
                <Fragment key={catalog.id}>
                <tr className="group hover:bg-gray-50 border-b border-gray-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openConfirm(catalog.id, !catalog.is_popular, catalog.title)
                        }}
                        aria-pressed={catalog.is_popular}
                        aria-label={catalog.is_popular ? 'Batalkan populer' : 'Tandai populer'}
                        title={catalog.is_popular ? 'Batalkan populer' : 'Tandai populer'}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613] ${catalog.is_popular ? 'bg-[#E30613] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        <Star className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(catalog.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`row-details-${catalog.id}`}
                        aria-label={isExpanded ? `Sembunyikan detail ${catalog.title}` : `Tampilkan detail ${catalog.title}`}
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${categoryClass}`}>{catalog.category ?? '-'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(catalog.base_price_per_m2)} <span>/ {unitLabel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                      <div>
                        <div className="text-sm text-gray-900">{formatCurrency(catalog.hpp_per_unit)}</div>
                        <div className="mt-1">
                          <span title="Prioritas berdasarkan HPP relatif" className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openConfirmActive(catalog.id, !catalog.is_active, catalog.title)
                      }}
                      aria-pressed={catalog.is_active}
                      aria-label={catalog.is_active ? 'Nonaktifkan katalog' : 'Aktifkan katalog'}
                      title={catalog.is_active ? 'Nonaktifkan katalog' : 'Aktifkan katalog'}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613] ${catalog.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                    >
                      {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative flex items-center justify-end gap-1" data-menu-id={catalog.id}>
                      <Link
                        href={`/admin/catalogs/${catalog.id}`}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleMenu(catalog.id)}
                        aria-label="Buka menu tindakan"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-controls={`row-menu-${catalog.id}`}
                        id={`row-menu-button-${catalog.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {isMenuOpen && (
                        <div
                          id={`row-menu-${catalog.id}`}
                          role="menu"
                          aria-labelledby={`row-menu-button-${catalog.id}`}
                          tabIndex={-1}
                          className="absolute right-0 top-8 z-20 w-44 rounded-md border border-gray-200 bg-white text-xs shadow-lg"
                        >
                          <Link
                            href={`/admin/catalogs/${catalog.id}`}
                            role="menuitem"
                            className="block px-3 py-2 hover:bg-gray-50 text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
                          >
                            Edit paket
                          </Link>
                          <Link
                            href={`/kalkulator?catalog_id=${catalog.id}`}
                            role="menuitem"
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
                      <div id={`row-details-${catalog.id}`} role="region" aria-label={`Detail katalog ${catalog.title}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Ringkasan</div>
                          <div className="mt-1"><span className="text-gray-500">Kategori: </span><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${categoryClass}`}>{catalog.category ?? '-'}</span></div>
                          {catalog.atapName && <div className="mt-1"><span className="text-gray-500">Atap: </span><span className="font-medium text-gray-900">{catalog.atapName}</span></div>}
                          {catalog.rangkaName && <div className="mt-1"><span className="text-gray-500">Rangka: </span><span className="font-medium text-gray-900">{catalog.rangkaName}</span></div>}
                          {catalog.isianName && <div className="mt-1"><span className="text-gray-500">Isian: </span><span className="font-medium text-gray-900">{catalog.isianName}</span></div>}
                          {catalog.finishingName && <div className="mt-1"><span className="text-gray-500">Finishing: </span><span className="font-medium text-gray-900">{catalog.finishingName}</span></div>}
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Harga & HPP</div>
                          <div className="mt-1 font-medium text-gray-900">{formatCurrency(catalog.base_price_per_m2)} / {unitLabel}</div>
                          <div className="mt-1 flex items-center gap-2">
                            {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                              <>
                                <span className="text-gray-800">{formatCurrency(catalog.hpp_per_unit)}</span>
                                <span title="Prioritas berdasarkan HPP relatif" className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
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
                  <div className="mt-1 text-xs text-gray-500 capitalize">
                    {(catalog.category ?? '-')} •{' '}
                    {catalog.created_at
                      ? new Date(catalog.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openConfirm(catalog.id, !catalog.is_popular, catalog.title)
                    }}
                    aria-pressed={catalog.is_popular}
                    aria-label={catalog.is_popular ? 'Batalkan populer' : 'Tandai populer'}
                    title={catalog.is_popular ? 'Batalkan populer' : 'Tandai populer'}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613] ${catalog.is_popular ? 'bg-[#E30613] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    <Star className="w-3 h-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openConfirmActive(catalog.id, !catalog.is_active, catalog.title)
                    }}
                    aria-pressed={catalog.is_active}
                    aria-label={catalog.is_active ? 'Nonaktifkan katalog' : 'Aktifkan katalog'}
                    title={catalog.is_active ? 'Nonaktifkan katalog' : 'Aktifkan katalog'}
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613] ${catalog.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                  >
                    {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>
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
                  <span title="Prioritas berdasarkan HPP relatif" className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${catalog.priorityClassName}`}>{catalog.priorityLabel}</span>
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

      <div className="mt-2 flex flex-col gap-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
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
            aria-controls="catalogs-table"
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
            aria-controls="catalogs-table"
            className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}
