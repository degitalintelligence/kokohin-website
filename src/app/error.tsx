'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terjadi Kesalahan</h1>
        <p className="text-gray-600 mb-8">
          Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba lagi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCcw size={18} /> Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
