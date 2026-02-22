'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { firstRel } from '@/lib/utils'

type HomeCatalog = {
  id: string
  title: string
  image_url: string | null
  atap_id: string | null
  rangka_id: string | null
  base_price_per_m2: number
  category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'
  atap?: { name: string | null } | null
  rangka?: { name: string | null } | null
}

type Props = {
  onSelectType: (type: 'kanopi' | 'pagar') => void
}

export default function HomePricelist({ onSelectType }: Props) {
  const [catalogFilter, setCatalogFilter] = useState<'semua' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'>('semua')
  const [catalogs, setCatalogs] = useState<HomeCatalog[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('catalogs')
          .select('id, title, image_url, category, atap_id, rangka_id, base_price_per_m2, atap:atap_id(name), rangka:rangka_id(name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (fetchError) {
          setCatalogError(fetchError.message)
          setCatalogs([])
          return
        }

        type Row = {
          id: string
          title: string
          image_url: string | null
          category?: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya' | null
          atap_id: string | null
          rangka_id: string | null
          base_price_per_m2: number | null
          atap?: { name: string | null } | { name: string | null }[] | null
          rangka?: { name: string | null } | { name: string | null }[] | null
        }
        const items: HomeCatalog[] = ((data ?? []) as Row[]).map((item) => {
          const atap = firstRel(item.atap ?? null)
          const rangka = firstRel(item.rangka ?? null)
          return {
            id: item.id,
            title: item.title,
            image_url: item.image_url ?? null,
            category: item.category ?? undefined,
            atap_id: item.atap_id ?? null,
            rangka_id: item.rangka_id ?? null,
            base_price_per_m2: item.base_price_per_m2 ?? 0,
            atap,
            rangka
          }
        })
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
          <h2 className="text-3xl font-extrabold mb-4 text-primary-dark">Pricelist & Paket Populer</h2>
          <p className="text-gray-600 max-w-2xl mx-auto font-medium">Temukan inspirasi kombinasi material terbaik.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCatalogs.map((katalog) => {
              const catalogType = katalog.atap_id ? 'kanopi' : 'pagar'
              return (
                <div key={katalog.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col group hover:shadow-xl transition-shadow">
                  <div className="relative h-56 overflow-hidden">
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
                      <span className="text-gray-500 text-sm"> / m²</span>
                    </div>
                    <button
                      onClick={() => onSelectType(catalogType)}
                      className="w-full py-3 border-2 border-primary-dark text-primary-dark rounded-lg font-bold flex justify-center gap-2 hover:bg-primary-dark hover:text-white transition-colors"
                    >
                      Hitung Ukuran Saya <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
