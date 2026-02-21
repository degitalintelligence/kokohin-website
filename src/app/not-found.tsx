import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 py-20 font-sans">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <FileQuestion className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-primary-dark mb-4">Halaman Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-8 text-lg">
            Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-8 rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            <ArrowLeft size={20} /> Kembali ke Beranda
          </Link>
        </div>
      </div>
      <Footer />
    </>
  )
}
