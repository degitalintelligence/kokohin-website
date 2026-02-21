import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'
import { CheckCircle, ShieldCheck, Clock, Users, Wrench, Hammer, Warehouse, CloudSun, Blinds } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Layanan Kanopi',
    description: 'Berbagai jenis layanan pemasangan kanopi profesional: baja ringan, polycarbonate, kaca, spandek, membrane, pergola, dan carport.',
}

const BENEFITS = [
    { text: 'Garansi konstruksi 2 tahun', icon: ShieldCheck },
    { text: 'Material berkualitas & berstandar SNI', icon: CheckCircle },
    { text: 'Pengerjaan rapih & tepat waktu', icon: Clock },
    { text: 'Survei & estimasi GRATIS', icon: Wrench },
    { text: 'Tim berpengalaman & profesional', icon: Users },
    { text: 'Harga transparan tanpa biaya tersembunyi', icon: CheckCircle },
]
const KOKOHIN_WA = process.env.NEXT_PUBLIC_WA_NUMBER ?? '628123456789'

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

export default async function LayananPage() {
    let services: Partial<Service>[] = []
    try {
        const supabase = await createClient()
        const { data } = await supabase.from('services').select('*').order('order')
        if (data && data.length > 0) services = data
    } catch {
        services = []
    }

    return (
        <>
            {/* Page Header */}
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

            {/* Services Detail */}
            <section className="section">
                <div className="container">
                    <div className="flex flex-col gap-16">
                        {services.length > 0 ? (
                            services.map((s, idx) => {
                                const Icon = getServiceIcon(s.name || '')
                                return (
                                <div key={s.id} className={`grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-12 items-center ${idx % 2 === 1 ? 'lg:grid-cols-[1.8fr_1fr]' : ''}`}>
                                    <div className={`relative aspect-video lg:aspect-square max-w-full lg:max-w-xs rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-xl overflow-hidden ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                                        <div className="text-9xl relative z-10 text-white opacity-90">
                                            <Icon size={120} strokeWidth={1} />
                                        </div>
                                        <div className="absolute -bottom-3 -right-3 text-9xl font-extrabold text-white/10 leading-none select-none">0{idx + 1}</div>
                                    </div>
                                    <div className="flex flex-col gap-5">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold w-fit">
                                            <Icon size={16} />
                                            {s.name}
                                        </div>
                                        <h2 className="text-3xl font-bold text-primary leading-tight">{s.name}</h2>
                                        <p className="text-base text-gray-600 leading-relaxed">{s.description}</p>
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
                </div>
            </section>

            {/* Benefits section */}
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
