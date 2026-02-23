import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import * as LucideIcons from 'lucide-react'
import type { ComponentType } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'
import { CheckCircle, ShieldCheck, Clock, Users, Wrench, Hammer, Warehouse, CloudSun, Blinds } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Layanan Kanopi',
    description: 'Berbagai jenis layanan pemasangan kanopi profesional: baja ringan, polycarbonate, kaca, spandek, pergola, dan carport.',
}
export const dynamic = 'force-dynamic'

const BENEFITS = [
    { text: 'Garansi konstruksi 1 tahun', icon: ShieldCheck },
    { text: 'Material berkualitas & berstandar SNI', icon: CheckCircle },
    { text: 'Pengerjaan rapih & tepat waktu', icon: Clock },
    { text: 'Survei & estimasi GRATIS', icon: Wrench },
    { text: 'Tim berpengalaman & profesional', icon: Users },
    { text: 'Harga transparan tanpa biaya tersembunyi', icon: CheckCircle },
]
async function getWaNumber() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'wa_number').maybeSingle()
    return (data as { value?: string } | null)?.value ?? '628000000000'
  } catch {
    return '628000000000'
  }
}

// Helper to map service names to Lucide icons
const getServiceIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('baja ringan')) return Hammer
    if (lower.includes('polycarbonate') || lower.includes('polikarbonat')) return CloudSun
    if (lower.includes('kaca') || lower.includes('tempered')) return Warehouse
    if (lower.includes('membrane') || lower.includes('membran')) return Blinds
    if (lower.includes('pergola')) return Warehouse
    if (lower.includes('spandek') || lower.includes('alderon')) return ShieldCheck
    return Wrench // Default fallback
}

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>
type IconMap = Record<string, IconComponent>

const getIconByLucideName = (iconName?: string) => {
    if (!iconName) return null
    const pascal = iconName
        .trim()
        .split(/[\s-_]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
    const Comp = (LucideIcons as unknown as IconMap)[pascal]
    return typeof Comp === 'function' ? (Comp as IconComponent) : null
}

async function ServicesSection() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('services')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('order', { ascending: true })
    const services: Service[] = (data ?? []) as Service[]
    const visible = services.filter((s) => {
        const n = (s.name || '').toLowerCase()
        return !(n.includes('membrane') || n.includes('membran'))
    })

  const toPlainText = (html?: string | null) => {
    if (!html) return ''
    let t = String(html)
    t = t.replace(/<\s*br\s*\/?>/gi, '\n')
    t = t.replace(/<\/\s*p\s*>/gi, '\n')
    t = t.replace(/<[^>]+>/g, '')
    t = t.replace(/&nbsp;/gi, ' ')
    t = t.replace(/&amp;/gi, '&')
    t = t.replace(/&lt;/gi, '<')
    t = t.replace(/&gt;/gi, '>')
    t = t.replace(/&quot;/gi, '"')
    t = t.replace(/&#39;/gi, "'")
    t = t.replace(/\n{2,}/g, '\n')
    return t.trim()
  }

    return (
        <div className="flex flex-col gap-16">
            {visible.length > 0 ? (
                visible.map((s, idx) => {
                    const Icon = getIconByLucideName(s.icon) || getServiceIcon(s.name || '')
          const plain = toPlainText(s.description)
          const lines = plain.split(/\n+/).filter(Boolean)
                    return (
                    <div key={s.id} id={String(s.slug || s.id)} className={`grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-12 items-center scroll-mt-28 ${idx % 2 === 1 ? 'lg:grid-cols-[1.8fr_1fr]' : ''}`}>
                        <div className={`relative aspect-video lg:aspect-square max-w-full lg:max-w-xs rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-xl overflow-hidden ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                            {s.image_url ? (
                                <>
                                    <Image
                                        src={s.image_url}
                                        alt={s.name || 'Layanan'}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 320px"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
                                    <div className="absolute -bottom-3 -right-3 text-9xl font-extrabold text-white/20 leading-none select-none">0{idx + 1}</div>
                                </>
                            ) : (
                                <>
                                    <div className="text-9xl relative z-10 text-white opacity-90">
                                        <Icon size={120} strokeWidth={1} />
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 text-9xl font-extrabold text-white/10 leading-none select-none">0{idx + 1}</div>
                                </>
                            )}
                        </div>
                        <div className="flex flex-col gap-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold w-fit">
                                <Icon size={16} />
                                {s.name}
                            </div>
                            <h2 className="text-3xl font-bold text-primary leading-tight">{s.name}</h2>
              <div className="space-y-2">
                {lines.length > 0 ? lines.map((ln, i) => (
                  <p key={i} className="text-base text-gray-600 leading-relaxed">{ln}</p>
                )) : (
                  <p className="text-base text-gray-600 leading-relaxed">{plain}</p>
                )}
              </div>
                            <Link href="/kontak" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-full hover:bg-primary/90 shadow-lg w-fit transition-all">
                                Minta Penawaran →
                            </Link>
                        </div>
                    </div>
                    )
                })
            ) : (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 text-center">
                    <h2 className="text-2xl font-bold text-primary-dark mb-3">Belum ada layanan tersedia</h2>
                    <p className="text-gray-600 mb-6">Tim kami siap membantu kebutuhan Anda secara custom.</p>
                    <Link href="/kontak" className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-primary rounded-full hover:bg-primary/90 shadow-lg transition-all">Konsultasi Gratis</Link>
                </div>
            )}
        </div>
    )
}

function ServicesSkeleton() {
    return (
        <div className="flex flex-col gap-16">
            {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={`grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-12 items-center ${idx % 2 === 1 ? 'lg:grid-cols-[1.8fr_1fr]' : ''}`}>
                    <div className={`relative aspect-video lg:aspect-square max-w-full lg:max-w-xs rounded-2xl bg-gray-200 animate-pulse ${idx % 2 === 1 ? 'lg:order-2' : ''}`} />
                    <div className="flex flex-col gap-5">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                            <div className="h-3 w-5/6 bg-gray-200 rounded animate-pulse" />
                            <div className="h-3 w-4/6 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="h-9 w-44 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default async function LayananPage() {
    const KOKOHIN_WA = await getWaNumber()

    return (
        <>
            <section className="pt-32 pb-12 bg-gradient-to-br from-primary-dark to-primary text-white">
                <div className="container">
                    <div className="section-label text-white/90">
                        <Wrench className="w-5 h-5 inline-block mr-2" />
                        Apa Yang Kami Kerjakan
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white my-3">Layanan Kanopi Kami</h1>
                    <p className="text-white/75 text-lg max-w-xl">
                        Dari konsultasi hingga pemasangan, kami siap menghadirkan kanopi berkualitas sesuai kebutuhan dan budget Anda.
                    </p>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <Suspense fallback={<ServicesSkeleton />}>
                        <ServicesSection />
                    </Suspense>
                </div>
            </section>

            <section className="section bg-gray-50">
                <div className="container">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="section-label">
                                <ShieldCheck className="w-5 h-5 inline-block mr-2" />
                                Keunggulan Kami
                            </div>
                            <h2 className="section-title">Kenapa Pilih Kokohin?</h2>
                            <div className="divider" />
                            <p className="section-desc">Kami memberikan layanan terbaik dari awal konsultasi hingga purna jual.</p>
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-4 content-start">
                            {BENEFITS.map((b, i) => (
                                <li key={i} className="flex items-center gap-3 p-4 bg-white rounded-md border border-gray-200 shadow-sm text-gray-800 font-medium">
                                    <b.icon className="w-5 h-5 text-primary flex-shrink-0" />
                                    <span>{b.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
            
            {/* CTA */}
            <section className="py-16 bg-gradient-to-br from-primary to-primary-light text-center text-white">
                <div className="container">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Ingin Konsultasi Gratis?</h2>
                    <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                        Hubungi kami sekarang untuk mendapatkan estimasi harga dan survei lokasi tanpa biaya.
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href={`https://wa.me/${KOKOHIN_WA}`} target="_blank" className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-full bg-white text-primary hover:bg-gray-100 transition-all shadow-lg">
                            Chat WhatsApp
                        </Link>
                        <Link href="/kontak" className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-full border-2 border-white text-white hover:bg-white hover:text-primary transition-all">
                            Isi Formulir
                        </Link>
                    </div>
                </div>
            </section>
        </>
    )
}
