import Link from 'next/link'
import Image from 'next/image'
import { HardHat, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLogoUrl } from '@/app/actions/settings'

export default async function Footer() {
  const year = new Date().getFullYear()
  const logoUrl = await getLogoUrl()
  const CONTACT_ADDRESS = process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? 'Jl. Contoh No. 123, Jakarta'
  const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@kokohin.com'
  const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '0812-3456-7890'
  const CONTACT_HOURS = process.env.NEXT_PUBLIC_CONTACT_HOURS ?? 'Senin - Sabtu: 08:00 - 17:00'
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .order('order', { ascending: true })

  return (
    <footer className="bg-primary-dark text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <div className="relative h-10 w-40">
                  <Image 
                    src={logoUrl} 
                    alt="Kokohin Logo" 
                    fill 
                    className="object-contain object-left brightness-0 invert" 
                  />
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-primary">
                    <HardHat color="white" size={24} />
                  </div>
                  <span className="font-bold text-2xl tracking-tight">Kokohin</span>
                </>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Kontraktor kanopi & pagar profesional dengan pengalaman lebih dari 10 tahun. Material berkualitas, pengerjaan rapi, garansi terpercaya.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Layanan</h4>
            <ul className="space-y-2 text-gray-400">
              {(services ?? []).length > 0 ? (
                services?.slice(0, 4).map((service) => (
                  <li key={service.id}>
                    <Link href="/layanan" className="hover:text-white">{service.name}</Link>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Layanan belum tersedia</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Kontak</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> {CONTACT_PHONE}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> {CONTACT_EMAIL}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {CONTACT_ADDRESS}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> {CONTACT_HOURS}
              </li>
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
