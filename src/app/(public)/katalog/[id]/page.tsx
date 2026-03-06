import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, Ruler, Tag, MessageCircle, Calculator, ChevronLeft, Package, CheckCircle2 } from 'lucide-react'

interface CatalogPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: catalog } = await supabase
    .from('catalogs')
    .select('title, category')
    .eq('id', id)
    .maybeSingle()

  if (!catalog) return { title: 'Katalog Tidak Ditemukan' }

  return {
    title: `${catalog.title} | Katalog Kokohin`,
    description: `Detail paket ${catalog.title} dari Kokohin. Spesifikasi material berkualitas, harga transparan, dan garansi terjamin.`,
  }
}

export default async function CatalogDetailPage({ params }: CatalogPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: catalog, error } = await supabase
    .from('catalogs')
    .select(`
      id, 
      title, 
      description,
      image_url, 
      category, 
      base_price_per_m2, 
      base_price_unit,
      atap:atap_id(name),
      rangka:rangka_id(name),
      finishing:finishing_id(name),
      isian:isian_id(name),
      is_active,
      is_popular
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !catalog || catalog.is_active === false) {
    notFound()
  }

  const unwrap = (val: { name: string | null } | { name: string | null }[] | null) => (Array.isArray(val) ? val[0] : val)
  const atap = unwrap(catalog.atap as { name: string | null } | { name: string | null }[] | null)
  const rangka = unwrap(catalog.rangka as { name: string | null } | { name: string | null }[] | null)
  const finishing = unwrap(catalog.finishing as { name: string | null } | { name: string | null }[] | null)
  const isian = unwrap(catalog.isian as { name: string | null } | { name: string | null }[] | null)

  const { data: waSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'wa_number')
    .maybeSingle()
  const waNumber = (waSetting as { value?: string } | null)?.value ?? '628000000000'
  
  const unit = catalog.base_price_unit ?? 'm2'
  const unitLabel = unit === 'm2' ? 'm²' : unit === 'm1' ? 'm¹' : 'unit'
  const sampleQty = unit === 'unit' ? 1 : 10
  const estimatedPrice = (catalog.base_price_per_m2 || 0) * sampleQty

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo Kokohin, saya tertarik dengan paket *${catalog.title}*. Bisa bantu info lebih lanjut?`)}`

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/katalog" className="flex items-center gap-2 text-gray-600 hover:text-primary font-bold transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Kembali ke Katalog
          </Link>
          <div className="hidden md:block">
             <span className="text-sm text-gray-400 font-medium">Katalog / {catalog.category} / </span>
             <span className="text-sm text-gray-900 font-bold">{catalog.title}</span>
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          
          {/* Left Column: Image & Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Main Image */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-white border border-gray-100">
              {catalog.is_popular && (
                <div className="absolute top-6 left-6 z-10">
                  <div className="px-4 py-1.5 bg-primary text-white text-sm font-black rounded-full shadow-lg">
                    POPULER
                  </div>
                </div>
              )}
              <Image
                src={catalog.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop'}
                alt={catalog.title}
                fill
                priority
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Content Details */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
              <h1 className="text-3xl md:text-4xl font-black text-primary-dark mb-4">
                {catalog.title}
              </h1>
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  Kategori: {catalog.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  Satuan: {unitLabel}
                </span>
              </div>

              <div className="prose prose-red max-w-none text-gray-600 leading-relaxed mb-10">
                {catalog.description ? (
                  <p className="whitespace-pre-line">{catalog.description}</p>
                ) : (
                  <p>
                    Paket <strong>{catalog.title}</strong> adalah solusi kanopi profesional dari Kokohin yang dirancang untuk memberikan perlindungan maksimal dengan estetika modern. Kami menggunakan material pilihan yang telah teruji kekuatannya untuk memastikan kanopi Anda tahan lama di berbagai kondisi cuaca.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Spesifikasi Material
                  </h3>
                  <ul className="space-y-4">
                    {atap?.name && (
                      <li className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Atap</span>
                        <span className="text-sm font-bold text-gray-900">{atap.name}</span>
                      </li>
                    )}
                    {rangka?.name && (
                      <li className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Rangka</span>
                        <span className="text-sm font-bold text-gray-900">{rangka.name}</span>
                      </li>
                    )}
                    {isian?.name && (
                      <li className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Isian</span>
                        <span className="text-sm font-bold text-gray-900">{isian.name}</span>
                      </li>
                    )}
                    {finishing?.name && (
                      <li className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Finishing</span>
                        <span className="text-sm font-bold text-gray-900">{finishing.name}</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Layanan Termasuk
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Material Standar SNI',
                      'Tenaga Pasang Profesional',
                      'Garansi Perawatan 1 Tahun',
                      'Survei & Konsultasi Gratis',
                      'Pembersihan Area Proyek'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & CTA */}
          <div className="lg:col-span-5 sticky top-24 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <div className="mb-6">
                <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">Harga Mulai Dari</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-primary">
                    {formatRupiah(catalog.base_price_per_m2 || 0)}
                  </span>
                  <span className="text-lg text-gray-400 font-bold">/{unitLabel}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Simulasi Harga</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Estimasi {sampleQty} {unitLabel}</span>
                  <span className="text-lg font-black text-primary-dark">{formatRupiah(estimatedPrice)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 italic">
                  * Harga final ditentukan setelah survei lokasi dan pengukuran presisi.
                </p>
              </div>

              <div className="space-y-4">
                <Link 
                  href={`/kalkulator?catalog_id=${catalog.id}`}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-primary-dark text-white rounded-xl font-black text-lg shadow-lg hover:bg-black transition-all active:scale-[0.98]"
                >
                  <Calculator className="w-5 h-5" />
                  Simulasi Harga Presisi
                </Link>
                <a 
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-green-700 transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-5 h-5" />
                  Konsultasi via WhatsApp
                </a>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <ShieldCheck className="w-6 h-6 text-gray-400 mx-auto" />
                  <p className="text-[10px] font-black text-gray-500 uppercase">Garansi 1 Thn</p>
                </div>
                <div className="space-y-1">
                  <Ruler className="w-6 h-6 text-gray-400 mx-auto" />
                  <p className="text-[10px] font-black text-gray-500 uppercase">Survei Gratis</p>
                </div>
                <div className="space-y-1">
                  <Tag className="w-6 h-6 text-gray-400 mx-auto" />
                  <p className="text-[10px] font-black text-gray-500 uppercase">Harga Jujur</p>
                </div>
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="bg-primary-dark rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <h3 className="text-xl font-bold mb-3 relative z-10">Butuh Custom?</h3>
              <p className="text-sm text-white/70 mb-6 relative z-10">
                Punya desain sendiri atau ingin kombinasi material berbeda? Kami siap mewujudkannya.
              </p>
              <Link 
                href="/kontak" 
                className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-primary transition-colors relative z-10"
              >
                Hubungi Tim Custom Kami &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
