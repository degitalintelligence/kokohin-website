import type { Metadata } from 'next'
import CatalogGrid from '@/components/catalog/CatalogGrid'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, Ruler, Zap, Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Katalog Paket Kanopi | Kokohin',
  description: 'Pilihan paket kanopi terbaik dari Kokohin: baja ringan, polycarbonate, kaca, spandek, membrane, dan pergola. Harga transparan, garansi terjamin.',
  keywords: ['katalog kanopi', 'paket kanopi', 'harga kanopi', 'kanopi baja ringan', 'kanopi polycarbonate', 'carport', 'pergola'],
}
const KOKOHIN_WA = process.env.NEXT_PUBLIC_WA_NUMBER ?? '628123456789'

export default async function KatalogPage() {
  const supabase = await createClient()
  const { data: materialsRaw, error } = await supabase
    .from('materials')
    .select('id, name, category, unit, base_price_per_unit, length_per_unit, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const materials = materialsRaw || []

  if (error) {
    console.error('Error fetching materials:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatLengthUnit = (lengthPerUnit: number | null) => {
    if (!lengthPerUnit || lengthPerUnit <= 1) return 'Satuan'
    return `${lengthPerUnit} m`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary-dark to-primary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_white_1px,_transparent_0)] bg-[length:32px_32px] opacity-10"></div>
        <div className="relative container py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Katalog Paket Kanopi
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Dari kanopi standar hingga custom premium, temukan solusi terbaik untuk kebutuhan Anda. 
              Setiap paket dirancang dengan material berkualitas dan pemasangan profesional.
            </p>
            <div className="inline-flex flex-wrap gap-3 justify-center">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" /> Garansi 5 Tahun
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-white" /> Survey Gratis
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-white" /> Proses Cepat
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-white" /> Harga Terjangkau
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Catalog Section */}
      <div className="py-16">
        <CatalogGrid />
      </div>
      
      {/* Material Comparison */}
      <div className="bg-gray-50 py-20">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-dark text-center mb-12">
              Perbandingan Material Kanopi
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="py-4 px-6 text-left">Material</th>
                    <th className="py-4 px-6 text-left">Kategori</th>
                    <th className="py-4 px-6 text-left">Harga/Unit</th>
                    <th className="py-4 px-6 text-left">Satuan</th>
                    <th className="py-4 px-6 text-left">Panjang per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(materials ?? []).map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-4 px-6 font-bold text-primary-dark">{item.name}</td>
                      <td className="py-4 px-6 text-gray-700">{item.category || '-'}</td>
                      <td className="py-4 px-6 font-semibold">{formatCurrency(item.base_price_per_unit || 0)}</td>
                      <td className="py-4 px-6 text-gray-700">{item.unit || '-'}</td>
                      <td className="py-4 px-6 text-gray-700">{formatLengthUnit(item.length_per_unit)}</td>
                    </tr>
                  ))}
                  {(!materials || materials.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-gray-500">Belum ada material tersedia.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 text-center text-gray-600">
              <p>
                *Harga ditampilkan per unit material dan dapat berubah sesuai desain, lokasi, serta kondisi lapangan.
              </p>
            </div>
          </div>
        </div>
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
              Siap Mengubah Ruang Terbuka Anda?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Konsultasikan kebutuhan kanopi Anda dengan tim ahli kami. 
              Dapatkan solusi terbaik dengan harga kompetitif dan kualitas terjamin.
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
