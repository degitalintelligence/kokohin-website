import type { Metadata } from 'next'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { ShieldCheck, Ruler, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Katalog Paket Kanopi | Kokohin',
  description: 'Pilihan paket kanopi terbaik dari Kokohin: baja ringan, polycarbonate, kaca, spandek, dan pergola. Harga transparan, garansi terjamin.',
  keywords: ['katalog kanopi', 'paket kanopi', 'harga kanopi', 'kanopi baja ringan', 'kanopi polycarbonate', 'carport', 'pergola'],
}
export const revalidate = 600

const CatalogGrid = dynamic(() => import('@/components/catalog/CatalogGrid'))

export default async function KatalogPage() {
  const supabase = await createClient()
  const { data: waSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'wa_number')
    .maybeSingle()
  const KOKOHIN_WA = (waSetting as { value?: string } | null)?.value ?? '628000000000'

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary-dark to-primary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_white_1px,_transparent_0)] bg-[length:32px_32px] opacity-10"></div>
        <div className="relative container py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Katalog Paket Kanopi
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Dari kanopi sederhana hingga custom premium, Kokohin adalah solusi profesional untuk kanopi berkualitas yang dirancang sesuai dengan budget dan kebutuhan Anda.
            </p>
            <div className="inline-flex flex-wrap gap-3 justify-center">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" /> Garansi Perawatan 1 tahun
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-white" /> Survei Gratis
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-white" /> Budget Friendly
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Catalog Section */}
      <div className="py-16">
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
        }>
          <CatalogGrid />
        </Suspense>
      </div>
      
      
      
      {/* Process Section */}
      <div className="py-20">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-dark text-center mb-16">
            Proses Pemesanan
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: '01',
                title: 'Konsultasi',
                desc: 'Diskusikan kebutuhan Anda dengan tim ahli kami, online atau via telepon.'
              },
              {
                step: '02',
                title: 'Survey Gratis',
                desc: 'Tim survey kami datang ke lokasi untuk pengukuran dan analisis kondisi.'
              },
              {
                step: '03',
                title: 'Penawaran & Kontrak',
                desc: 'Terima penawaran detail dengan breakdown harga dan timeline pengerjaan.'
              },
              {
                step: '04',
                title: 'Instalasi & Serah Terima',
                desc: 'Pemasangan oleh tim profesional dan serah terima proyek dengan garansi.'
              }
            ].map((process, index) => (
              <div key={index} className="relative">
                <div className="card text-center h-full">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    {process.step}
                  </div>
                  <h3 className="text-xl font-bold text-primary-dark mb-3">{process.title}</h3>
                  <p className="text-gray-600">{process.desc}</p>
                </div>
                
                {index < 3 && (
                  <div className="hidden md:block absolute top-12 left-full w-8 h-0.5 bg-gray-200 -translate-x-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="bg-gradient-to-r from-primary to-primary-dark py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Kokohin: Satu-satunya yang Profesional &amp; Bergaransi!
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Wujudkan bentuk ruang terbukamu yang nyaman, aman, dan menginspirasi bersama tim ahli berpengalaman kami. Harga bersahabat, kualitas terjamin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/kontak"
                className="btn bg-white text-primary-dark hover:bg-white/90 font-bold px-8 py-4 text-lg"
              >
                Konsultasi Gratis
              </a>
              <a
                href={`https://wa.me/${KOKOHIN_WA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-white/20 text-white hover:bg-white/30 font-bold px-8 py-4 text-lg"
              >
                Chat via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
