'use client'
import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import styles from '../../page.module.css'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import MaterialRow from './MaterialRow'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from '@/components/ui/toaster'
import { bulkDeleteMaterials, bulkMoveMaterialsCategory } from '@/app/actions/materials'

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

type Props = {
  materials: Material[]
  categories: Array<{ code: string; name: string }>
  activeCategory: string | null
}

const NOW_TS = Date.now()

export default function MaterialsListClient({ materials, categories, activeCategory }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>('name_asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [collapsedParentIds, setCollapsedParentIds] = useState<string[]>([])
  const [hoveredRootId, setHoveredRootId] = useState<string | null>(null)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(false)
  const [targetCategory, setTargetCategory] = useState<string>(activeCategory ?? categories[0]?.code ?? '')
  const [isBulkDeleting, startBulkDelete] = useTransition()
  const [isBulkMoving, startBulkMove] = useTransition()
  const router = useRouter()
  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) => {
      const code = m.code?.toLowerCase() ?? ''
      const name = m.name?.toLowerCase() ?? ''
      const cat = m.category?.toLowerCase() ?? ''
      const unit = m.unit?.toLowerCase() ?? ''
      return code.includes(q) || name.includes(q) || cat.includes(q) || unit.includes(q)
    })
  }, [deferredQuery, materials])

  const hierarchyRows = useMemo(() => {
    const sortFn = (a: Material, b: Material) => {
      switch (sortKey) {
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '', 'id')
        case 'price_asc':
          return (a.base_price_per_unit || 0) - (b.base_price_per_unit || 0)
        case 'price_desc':
          return (b.base_price_per_unit || 0) - (a.base_price_per_unit || 0)
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '', 'id')
      }
    }

    const idSet = new Set(filtered.map((m) => m.id))
    const childrenByParent = new Map<string, Material[]>()
    filtered.forEach((material) => {
      const parentId = material.parent_material_id
      if (!parentId || !idSet.has(parentId)) return
      const bucket = childrenByParent.get(parentId) ?? []
      bucket.push(material)
      childrenByParent.set(parentId, bucket)
    })

    childrenByParent.forEach((value, key) => {
      childrenByParent.set(key, [...value].sort(sortFn))
    })

    const roots = filtered
      .filter((material) => !material.parent_material_id || !idSet.has(material.parent_material_id))
      .sort(sortFn)

    const visited = new Set<string>()
    const rows: Array<{ material: Material; depth: number; childCount: number; ancestorIds: string[] }> = []

    const appendNode = (material: Material, depth: number, ancestorIds: string[]) => {
      if (visited.has(material.id)) return
      visited.add(material.id)
      const children = childrenByParent.get(material.id) ?? []
      rows.push({ material, depth, childCount: children.length, ancestorIds })
      children.forEach((child) => appendNode(child, depth + 1, [...ancestorIds, material.id]))
    }

    roots.forEach((root) => appendNode(root, 0, []))
    filtered.forEach((material) => appendNode(material, 0, []))

    return rows
  }, [filtered, sortKey])

  const collapsibleParentIds = useMemo(
    () =>
      hierarchyRows
        .filter((row) => row.depth === 0 && row.childCount > 0)
        .map((row) => row.material.id),
    [hierarchyRows],
  )

  const visibleRows = useMemo(
    () =>
      hierarchyRows.filter((row) => row.ancestorIds.every((ancestorId) => !collapsedParentIds.includes(ancestorId))),
    [hierarchyRows, collapsedParentIds],
  )

  const totalActive = useMemo(() => materials.filter((m) => m.is_active).length, [materials])
  const totalInactive = materials.length - totalActive
  const visibleIds = useMemo(() => visibleRows.map((item) => item.material.id), [visibleRows])
  const selectedVisibleCount = useMemo(
    () => selectedIds.filter((id) => visibleIds.includes(id)).length,
    [selectedIds, visibleIds],
  )
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const priceUpdateStats = useMemo(() => {
    const validDates = materials
      .map((m) => (m.updated_at ? new Date(m.updated_at).getTime() : Number.NaN))
      .filter((ts) => Number.isFinite(ts))
    if (validDates.length === 0) {
      return {
        latestLabel: '-',
        staleCount: 0,
      }
    }
    const latestTs = Math.max(...validDates)
    const now = NOW_TS
    const staleCount = materials.filter((m) => {
      if (!m.updated_at) return true
      const ts = new Date(m.updated_at).getTime()
      if (!Number.isFinite(ts)) return true
      const diffDays = Math.floor((now - ts) / (1000 * 60 * 60 * 24))
      return diffDays > 30
    }).length
    return {
      latestLabel: new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(latestTs)),
      staleCount,
    }
  }, [materials])

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    startBulkDelete(async () => {
      try {
        const result = await bulkDeleteMaterials(selectedIds)
        toast.success(`Berhasil menghapus ${result.deletedCount} material`)
        setSelectedIds([])
        setShowBulkConfirm(false)
        router.refresh()
      } catch (error) {
        toast.error(
          'Gagal menghapus material massal',
          error instanceof Error ? error.message : 'Terjadi kesalahan',
        )
      }
    })
  }

  const handleBulkMoveCategory = () => {
    if (selectedIds.length === 0) return
    if (!targetCategory) {
      toast.error('Pilih kategori tujuan terlebih dahulu')
      return
    }
    startBulkMove(async () => {
      try {
        const result = await bulkMoveMaterialsCategory(selectedIds, targetCategory)
        toast.success(
          `Berhasil memindahkan ${result.movedCount} material ke kategori ${result.targetCategory}`,
          result.autoIncludedCount > 0
            ? `${result.autoIncludedCount} material terkait parent/varian ikut dipindahkan otomatis.`
            : undefined,
        )
        setSelectedIds([])
        setShowBulkMoveConfirm(false)
        router.refresh()
      } catch (error) {
        toast.error(
          'Gagal memindahkan kategori massal',
          error instanceof Error ? error.message : 'Terjadi kesalahan',
        )
      }
    })
  }

  return (
    <div>
      <div className="px-5 pb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm relative">
          <label htmlFor="materials-search" className="sr-only">
            Cari material
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            id="materials-search"
            type="text"
            placeholder="Cari material (kode/nama/kategori/satuan)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
            aria-controls="materials-table"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-between md:justify-end">
          <label htmlFor="materials-sort" className="sr-only">
            Urutkan material
          </label>
          <select
            id="materials-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
            aria-label="Urutkan daftar material"
          >
            <option value="name_asc">Nama A-Z</option>
            <option value="name_desc">Nama Z-A</option>
            <option value="price_asc">Harga termurah</option>
            <option value="price_desc">Harga termahal</option>
          </select>
          {collapsibleParentIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCollapsedParentIds((prev) =>
                  prev.length === collapsibleParentIds.length ? [] : collapsibleParentIds,
                )
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {collapsedParentIds.length === collapsibleParentIds.length
                ? 'Expand Semua Varian'
                : 'Collapse Semua Varian'}
            </button>
          )}
        </div>
      </div>
      <div className="px-5 pb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 font-semibold">
          Hasil: {hierarchyRows.length}
        </span>
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-green-700 font-semibold">
          Aktif: {totalActive}
        </span>
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-red-700 font-semibold">
          Nonaktif: {totalInactive}
        </span>
        {selectedIds.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-[#E30613]/10 px-2.5 py-1 text-[#E30613] font-semibold">
            Dipilih: {selectedIds.length}
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
          Mode: Hierarki Parent-Varian
        </span>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 font-semibold">
          Latest Price Update: {priceUpdateStats.latestLabel}
        </span>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 font-semibold">
          Belum update {'>'}30 hari: {priceUpdateStats.staleCount}
        </span>
      </div>
      {selectedIds.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="bulk-category-target" className="text-xs font-semibold text-gray-700">
            Kategori tujuan:
          </label>
          <select
            id="bulk-category-target"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]"
            aria-label="Pilih kategori tujuan untuk material terpilih"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowBulkMoveConfirm(true)}
            className="btn btn-outline-dark btn-sm"
            disabled={!targetCategory}
          >
            Pindah Kategori ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={() => setShowBulkConfirm(true)}
            className="btn btn-outline-danger btn-sm"
          >
            Hapus Massal ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="btn btn-outline-dark btn-sm"
          >
            Reset Pilihan
          </button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        Menampilkan {hierarchyRows.length} material
      </p>
      <div className={styles.tableWrap}>
        <table id="materials-table" className={styles.table}>
          <caption className="sr-only">
            Tabel daftar material beserta harga, kategori, status, dan aksi
          </caption>
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Pilih semua material di hasil saat ini"
                  className="h-4 w-4 rounded border-gray-300 text-[#E30613] focus:ring-[#E30613]"
                />
              </th>
              <th className="sticky left-10 z-20 bg-gray-50 min-w-[260px]">Material</th>
              <th className="hidden md:table-cell">Kategori</th>
              <th className="hidden md:table-cell">Satuan</th>
              <th>Harga Dasar</th>
              <th className="hidden lg:table-cell">Panjang per Unit</th>
              <th className="hidden lg:table-cell">Waste Calculation</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="sticky right-0 z-20 bg-gray-50">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ material, depth, childCount, ancestorIds }) => {
              const rootId = ancestorIds[0] ?? material.id
              return (
              <MaterialRow
                key={material.id}
                material={material}
                selected={selectedIds.includes(material.id)}
                onToggleSelected={() => toggleOne(material.id)}
                depth={depth}
                childCount={childCount}
                collapsed={collapsedParentIds.includes(material.id)}
                rootId={rootId}
                groupHovered={hoveredRootId === rootId}
                onGroupHoverChange={(isHovered) => setHoveredRootId(isHovered ? rootId : null)}
                onToggleCollapse={
                  depth === 0 && childCount > 0
                    ? () =>
                        setCollapsedParentIds((prev) =>
                          prev.includes(material.id)
                            ? prev.filter((id) => id !== material.id)
                            : [...prev, material.id],
                        )
                    : undefined
                }
              />
              )
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  Tidak ada material yang cocok. <Link href="/admin/materials/new">Tambah material</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={showBulkConfirm}
        title="Konfirmasi Hapus Massal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} material terpilih?`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleBulkDelete}
        onCancel={() => {
          if (!isBulkDeleting) setShowBulkConfirm(false)
        }}
        pending={isBulkDeleting}
        danger
      />
      <ConfirmModal
        open={showBulkMoveConfirm}
        title="Konfirmasi Pindah Kategori Massal"
        description={`Pindahkan ${selectedIds.length} material ke kategori "${targetCategory}"?`}
        confirmLabel={isBulkMoving ? 'Memindahkan...' : 'Pindahkan'}
        onConfirm={handleBulkMoveCategory}
        onCancel={() => {
          if (!isBulkMoving) setShowBulkMoveConfirm(false)
        }}
        pending={isBulkMoving}
        danger={false}
      />
    </div>
  )
}
