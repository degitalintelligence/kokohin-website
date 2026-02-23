'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Star, Shield, TrendingUp, Package } from 'lucide-react'
import type { Catalog } from '@/lib/types'


const features = [
  { icon: Shield, text: 'Garansi Material 1 Tahun' },
  { icon: Check, text: 'Survey & Konsultasi Gratis' },
  { icon: Star, text: 'Free Maintenance 1 Tahun' },
  { icon: TrendingUp, text: 'Harga Terjangkau' }
]
const FALLBACK_WA = '628000000000'

export default function CatalogGrid() {
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<'all' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'>('all')
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'name_asc'>('price_asc')
  const [q, setQ] = useState('')
  const [waNumber, setWaNumber] = useState(FALLBACK_WA)

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch('/api/public/catalogs', { cache: 'no-store' })
        if (!res.ok) {
          setError('Gagal memuat katalog')
          setCatalogs([])
          return
        }
        const json = await res.json() as { catalogs?: Catalog[] }
        setCatalogs(json.catalogs ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat katalog')
        setCatalogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchCatalogs()
  }, [])
  
  useEffect(() => {
    const fetchWa = async () => {
      try {
        const res = await fetch('/api/site-settings/wa-number', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json() as { wa_number?: string | null }
          if (json.wa_number) setWaNumber(json.wa_number)
        }
      } catch {
        // ignore
      }
    }
    fetchWa()
  }, [])
  
  const presentCategories = Array.from(
    new Set(
      (catalogs ?? [])
        .map((c) => c.category)
        .filter(Boolean) as Array<'kanopi'|'pagar'|'railing'|'aksesoris'|'lainnya'>
    )
  )
  const labelFor = (cat: string) => {
    switch (cat) {
      case 'kanopi': return 'Kanopi'
      case 'pagar': return 'Pagar'
      case 'railing': return 'Railing'
      case 'aksesoris': return 'Aksesoris'
      default: return 'Lainnya'
    }
  }
  const filtered = catalogs.filter(c => category === 'all' ? true : c.category === category)
  const searched = filtered.filter(c => c.title.toLowerCase().includes(q.trim().toLowerCase()))
  const sorted = [...searched].sort((a, b) => {
    if (sort === 'price_asc') return (a.base_price_per_m2 || 0) - (b.base_price_per_m2 || 0)
    if (sort === 'price_desc') return (b.base_price_per_m2 || 0) - (a.base_price_per_m2 || 0)
    return a.title.localeCompare(b.title, 'id')
  })
  
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const calculatePriceForArea = (basePrice: number, area: number = 10) => {
    return basePrice * area
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">PAKET POPULER</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
          Pilihan Paket Kanopi Terbaik
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Dari kanopi standar hingga custom premium, kami menawarkan solusi lengkap dengan harga transparan.
        </p>
      </div>
      
      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium text-gray-800">{feature.text}</span>
          </div>
        ))}
      </div>
      
      {presentCategories.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3.5 py-2 rounded-full text-sm font-bold transition-colors border ${category === 'all' ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              Semua
            </button>
            {presentCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-2 rounded-full text-sm font-bold transition-colors border ${category === cat ? 'bg-[#E30613] text-white border-[#E30613]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {labelFor(cat)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="input md:w-56"
            >
              <option value="price_asc">Urutkan: Harga Termurah</option>
              <option value="price_desc">Urutkan: Harga Termahal</option>
              <option value="name_asc">Urutkan: Nama A-Z</option>
            </select>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari paket..."
              className="input w-full md:w-64"
            />
          </div>
        </div>
      )}
      
      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-10 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded-md animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-600 mb-16">Gagal memuat katalog.</div>
      ) : catalogs.length === 0 ? (
        <div className="text-center text-gray-600 mb-16">Belum ada paket yang tersedia.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {sorted.map((catalog) => {
          const estimatedPrice = calculatePriceForArea(catalog.base_price_per_m2, 10)
          const isSelected = selectedCatalog === catalog.id
          
          return (
            <div
              key={catalog.id}
              className={`group relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
                isSelected ? 'border-primary shadow-brand' : 'border-transparent'
              }`}
              onClick={() => setSelectedCatalog(catalog.id)}
            >
              {/* Badge */}
              <div className="absolute top-4 left-4 z-10">
                <div className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                  POPULER
                </div>
              </div>
              
              {/* Image */}
              <div className="h-48 overflow-hidden bg-gray-100 relative">
                <Image
                  src={catalog.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop'}
                  alt={catalog.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-primary-dark mb-3 line-clamp-2">
                  {catalog.title}
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-gray-500 font-medium">Mulai dari</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatRupiah(catalog.base_price_per_m2)}
                      </span>
                      <span className="text-gray-500">/m²</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Estimasi 10m²: <span className="font-semibold">{formatRupiah(estimatedPrice)}</span>
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Termasuk:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Material berkualitas</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Pemasangan profesional</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Garansi instalasi</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = `/kalkulator?catalog=${catalog.id}`
                    }}
                    className="w-full btn btn-primary"
                  >
                    Hitung Harga
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = `/kontak`
                    }}
                    className="w-full btn btn-outline"
                  >
                    Konsultasi Gratis
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary-dark to-primary rounded-3xl p-8 md:p-12 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Butuh Paket Custom atau Spesifikasi Khusus?
              </h3>
              <p className="text-white/90 mb-6">
                Tim Ahli kami akan mendesain kebutuhan Anda sesuai dengan konsep dan spesifikasi yang diinginkan. 
                Dapatkan penawaran produk berkualitas kami sesuai budget Anda!
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/kontak'}
                  className="btn bg-white text-primary-dark hover:bg-white/90 font-bold px-8"
                >
                  Request Estimasi Harga
                </button>
                <button
                  onClick={() => window.location.href = `https://wa.me/${waNumber}`}
                  className="btn bg-white/20 text-white hover:bg-white/30 ml-4"
                >
                  Chat via WhatsApp
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-sm text-white/80">Proyek Selesai</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">1 Tahun</div>
                <div className="text-sm text-white/80">Garansi Material</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-sm text-white/80">Kepuasan Klien</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">24 Jam</div>
                <div className="text-sm text-white/80">Respon Cepat</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="mt-16">
        <h3 className="text-3xl font-bold text-primary-dark text-center mb-8">
          Pertanyaan Umum
        </h3>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            {
              q: 'Berapa lama proses produksi dan instalasi hingga selesai?',
              a: 'Pengerjaan dilakukan 2-7 hari setelah survei dan down payment; pemasangan dilakukan sesuai jadwal yang disepakati bersama klien.'
            },
            {
              q: 'Bagaimana proses klaim maintenance dan garansi produk?',
              a: 'Klien dapat melakukan klaim perawatan dan perbaikan material serta instalasi selama 1 tahun.'
            },
            {
              q: 'Bagaimana proses pembayaran?',
              a: 'Setelah survei dilakukan, kami menerbitkan penawaran kepada klien. Jika penawaran sudah sesuai, klien dapat melakukan down payment 50% dari total harga agar proses produksi bisa dilakukan. Kemudian, setelah produksi selesai, klien melakukan pembayaran 40% untuk melanjutkan proses instalasi. Sisa pembayaran dilakukan setelah seluruh proses pekerjaan selesai. Pembayaran dilakukan melalui transfer bank ke rekening resmi perusahaan.'
            }
          ].map((faq, index) => (
            <div key={index} className="card hover:shadow-md transition-shadow">
              <h4 className="font-bold text-primary-dark mb-2">{faq.q}</h4>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
