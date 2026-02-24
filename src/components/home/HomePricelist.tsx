'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'


type HomeCatalog = {
  id: string
  title: string
  image_url: string | null
  atap_id: string | null
  rangka_id: string | null
  base_price_per_m2: number
  base_price_unit?: 'm2' | 'm1' | 'unit'
  category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'
  atap?: { name: string | null } | null
  rangka?: { name: string | null } | null
}

type Props = {
  onSelectType: (type: 'kanopi' | 'pagar', catalogId?: string) => void
}

export default function HomePricelist({ onSelectType }: Props) {
  const [catalogFilter, setCatalogFilter] = useState<'semua' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'>('semua')
  const [catalogs, setCatalogs] = useState<HomeCatalog[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch('/api/public/catalogs?popular=1&limit=6', { cache: 'no-store' })
        if (!res.ok) {
          setCatalogError('Gagal memuat katalog')
          setCatalogs([])
          return
        }
        const json = await res.json() as {
          catalogs?: Array<{
            id: string
            title: string
            image_url: string | null
            category?: HomeCatalog['category']
            atap_id: string | null
            rangka_id: string | null
            base_price_per_m2: number | null
            base_price_unit?: 'm2' | 'm1' | 'unit' | null
            atap?: { name: string | null } | null
            rangka?: { name: string | null } | null
          }>
        }
        const items: HomeCatalog[] = (json.catalogs ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          image_url: item.image_url ?? null,
          category: item.category ?? undefined,
          atap_id: item.atap_id ?? null,
          rangka_id: item.rangka_id ?? null,
          base_price_per_m2: item.base_price_per_m2 ?? 0,
          base_price_unit: item.base_price_unit ?? 'm2',
          atap: item.atap ?? null,
          rangka: item.rangka ?? null
        }))
        setCatalogs(items)
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Gagal memuat katalog')
        setCatalogs([])
      } finally {
        setCatalogLoading(false)
      }
    }
    fetchCatalogs()
  }, [])

  const presentCategories = useMemo(() => {
    const set = new Set<string>()
    catalogs.forEach((c) => {
      if (c.category) set.add(c.category)
      else set.add(c.atap_id ? 'kanopi' : 'pagar')
    })
    const order: Array<'kanopi'|'pagar'|'railing'|'aksesoris'|'lainnya'> = ['kanopi','pagar','railing','aksesoris','lainnya']
    return order.filter((x) => set.has(x))
  }, [catalogs])

  const filteredCatalogs = useMemo(() => {
    if (catalogFilter === 'semua') return catalogs
    return catalogs.filter((c) => {
      const inferred = c.atap_id ? 'kanopi' : 'pagar'
      const cat = c.category ?? (inferred as HomeCatalog['category'])
      return cat === catalogFilter
    })
  }, [catalogFilter, catalogs])
  const totalPages = Math.max(1, Math.ceil(filteredCatalogs.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filteredCatalogs.slice((currentPage - 1) * pageSize, (currentPage) * pageSize)

  const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

  return (
    <section id="pricelist" className="py-16 bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-4 text-primary-dark">Produk Populer</h2>
          <p className="text-gray-600 max-w-2xl mx-auto font-medium">Pilihan paket favorit pelanggan kami.</p>
        </div>
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setCatalogFilter('semua')}
              className={`px-6 py-2.5 rounded-md font-bold text-sm capitalize transition-colors ${catalogFilter === 'semua' ? 'bg-primary-dark text-white' : 'text-gray-500 hover:text-primary-dark'}`}
            >
              semua
            </button>
            {presentCategories.map((tab) => (
              <button
                key={tab}
                onClick={() => setCatalogFilter(tab)}
                className={`px-6 py-2.5 rounded-md font-bold text-sm capitalize transition-colors ${catalogFilter === tab ? 'bg-primary-dark text-white' : 'text-gray-500 hover:text-primary-dark'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {catalogLoading ? (
          <>
            <div className="flex justify-center mb-10">
              <div className="inline-flex bg-white p-1 rounded-lg border border-gray-200">
                <div className="px-16 py-2.5 rounded-md bg-gray-200 animate-pulse" />
                <div className="px-16 py-2.5 rounded-md ml-2 bg-gray-200 animate-pulse hidden sm:block" />
                <div className="px-16 py-2.5 rounded-md ml-2 bg-gray-200 animate-pulse hidden md:block" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                  <div className="h-56 bg-gray-200 animate-pulse" />
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
                    <div className="space-y-2 mb-6">
                      <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="h-8 bg-gray-200 rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : catalogError ? (
          <div className="text-center text-red-600">Gagal memuat katalog.</div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pageItems.map((katalog) => {
              const catalogType = katalog.atap_id ? 'kanopi' : 'pagar'
              return (
                <div key={katalog.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col group hover:shadow-xl transition-shadow">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={katalog.image_url ?? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop'}
                      alt={katalog.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                      <span className="inline-block px-2 py-1 bg-primary text-white text-[10px] font-bold rounded mb-1 uppercase tracking-wider">{catalogType}</span>
                      <h3 className="text-white font-bold text-xl">{katalog.title}</h3>
                    </div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="space-y-3 mb-6 flex-grow text-sm">
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">{catalogType === 'kanopi' ? 'Atap' : 'Desain'}</span>
                        <span className="font-bold">{katalog.atap?.name ?? 'Custom'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Rangka</span>
                        <span className="font-bold">{katalog.rangka?.name ?? 'Rangka'}</span>
                      </div>
                    </div>
                    <div className="mb-6">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Mulai Dari</p>
                      <span className="text-2xl font-extrabold text-primary">{formatRupiah(katalog.base_price_per_m2)}</span>
                      <span className="text-gray-500 text-sm">
                        {` / ${katalog.base_price_unit === 'm2' ? 'm²' : katalog.base_price_unit === 'm1' ? 'm¹' : 'unit'}`}
                      </span>
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white"
                          title={
                            katalog.base_price_unit === 'm2'
                              ? 'Kalkulasi: m² = panjang × lebar'
                              : katalog.base_price_unit === 'm1'
                                ? 'Kalkulasi: m¹ = panjang'
                                : 'Kalkulasi: unit = jumlah'
                          }
                        >
                          Satuan: {katalog.base_price_unit === 'm2' ? 'm²' : katalog.base_price_unit === 'm1' ? 'm¹' : 'unit'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectType(catalogType, katalog.id)}
                      className="w-full py-3 border-2 border-primary-dark text-primary-dark rounded-lg font-bold flex justify-center gap-2 hover:bg-primary-dark hover:text-white transition-colors"
                    >
                      Hitung Ukuran Saya <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {filteredCatalogs.length > pageSize && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <div className="px-2">
                Halaman <span className="font-semibold">{currentPage}</span> dari{' '}
                <span className="font-semibold">{totalPages}</span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                Berikutnya
              </button>
            </div>
          )}
          </>
        )}
        <div className="mt-10 text-center">
          <a href="/katalog" className="inline-flex items-center justify-center rounded-lg border-2 border-primary-dark text-primary-dark px-6 py-3 font-bold hover:bg-primary-dark hover:text-white transition-colors">
            Lihat Semua Produk
          </a>
        </div>
      </div>
    </section>
  )
}
