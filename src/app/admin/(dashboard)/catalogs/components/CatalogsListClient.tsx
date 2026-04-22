'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Maximize2, MoreHorizontal, Search, Star, Trash2, Image as ImageIcon, CheckSquare } from 'lucide-react'

type Unit = 'm2' | 'm1' | 'unit'

type CatalogItem = {
  id: string
  title: string
  image_url: string | null
  category?: string | null
  atapName: string
  rangkaName: string
  finishingName?: string
  isianName?: string
  base_price_per_m2: number
  base_price_unit: Unit
  hpp_per_unit: number | null
  is_active: boolean
  is_published?: boolean
  is_popular?: boolean
  created_at: string | null
  atap_id: string | null
  rangka_id: string | null
  finishing_id?: string | null
  isian_id?: string | null
}

type Props = {
  catalogs: CatalogItem[]
  totalCount?: number
  pageSize?: number
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
  const [sortKey, setSortKey] = useState<
    'recent' | 'price_asc' | 'price_desc' | 'hpp_asc' | 'hpp_desc' | 'title_asc'
  >('recent')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [onlyPopular, setOnlyPopular] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [rowsState, setRowsState] = useState<CatalogItem[]>(catalogs)
  const [confirm, setConfirm] = useState<{ id: string; nextVal: boolean; title: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmActive, setConfirmActive] = useState<{ id: string; nextVal: boolean; title: string } | null>(null)
  const [savingActive, setSavingActive] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState<{ id: string; nextVal: boolean; title: string } | null>(null)
  const [savingPublish, setSavingPublish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [savingDelete, setSavingDelete] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkConfirm, setBulkConfirm] = useState<{
    action: 'delete' | 'activate' | 'deactivate' | 'publish' | 'unpublish'
    ids: string[]
  } | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  useEffect(() => {
    setRowsState(catalogs)
  }, [catalogs])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rowsState.some((row) => row.id === id)))
  }, [rowsState])

  useEffect(() => {
    const id = window.setTimeout(() => setPage(1), 0)
    return () => window.clearTimeout(id)
  }, [query, sortKey, categoryFilter, onlyPopular])

  useEffect(() => {
    if (menuOpenId) {
      setTimeout(() => {
        const first = document.querySelector(`#row-menu-${menuOpenId} a`) as HTMLAnchorElement | null
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

  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(rowsState.map((row) => String(row.category || '').trim()).filter((row) => row.length > 0)),
    )
    return unique.sort((a, b) => a.localeCompare(b, 'id-ID'))
  }, [rowsState])

  const isFiltering = query.trim().length > 0
  const total = processed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageItems = processed.slice(startIndex, endIndex)
  const pageIds = pageItems.map((item) => item.id)
  const selectedOnPageCount = pageIds.filter((id) => selectedIds.includes(id)).length
  const allPageSelected = pageIds.length > 0 && selectedOnPageCount === pageIds.length
  const filteredIds = processed.map((item) => item.id)
  const selectedFilteredCount = filteredIds.filter((id) => selectedIds.includes(id)).length
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleToggleMenu = (id: string) => {
    setMenuOpenId((prev) => (prev === id ? null : id))
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev
        return [...prev, id]
      }
      return prev.filter((item) => item !== id)
    })
  }

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) {
        return prev.filter((id) => !pageIds.includes(id))
      }
      const merged = new Set([...prev, ...pageIds])
      return Array.from(merged)
    })
  }

  const openBulkConfirm = (action: 'delete' | 'activate' | 'deactivate' | 'publish' | 'unpublish') => {
    if (selectedIds.length === 0) return
    setBulkError(null)
    setBulkConfirm({ action, ids: selectedIds.slice() })
  }

  const selectAllFiltered = () => {
    setSelectedIds(filteredIds)
  }

  const clearFilteredSelection = () => {
    setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
  }

  const getBulkActionLabel = (action: 'delete' | 'activate' | 'deactivate' | 'publish' | 'unpublish') => {
    if (action === 'delete') return 'Hapus'
    if (action === 'activate') return 'Aktifkan'
    if (action === 'deactivate') return 'Nonaktifkan'
    if (action === 'publish') return 'Publish'
    return 'Unpublish'
  }

  const doBulkAction = async () => {
    if (!bulkConfirm || bulkConfirm.ids.length === 0) return
    setBulkSaving(true)
    setBulkError(null)
    try {
      const ids = bulkConfirm.ids
      const collectFailMessage = (fails: Array<{ id: string; status: number; reason: string }>) => {
        const preview = fails.slice(0, 3).map((f) => `${f.id.slice(0, 8)} (${f.status}: ${f.reason})`).join(', ')
        const suffix = fails.length > 3 ? ` +${fails.length - 3} lainnya` : ''
        return `${fails.length} item gagal diproses: ${preview}${suffix}`
      }
      const extractReason = (body: unknown, fallback = 'Request failed') => {
        if (!body || typeof body !== 'object') return fallback
        const data = body as { details?: unknown; message?: unknown; error?: unknown; code?: unknown }
        return String(data.details || data.message || data.error || data.code || fallback)
      }
      if (bulkConfirm.action === 'delete') {
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/admin/catalogs/delete?id=${id}`, { method: 'DELETE' })
            let reason = 'Request failed'
            try {
              const body = await res.json()
              reason = extractReason(body, reason)
            } catch {}
            return { id, ok: res.ok, status: res.status, reason }
          }),
        )
        const successIds = results.filter((r) => r.ok).map((r) => r.id)
        if (successIds.length > 0) {
          setRowsState((prev) => prev.filter((row) => !successIds.includes(row.id)))
          setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)))
        }
        const fails = results.filter((r) => !r.ok)
        if (fails.length > 0) {
          setBulkError(collectFailMessage(fails))
          return
        }
      } else if (bulkConfirm.action === 'activate' || bulkConfirm.action === 'deactivate') {
        const nextVal = bulkConfirm.action === 'activate'
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch('/api/admin/catalogs/active', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, is_active: nextVal }),
            })
            let reason = 'Request failed'
            try {
              const body = await res.json()
              reason = extractReason(body, reason)
            } catch {}
            return { id, ok: res.ok, status: res.status, reason }
          }),
        )
        const successIds = results.filter((r) => r.ok).map((r) => r.id)
        if (successIds.length > 0) {
          setRowsState((prev) =>
            prev.map((row) => (successIds.includes(row.id) ? { ...row, is_active: nextVal } : row)),
          )
          setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)))
        }
        const fails = results.filter((r) => !r.ok)
        if (fails.length > 0) {
          setBulkError(collectFailMessage(fails))
          return
        }
      } else {
        const nextVal = bulkConfirm.action === 'publish'
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch('/api/admin/catalogs/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, is_published: nextVal }),
            })
            let reason = 'Request failed'
            try {
              const body = await res.json()
              reason = extractReason(body, reason)
            } catch {}
            return { id, ok: res.ok, status: res.status, reason }
          }),
        )
        const successIds = results.filter((r) => r.ok).map((r) => r.id)
        if (successIds.length > 0) {
          setRowsState((prev) =>
            prev.map((row) => (successIds.includes(row.id) ? { ...row, is_published: nextVal } : row)),
          )
          setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)))
        }
        const fails = results.filter((r) => !r.ok)
        if (fails.length > 0) {
          setBulkError(collectFailMessage(fails))
          return
        }
      }
      setBulkConfirm(null)
    } catch (e) {
      console.error(e)
      setBulkError('Terjadi error saat memproses mass action')
    } finally {
      setBulkSaving(false)
    }
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

  const handleDoConfirm = async () => {
    if (!confirm) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/catalogs/popular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirm.id, is_popular: confirm.nextVal }),
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

  const handleDoConfirmActive = async () => {
    if (!confirmActive) return
    setSavingActive(true)
    try {
      const res = await fetch('/api/admin/catalogs/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmActive.id, is_active: confirmActive.nextVal }),
      })
      if (!res.ok) return
      setRowsState((prev) => prev.map((c) => (c.id === confirmActive.id ? { ...c, is_active: confirmActive.nextVal } : c)))
    } finally {
      setSavingActive(false)
      setConfirmActive(null)
    }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    setSavingDelete(true)
    try {
      const res = await fetch(`/api/admin/catalogs/delete?id=${confirmDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setRowsState(prev => prev.filter(c => c.id !== confirmDelete.id))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingDelete(false)
      setConfirmDelete(null)
    }
  }

  const openConfirmPublish = (id: string, nextVal: boolean, title: string) => {
    setConfirmPublish({ id, nextVal, title })
  }

  const handleDoConfirmPublish = async () => {
    if (!confirmPublish) return
    setSavingPublish(true)
    try {
      const res = await fetch('/api/admin/catalogs/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmPublish.id, is_published: confirmPublish.nextVal }),
      })
      if (!res.ok) return
      setRowsState((prev) => prev.map((c) => (c.id === confirmPublish.id ? { ...c, is_published: confirmPublish.nextVal } : c)))
    } finally {
      setSavingPublish(false)
      setConfirmPublish(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari paket berdasarkan nama, atap, atau rangka..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={onlyPopular}
              onChange={(e) => setOnlyPopular(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
            />
            <span className="text-sm font-bold text-gray-700">Populer</span>
          </label>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all cursor-pointer"
          >
            <option value="recent">Terbaru</option>
            <option value="title_asc">Nama A-Z</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="hpp_asc">HPP Terendah</option>
            <option value="hpp_desc">HPP Tertinggi</option>
          </select>
        </div>
      </div>

      {isFiltering && (
        <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Menyaring hasil pencarian...</span>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 mr-2">
            <CheckSquare className="w-4 h-4 text-[#E30613]" />
            {selectedIds.length} katalog dipilih
          </span>
          <span className="text-xs text-gray-500 mr-2">
            {selectedOnPageCount} di halaman ini, {selectedFilteredCount} dari {filteredIds.length} hasil filter
          </span>
          {!allFilteredSelected && filteredIds.length > selectedFilteredCount && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-[#E30613]/10 text-[#E30613] hover:bg-[#E30613]/20"
            >
              Pilih semua hasil filter ({filteredIds.length})
            </button>
          )}
          {allFilteredSelected && (
            <button
              type="button"
              onClick={clearFilteredSelection}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Batalkan pilih semua filter
            </button>
          )}
          <button
            type="button"
            onClick={() => openBulkConfirm('activate')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
          >
            Aktifkan
          </button>
          <button
            type="button"
            onClick={() => openBulkConfirm('deactivate')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
          >
            Nonaktifkan
          </button>
          <button
            type="button"
            onClick={() => openBulkConfirm('publish')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => openBulkConfirm('unpublish')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Unpublish
          </button>
          <button
            type="button"
            onClick={() => openBulkConfirm('delete')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 ml-auto"
          >
            Reset Pilihan
          </button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setConfirm(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-6 text-yellow-600">
              <Star className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center">{confirm.nextVal ? 'Tandai Populer?' : 'Hapus Populer?'}</h3>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              Anda akan {confirm.nextVal ? 'menandai' : 'menghapus'} status populer untuk paket <span className="font-bold text-gray-900">&quot;{confirm.title}&quot;</span>.
            </p>
            {saving && (
              <div className="mt-6 text-sm text-red-600 flex items-center justify-center gap-2 font-bold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang menyimpan...</span>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDoConfirm}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-black text-sm transition-all shadow-lg shadow-red-200 active:scale-[0.98]"
              >
                {confirm.nextVal ? 'Tandai Populer' : 'Batalkan Populer'}
              </button>
              <button
                type="button"
                onClick={() => !saving && setConfirm(null)}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold text-sm transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !savingActive && setConfirmActive(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmActive.nextVal ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${confirmActive.nextVal ? 'bg-green-600' : 'bg-red-600'}`} />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center">{confirmActive.nextVal ? 'Aktifkan Katalog?' : 'Nonaktifkan Katalog?'}</h3>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              Ubah status paket <span className="font-bold text-gray-900">&quot;{confirmActive.title}&quot;</span> menjadi {confirmActive.nextVal ? 'aktif' : 'nonaktif'}.
            </p>
            {savingActive && (
              <div className="mt-6 text-sm text-red-600 flex items-center justify-center gap-2 font-bold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang menyimpan...</span>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDoConfirmActive}
                disabled={savingActive}
                className={`w-full py-3.5 rounded-xl text-white font-black text-sm transition-all shadow-lg active:scale-[0.98] ${confirmActive.nextVal ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
              >
                Ya, {confirmActive.nextVal ? 'Aktifkan' : 'Nonaktifkan'}
              </button>
              <button
                type="button"
                onClick={() => !savingActive && setConfirmActive(null)}
                disabled={savingActive}
                className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold text-sm transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !savingDelete && setConfirmDelete(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 text-red-600">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center">Hapus Katalog?</h3>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              Anda akan menghapus paket <span className="font-bold text-gray-900">&quot;{confirmDelete.title}&quot;</span>. 
              Tindakan ini tidak dapat dibatalkan dan akan berpengaruh pada penawaran yang sedang berjalan.
            </p>
            {savingDelete && (
              <div className="mt-6 text-sm text-red-600 flex items-center justify-center gap-2 font-bold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang menghapus...</span>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={doDelete}
                disabled={savingDelete}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-black text-sm transition-all shadow-lg shadow-red-200 active:scale-[0.98]"
              >
                Ya, Hapus Permanen
              </button>
              <button
                type="button"
                onClick={() => !savingDelete && setConfirmDelete(null)}
                disabled={savingDelete}
                className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold text-sm transition-all"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !savingPublish && setConfirmPublish(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-8">
            <h3 className="text-xl font-black text-gray-900 text-center">{confirmPublish.nextVal ? 'Publish Katalog?' : 'Unpublish Katalog?'}</h3>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              Ubah status publish paket <span className="font-bold text-gray-900">&quot;{confirmPublish.title}&quot;</span>.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDoConfirmPublish}
                disabled={savingPublish}
                className="w-full py-3.5 rounded-xl bg-[#1D1D1B] text-white hover:bg-black font-black text-sm"
              >
                Ya, Simpan
              </button>
              <button
                type="button"
                onClick={() => !savingPublish && setConfirmPublish(null)}
                disabled={savingPublish}
                className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !bulkSaving && setBulkConfirm(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-8">
            <h3 className="text-xl font-black text-gray-900 text-center">
              {getBulkActionLabel(bulkConfirm.action)} {bulkConfirm.ids.length} Katalog?
            </h3>
            <p className="mt-3 text-sm text-gray-500 text-center leading-relaxed">
              Anda akan menjalankan aksi <span className="font-bold text-gray-900">{getBulkActionLabel(bulkConfirm.action)}</span> untuk{' '}
              <span className="font-bold text-gray-900">{bulkConfirm.ids.length}</span> katalog terpilih.
            </p>
            {bulkError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {bulkError}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={doBulkAction}
                disabled={bulkSaving}
                className="w-full py-3.5 rounded-xl bg-[#1D1D1B] text-white hover:bg-black font-black text-sm disabled:opacity-70"
              >
                {bulkSaving ? 'Memproses...' : `Ya, ${getBulkActionLabel(bulkConfirm.action)}`}
              </button>
              <button
                type="button"
                onClick={() => !bulkSaving && setBulkConfirm(null)}
                disabled={bulkSaving}
                className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Desktop */}
      <div className="hidden lg:block overflow-hidden bg-white rounded-xl border border-gray-200">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[4%] text-center">
                <input
                  type="checkbox"
                  aria-label="Pilih semua di halaman ini"
                  checked={allPageSelected}
                  onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[36%]">Info Paket</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%] text-right">Harga Jual</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%] text-right">HPP Estimasi</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[12%] text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[12%] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((catalog) => {
              const unitLabel = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'
              const isExpanded = expandedId === catalog.id
              const isMenuOpen = menuOpenId === catalog.id
              const categoryClass = getCategoryBadgeClass(catalog.category ?? null)

              return (
                <Fragment key={catalog.id}>
                  <tr className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-5 text-center align-top">
                      <input
                        type="checkbox"
                        aria-label={`Pilih katalog ${catalog.title}`}
                        checked={selectedIds.includes(catalog.id)}
                        onChange={(e) => toggleRowSelection(catalog.id, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => openConfirm(catalog.id, !catalog.is_popular, catalog.title)}
                          className={`mt-1 flex-shrink-0 transition-transform active:scale-90 ${
                            catalog.is_popular ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'
                          }`}
                        >
                          <Star className={`w-5 h-5 ${catalog.is_popular ? 'fill-current' : ''}`} />
                        </button>
                        
                        {/* Catalog Thumbnail */}
                        <div className="relative w-16 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                          {catalog.image_url ? (
                            <Image
                              src={catalog.image_url}
                              alt={catalog.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${categoryClass}`}>
                              {catalog.category || 'lainnya'}
                            </span>
                          </div>
                          <Link 
                            href={`/admin/catalogs/${catalog.id}`}
                            className="text-base font-bold text-gray-900 hover:text-[#E30613] transition-colors truncate block"
                          >
                            {catalog.title}
                          </Link>
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(catalog.id)}
                              className="text-[11px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              Detail Material
                            </button>
                            <span className="text-[11px] text-gray-300">|</span>
                            <span className="text-[11px] text-gray-400">ID: {catalog.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-base font-black text-gray-900">
                        {formatCurrency(catalog.base_price_per_m2)}
                      </div>
                      <div className="text-[11px] font-bold text-gray-400">per {unitLabel}</div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {typeof catalog.hpp_per_unit === 'number' && catalog.hpp_per_unit > 0 ? (
                        <div>
                          <div className="text-base font-bold text-gray-700">
                            {formatCurrency(catalog.hpp_per_unit)}
                          </div>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${catalog.priorityClassName}`}>
                              {catalog.priorityLabel.replace('Prioritas ', '')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-300 italic">Belum dihitung</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          type="button"
                          onClick={() => openConfirmActive(catalog.id, !catalog.is_active, catalog.title)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            catalog.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {catalog.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirmPublish(catalog.id, !catalog.is_published, catalog.title)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            catalog.is_published
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {catalog.is_published ? 'Publish' : 'Draft'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2 relative" data-menu-id={catalog.id}>
                        <Link
                          href={`/admin/catalogs/${catalog.id}`}
                          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-[#1D1D1B] hover:text-white transition-all shadow-sm"
                          title="Edit Katalog"
                        >
                          <Search className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleMenu(catalog.id)}
                          className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                            <Link
                              href={`/katalog/${catalog.id}`}
                              target="_blank"
                              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Maximize2 className="w-4 h-4 text-gray-400" />
                              Halaman Publik
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null)
                                setConfirmDelete({ id: catalog.id, title: catalog.title })
                              }}
                              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Hapus Katalog
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50/30">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-4 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm animate-in slide-in-from-top-1">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Atap</p>
                            <p className="text-xs font-bold text-gray-700">{catalog.atapName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rangka</p>
                            <p className="text-xs font-bold text-gray-700">{catalog.rangkaName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Finishing</p>
                            <p className="text-xs font-bold text-gray-700">{catalog.finishingName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Isian</p>
                            <p className="text-xs font-bold text-gray-700">{catalog.isianName || '-'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {pageItems.map((catalog) => {
          const unitLabel = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'
          const categoryClass = getCategoryBadgeClass(catalog.category ?? null)

          return (
            <div key={catalog.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
              {/* Card Image Mobile */}
              <div className="relative aspect-video w-full bg-gray-100">
                {catalog.image_url ? (
                  <Image
                    src={catalog.image_url}
                    alt={catalog.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm ${categoryClass}`}>
                    {catalog.category || 'lainnya'}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <label className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 shadow-sm">
                    <input
                      type="checkbox"
                      aria-label={`Pilih katalog ${catalog.title}`}
                      checked={selectedIds.includes(catalog.id)}
                      onChange={(e) => toggleRowSelection(catalog.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => openConfirm(catalog.id, !catalog.is_popular, catalog.title)}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                      catalog.is_popular ? 'bg-yellow-400 text-white' : 'bg-black/20 text-white'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${catalog.is_popular ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirmActive(catalog.id, !catalog.is_active, catalog.title)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm ${
                      catalog.is_active ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
                    }`}
                  >
                    {catalog.is_active ? 'Aktif' : 'Non'}
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 line-clamp-1">{catalog.title}</h3>

                <div className="grid grid-cols-2 gap-y-4 border-t border-gray-50 pt-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Harga / {unitLabel}</p>
                    <p className="text-sm font-black text-gray-900">{formatCurrency(catalog.base_price_per_m2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">HPP Estimasi</p>
                    <p className="text-sm font-bold text-gray-700">
                      {catalog.hpp_per_unit ? formatCurrency(catalog.hpp_per_unit) : '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/admin/catalogs/${catalog.id}`}
                    className="flex-1 py-2.5 bg-[#1D1D1B] text-white text-xs font-bold rounded-xl text-center shadow-md active:bg-black transition-colors"
                  >
                    Edit Paket
                  </Link>
                  <Link
                    href={`/kalkulator?catalog_id=${catalog.id}`}
                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl text-center shadow-sm active:bg-gray-50 transition-colors"
                  >
                    Buka Kalkulator
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-bold transition-all ${
                currentPage === p
                  ? 'bg-[#E30613] text-white shadow-brand'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      )}
    </div>
  )
}
