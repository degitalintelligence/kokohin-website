import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Calculator, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import CanopyCalculator from '@/components/calculator/Calculator'

export const metadata: Metadata = {
  title: 'Kalkulator Harga Kanopi | Kokohin',
  description: 'Hitung estimasi biaya kanopi Anda secara instan dengan kalkulator cerdas kami. Pertimbangkan waste material, zona lokasi, dan margin bisnis.',
  keywords: ['kalkulator kanopi', 'hitung harga kanopi', 'estimasi biaya kanopi', 'kalkulator baja ringan'],
}

export default function KalkulatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-primary-dark">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 to-primary/70"></div>
        <div className="relative container py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Kalkulator Harga Kanopi
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Hitung estimasi biaya kanopi Anda dengan akurat. Kalkulator kami mempertimbangkan waste material, 
              zona lokasi, dan margin bisnis untuk memberikan harga yang transparan.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Waste Calculation</span>
              </div>
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Zona Markup</span>
              </div>
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Escape Hatch</span>
              </div>
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2">
                <Calculator className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Harga Transparan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calculator Section */}
      <div className="section">
        <Suspense fallback={<div className="text-center py-12">Loading calculator...</div>}>
          <CanopyCalculator hideTitle={true} />
        </Suspense>
      </div>
      
      {/* Info Section */}
      <div className="bg-gray-50 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-primary-dark text-center mb-12">
              Mengapa Kalkulator Kami Akurat?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calculator className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-primary-dark mb-3">Waste Calculation</h3>
                <p className="text-gray-600">
                  Menggunakan Ceiling Math (pembulatan ke atas) untuk material batangan/lembaran. 
                  Sisa potongan dibebankan ke customer sesuai standar industri.
                </p>
              </div>
              
              <div className="card text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-primary-dark mb-3">Dynamic Pricing</h3>
                <p className="text-gray-600">
                  Harga disesuaikan dengan zona lokasi (Jabodetabek) dengan markup persentase dan flat fee.
                  Transparan, tidak ada biaya tersembunyi.
                </p>
              </div>
              
              <div className="card text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-primary-dark mb-3">Escape Hatch</h3>
                <p className="text-gray-600">
                  Untuk permintaan custom, sistem otomatis bypass auto-kalkulasi dan menandai 
                  &apos;Need Manual Quote&apos; untuk penanganan khusus oleh tim sales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="section-sm">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-6">
              Butuh Penawaran yang Lebih Akurat?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Survey lapangan gratis oleh tim ahli kami memberikan estimasi harga yang paling akurat 
              dengan pertimbangan kondisi lokasi dan kebutuhan spesifik.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/kontak"
                className="btn btn-primary px-8 py-4 text-lg"
              >
                Jadwalkan Survey Gratis
              </a>
              <a
                href="/katalog"
                className="btn btn-outline px-8 py-4 text-lg"
              >
                Lihat Katalog Paket
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}