'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Calculator, Wrench, MapPin, Hammer } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
 

const HomePricelist = dynamic(() => import('@/components/home/HomePricelist'))

// (home hero & pricelist only, funnel removed)

export default function HomePage() {
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/site-settings/login-background-url', { cache: 'no-store' })
        if (res.ok) {
          const json = (await res.json()) as { login_background_url?: string | null }
          setHeroBgUrl(json.login_background_url ?? null)
        }
      } catch {
        setHeroBgUrl(null)
      }
    }
    run()
  }, [])


 

 

  const handleSelectCatalog = (type: 'kanopi' | 'pagar', catalogId?: string) => {
    const params = new URLSearchParams()
    params.set('jenis', type)
    if (catalogId) params.set('catalog', catalogId)
    router.push(`/kalkulator?${params.toString()}`)
  }

 

 

 

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-primary-dark font-sans">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-primary-dark text-white">
        {/* Background Image */}
        {heroBgUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={heroBgUrl}
              alt="Hero Background"
              fill
              sizes="100vw"
              quality={60}
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary-dark/0" />
          </div>
        )}

        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 animate-fade-in-up shadow-lg">
            <ShieldCheck size={16} className="text-primary drop-shadow-md" />
            <span className="text-sm font-semibold tracking-wide drop-shadow-md">GARANSI KONSTRUKSI 1 TAHUN</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-5xl mx-auto drop-shadow-2xl">
            Ahlinya Kanopi, Pagar, &amp; Railing <br />
            <span className="text-primary drop-shadow-lg">Transparan: tanpa biaya siluman!</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-2xl mx-auto font-medium drop-shadow-lg">Struktur teliti, eksekusi rapi, produk bergaransi.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/kalkulator" className="flex items-center justify-center gap-2 text-white font-bold py-4 px-8 rounded-md text-lg bg-primary hover:bg-red-700 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200">
              <Calculator size={20} className="drop-shadow-md" /> <span className="drop-shadow-md">Coba Simulasi</span>
            </Link>
            <Link href="/katalog" className="flex items-center justify-center gap-2 bg-white font-bold py-4 px-8 rounded-md text-lg text-primary-dark hover:bg-gray-100 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200">
              Lihat Pricelist
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container">
          <div className="relative overflow-hidden mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-white to-gray-50 p-8 md:p-12 border border-gray-100 shadow-sm">
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_2px_2px,_#000_1px,_transparent_1.5px)] bg-[length:18px_18px]" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-primary-dark text-center mb-3">
                Ubah Ruang Terbuka Anda jadi Aman, Nyaman, dan Menginspirasi!
              </h2>
              <div className="divider divider--center mx-auto mb-4" />
              <p className="text-center text-gray-600 max-w-3xl mx-auto">
                Kokohin bukan hanya jasa las biasa, kami mengubah suasana ruang terbuka Anda jadi lebih bermakna!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h3 className="text-xl md:text-2xl font-bold text-primary-dark text-center mb-8">
            Langkah Mudah untuk Layanan Istimewa
          </h3>
          <div className="relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute left-6 right-6 top-12 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent z-0" />
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <div className="group rounded-2xl bg-white border border-gray-200 shadow-sm p-6 text-center transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20">
                <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-extrabold tracking-wide text-primary-dark">KONSULTASI &amp; ESTIMASI</div>
                <div className="mt-1 text-xs text-gray-500">Diskusi kebutuhan dan estimasi awal</div>
              </div>
              <div className="group rounded-2xl bg-white border border-gray-200 shadow-sm p-6 text-center transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20">
                <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-extrabold tracking-wide text-primary-dark">SURVEI</div>
                <div className="mt-1 text-xs text-gray-500">Pengukuran dan pengecekan lokasi</div>
              </div>
              <div className="group rounded-2xl bg-white border border-gray-200 shadow-sm p-6 text-center transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20">
                <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Hammer className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-extrabold tracking-wide text-primary-dark">PRODUKSI &amp; PEMASANGAN</div>
                <div className="mt-1 text-xs text-gray-500">Pembuatan, instalasi, dan serah terima</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CATALOG SECTION (Lazy-loaded) */}
      <Suspense fallback={<div className="text-center py-12 text-gray-600">Memuat paket populer...</div>}>
        <HomePricelist onSelectType={handleSelectCatalog} />
      </Suspense>

      {/* KALKULATOR FUNNEL DIHAPUS */}

    </div>
  )
}
