import Link from 'next/link'
import Image from 'next/image'
import { HardHat, Phone, Mail, MapPin, Clock, Instagram, Facebook, Youtube } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLogoUrl } from '@/app/actions/settings'

function TikTokBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
    </svg>
  )
}

export default async function Footer() {
  const year = new Date().getFullYear()
  const logoUrl = await getLogoUrl()
  const supabase = await createClient()
  const { data: contactExtraRows } = await supabase.from('site_settings').select('key,value').in('key',['contact_address','contact_hours'])
  const contactExtraMap: Record<string,string> = {}
  ;((contactExtraRows as Array<{ key?: string; value?: string }> | null) ?? []).forEach((row) => { if (row && row.key) contactExtraMap[row.key] = row.value ?? '' })
  const CONTACT_ADDRESS = contactExtraMap['contact_address'] || 'Jl. Contoh No. 123, Jakarta'
  const CONTACT_HOURS = contactExtraMap['contact_hours'] || 'Senin - Sabtu: 08:00 - 17:00'
  const { data: contactRows } = await supabase.from('site_settings').select('key,value').in('key',['support_email','support_phone','instagram_url','facebook_url','tiktok_url','youtube_url','wa_number'])
  const contactMap: Record<string,string> = {}
  ;((contactRows as Array<{ key?: string; value?: string }> | null) ?? []).forEach((row) => { if (row && row.key) contactMap[row.key] = row.value ?? '' })
  const CONTACT_EMAIL = contactMap['support_email'] || 'hello@kokohin.com'
  const CONTACT_PHONE = contactMap['support_phone'] || '0812-3456-7890'
  const WA_NUMBER = contactMap['wa_number'] || ''
  const INSTAGRAM_URL = contactMap['instagram_url'] || ''
  const FACEBOOK_URL = contactMap['facebook_url'] || ''
  const TIKTOK_URL = contactMap['tiktok_url'] || ''
  const YOUTUBE_URL = contactMap['youtube_url'] || ''
  const WA_LINK = (() => {
    if (WA_NUMBER) return `https://wa.me/${WA_NUMBER}`
    const digits = CONTACT_PHONE.replace(/\D+/g, '')
    if (!digits) return ''
    if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`
    if (digits.startsWith('62')) return `https://wa.me/${digits}`
    if (digits.startsWith('8')) return `https://wa.me/62${digits}`
    return `https://wa.me/${digits}`
  })()
  const INSTAGRAM_HANDLE = (() => {
    if (!INSTAGRAM_URL) return ''
    try {
      const u = new URL(INSTAGRAM_URL)
      const segs = (u.pathname || '').split('/').filter(Boolean)
      return segs.length ? `@${segs[0]}` : 'Instagram'
    } catch {
      const seg = INSTAGRAM_URL.replace(/\/+$/, '').split('/').pop() || ''
      return seg ? `@${seg}` : 'Instagram'
    }
  })()
  const { data: services } = await supabase
    .from('services')
    .select('id, name, slug, is_active')
    .or('is_active.is.null,is_active.eq.true')
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
              {(services ?? []).filter?.((s) => {
                const n = (s?.name || '').toLowerCase()
                return !(n.includes('membrane') || n.includes('membran'))
              }).length > 0 ? (
                services
                  ?.filter((s) => {
                    const n = (s?.name || '').toLowerCase()
                    return !(n.includes('membrane') || n.includes('membran'))
                  })
                  .map((service) => (
                  <li key={service.id}>
                    <Link href={`/layanan#${service.slug ?? service.id}`} className="hover:text-white">{service.name}</Link>
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
                <Phone className="w-4 h-4 shrink-0 mt-0.5" />
                {WA_LINK ? (
                  <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white">{CONTACT_PHONE}</a>
                ) : (
                  CONTACT_PHONE
                )}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 mt-0.5" /> {CONTACT_EMAIL}
              </li>
              {INSTAGRAM_URL ? (
                <li className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 shrink-0 mt-0.5" />
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">{INSTAGRAM_HANDLE}</a>
                </li>
              ) : null}
              {FACEBOOK_URL ? (
                <li className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 shrink-0 mt-0.5" />
                  <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a>
                </li>
              ) : null}
              {YOUTUBE_URL ? (
                <li className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 shrink-0 mt-0.5" />
                  <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">YouTube</a>
                </li>
              ) : null}
              {TIKTOK_URL ? (
                <li className="flex items-center gap-2">
                  <TikTokBrandIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">TikTok</a>
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" /> <span className="leading-snug">{CONTACT_ADDRESS}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" /> {CONTACT_HOURS}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>
            © {year} Kokohin. Hak cipta dilindungi.
            <span className="mx-2">•</span>
            <Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link>
            <span className="mx-2">•</span>
            <Link href="/kebijakan-privasi" className="hover:text-white">Kebijakan Privasi</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
