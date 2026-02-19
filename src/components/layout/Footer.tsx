import Link from 'next/link'
import { HardHat } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#1D1D1B] text-white py-12" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-[#E30613]">
                <HardHat color="white" size={24} />
              </div>
              <span className="font-bold text-2xl tracking-tight">Kokohin</span>
            </div>
            <p className="text-gray-400 text-sm">
              Kontraktor kanopi & pagar profesional dengan pengalaman lebih dari 10 tahun. Material berkualitas, pengerjaan rapi, garansi terpercaya.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Layanan</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="#" className="hover:text-white">Kanopi Baja Ringan</Link></li>
              <li><Link href="#" className="hover:text-white">Kanopi Polycarbonate</Link></li>
              <li><Link href="#" className="hover:text-white">Kanopi Kaca</Link></li>
              <li><Link href="#" className="hover:text-white">Pagar & Railing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Kontak</h4>
            <ul className="space-y-2 text-gray-400">
              <li>📞 0812-3456-7890</li>
              <li>📧 hello@kokohin.com</li>
              <li>📍 Jl. Contoh No. 123, Jakarta</li>
              <li>🕐 Senin - Sabtu: 08:00 - 17:00</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>© {year} Kokohin. Hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  )
}
