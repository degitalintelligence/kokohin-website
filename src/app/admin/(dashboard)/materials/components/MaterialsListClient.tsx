'use client'
import { useMemo, useState } from 'react'
import styles from '../../page.module.css'
import { Search } from 'lucide-react'
import Link from 'next/link'
import MaterialRow from './MaterialRow'

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

type Props = {
  materials: Material[]
}

export default function MaterialsListClient({ materials }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>('name_asc')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) => {
      const name = m.name?.toLowerCase() ?? ''
      const cat = m.category?.toLowerCase() ?? ''
      const unit = m.unit?.toLowerCase() ?? ''
      return name.includes(q) || cat.includes(q) || unit.includes(q)
    })
  }, [materials, query])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortKey) {
      case 'name_desc':
        arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'id'))
        break
      case 'price_asc':
        arr.sort((a, b) => (a.base_price_per_unit || 0) - (b.base_price_per_unit || 0))
        break
      case 'price_desc':
        arr.sort((a, b) => (b.base_price_per_unit || 0) - (a.base_price_per_unit || 0))
        break
      case 'name_asc':
      default:
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'))
        break
    }
    return arr
  }, [filtered, sortKey])

  return (
    <div>
      <div className="px-5 pb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari material (nama/kategori/satuan)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-between md:justify-end">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613] focus-visible:ring-2 focus-visible:ring-[#E30613]"
          >
            <option value="name_asc">Nama A-Z</option>
            <option value="name_desc">Nama Z-A</option>
            <option value="price_asc">Harga termurah</option>
            <option value="price_desc">Harga termahal</option>
          </select>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Nama</th>
              <th className="hidden md:table-cell">Kategori</th>
              <th className="hidden md:table-cell">Satuan</th>
              <th>Harga Dasar</th>
              <th className="hidden lg:table-cell">Panjang per Unit</th>
              <th className="hidden lg:table-cell">Waste Calculation</th>
              <th className="hidden sm:table-cell">Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  Tidak ada material yang cocok. <Link href="/admin/materials/new">Tambah material</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
