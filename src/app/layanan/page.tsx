import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Service } from '@/lib/types'
import styles from './page.module.css'

export const metadata: Metadata = {
    title: 'Layanan Kanopi',
    description: 'Berbagai jenis layanan pemasangan kanopi profesional: baja ringan, polycarbonate, kaca, spandek, membrane, pergola, dan carport.',
}

const FALLBACK_SERVICES: Partial<Service>[] = [
    { id: '1', name: 'Kanopi Baja Ringan', slug: 'baja-ringan', icon: '🏗️', short_desc: 'Material kuat, ringan, dan tahan lama untuk hunian modern.', description: 'Kanopi berbahan rangka baja ringan (galvalum) dengan penutup berbagai pilihan material. Cocok untuk carport, teras, dan area parkir. Pemasangan cepat, tahan karat, dan harga terjangkau.' },
    { id: '2', name: 'Kanopi Polycarbonate', slug: 'polycarbonate', icon: '✨', short_desc: 'Anti-UV, tembus cahaya, dan estetis untuk tampilan modern.', description: 'Menggunakan lembaran polycarbonate berkualitas tinggi yang dapat meneruskan cahaya alami sekaligus memblokir sinar UV berbahaya. Cocok untuk garasi, teras, dan atap koridor.' },
    { id: '3', name: 'Kanopi Kaca', slug: 'kaca', icon: '🪟', short_desc: 'Elegan dan premium untuk area komersial dan rumah mewah.', description: 'Kanopi kaca tempered yang memberikan kesan mewah dan modern. Tersedia dalam berbagai ketebalan. Cocok untuk pintu masuk showroom, hotel, atau rumah premium.' },
    { id: '4', name: 'Kanopi Spandek', slug: 'spandek', icon: '🔩', short_desc: 'Harga terjangkau dengan ketahanan terhadap panas dan hujan.', description: 'Menggunakan atap spandek warna yang ringan, mudah dipasang, dan cocok untuk berbagai kebutuhan rumah tangga. Tersedia berbagai pilihan warna.' },
    { id: '5', name: 'Kanopi Membrane', slug: 'membrane', icon: '🎪', short_desc: 'Desain artistik dan fleksibel untuk area outdoor modern.', description: 'Membrane kanopi dengan desain tensile yang unik. Cocok untuk area komersial, café outdoor, taman bermain, dan ruang publik.' },
    { id: '6', name: 'Pergola & Carport', slug: 'pergola', icon: '🏡', short_desc: 'Struktur outdoor elegan untuk taman dan area parkir.', description: 'Desain pergola dan carport kustom berbahan besi tempa, kayu, atau aluminium untuk menambah nilai estetika properti Anda.' },
]

const BENEFITS = [
    '✅ Garansi konstruksi 2 tahun',
    '✅ Material berkualitas & berstandar SNI',
    '✅ Pengerjaan rapih & tepat waktu',
    '✅ Survei & estimasi GRATIS',
    '✅ Tim berpengalaman & profesional',
    '✅ Harga transparan tanpa biaya tersembunyi',
]

export default async function LayananPage() {
    let services: Partial<Service>[] = FALLBACK_SERVICES
    try {
        const supabase = await createClient()
        const { data } = await supabase.from('services').select('*').order('order')
        if (data && data.length > 0) services = data
    } catch { /* fallback */ }

    return (
        <>
            {/* Page Header */}
            <section className={styles.pageHeader}>
                <div className="container">
                    <div className="section-label">🔧 Apa Yang Kami Kerjakan</div>
                    <h1 className={styles.pageTitle}>Layanan Kanopi Kami</h1>
                    <p className={styles.pageDesc}>
                        Dari konsultasi hingga pemasangan, kami siap menghadirkan kanopi berkualitas sesuai kebutuhan dan budget Anda.
                    </p>
                </div>
            </section>

            {/* Services Detail */}
            <section className="section">
                <div className="container">
                    <div className={styles.serviceList}>
                        {services.map((s, idx) => (
                            <div key={s.id} className={`${styles.serviceItem} ${idx % 2 === 1 ? styles.reverse : ''}`}>
                                <div className={styles.serviceVisual}>
                                    <div className={styles.serviceIconBig}>{s.icon}</div>
                                    <div className={styles.serviceNumber}>0{idx + 1}</div>
                                </div>
                                <div className={styles.serviceDetail}>
                                    <div className="badge">{s.icon} {s.name}</div>
                                    <h2 className={styles.serviceTitle}>{s.name}</h2>
                                    <p className={styles.serviceDesc}>{s.description}</p>
                                    <Link href="/kontak" className="btn btn-primary btn-sm">
                                        Minta Penawaran →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits section */}
            <section className={`section ${styles.benefitsSection}`}>
                <div className="container">
                    <div className={styles.benefitsInner}>
                        <div>
                            <div className="section-label">🏆 Keunggulan Kami</div>
                            <h2 className="section-title">Kenapa Pilih Kokohin?</h2>
                            <div className="divider" />
                            <p className="section-desc">Kami memberikan layanan terbaik dari awal konsultasi hingga purna jual.</p>
                        </div>
                        <ul className={styles.benefitList}>
                            {BENEFITS.map(b => (
                                <li key={b} className={styles.benefitItem}>{b}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className={styles.ctaBanner}>
                <div className="container">
                    <h2 className={styles.ctaTitle}>Tidak Yakin Mana yang Cocok?</h2>
                    <p className={styles.ctaDesc}>Tim kami siap konsultasi gratis untuk membantu Anda memilih jenis kanopi yang tepat.</p>
                    <div className={styles.ctaBtns}>
                        <Link href="/kontak" className="btn btn-primary">Konsultasi Gratis</Link>
                        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                            Chat WhatsApp
                        </a>
                    </div>
                </div>
            </section>
        </>
    )
}
