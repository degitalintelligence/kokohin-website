import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, BookOpen, Target, Heart, Zap } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Tentang Kami',
    description: 'Kenali lebih dekat Kokohin — kontraktor kanopi profesional dengan pengalaman lebih dari 10 tahun.',
}
export const revalidate = 86400

const VALUES = [
    { icon: Target, title: 'Presisi', desc: 'Setiap detail pengerjaan dilakukan dengan cermat dan terukur.' },
    { icon: Heart, title: 'Kepercayaan', desc: 'Kami menjaga kepercayaan klien sebagai aset terpenting.' },
    { icon: Zap, title: 'Inovasi', desc: 'Terus berinovasi dalam material dan teknik pemasangan.' },
]

export default function TentangPage() {
    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-12 bg-gradient-to-br from-primary-dark to-primary text-white">
                <div className="container">
                    <div className="section-label text-white/90">
                        <Building2 className="w-5 h-5 inline-block mr-2" />
                        Siapa Kami
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white my-3">Tentang Kokohin</h1>
                    <p className="text-white/75 text-lg max-w-xl">
                        Kontraktor kanopi profesional dengan pengalaman lebih dari 10 tahun melayani hunian dan komersial di seluruh Jabodetabek.
                    </p>
                </div>
            </section>

            {/* About intro */}
            <section className="section">
                <div className="container">
                    <div className="grid md:grid-cols-[1fr_1.5fr] gap-16 items-center">
                        <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-10 flex flex-col items-center gap-8 shadow-xl text-white">
                            <div className="text-9xl">
                                <Building2 size={80} strokeWidth={1} />
                            </div>
                            <div className="flex gap-6 w-full justify-center">
                                {[
                                    { v: '10+', l: 'Tahun Berdiri' },
                                    { v: '500+', l: 'Proyek Selesai' },
                                    { v: '25+', l: 'Tim Profesional' },
                                ].map(s => (
                                    <div key={s.l} className="flex flex-col items-center gap-0.5">
                                        <span className="text-2xl font-extrabold text-white">{s.v}</span>
                                        <span className="text-xs text-white/70 text-center">{s.l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="section-label">
                                <BookOpen className="w-5 h-5 inline-block mr-2" />
                                Cerita Kami
                            </div>
                            <h2 className="section-title">Berpengalaman Sejak 2014</h2>
                            <div className="divider" />
                            <p className="section-desc mb-4">
                                Kokohin didirikan dengan visi sederhana: menghadirkan kanopi berkualitas tinggi dengan harga yang terjangkau untuk setiap rumah Indonesia.
                            </p>
                            <p className="section-desc">
                                Berawal dari tim kecil di Depok, kini kami telah tumbuh menjadi kontraktor kanopi terpercaya yang telah menyelesaikan lebih dari 500 proyek di seluruh Jabodetabek dan sekitarnya. Setiap proyek dikerjakan dengan dedikasi penuh dan standar kualitas tertinggi.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section bg-gray-50">
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">
                            <Target className="w-5 h-5 inline-block mr-2" />
                            Nilai Kami
                        </div>
                        <h2 className="section-title">Yang Kami Pegang Teguh</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {VALUES.map((v, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 flex flex-col items-center gap-3 text-center">
                                <div className="text-4xl w-16 h-16 flex items-center justify-center bg-primary/10 rounded-lg text-primary">
                                    <v.icon className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-base font-bold text-primary">{v.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            

            {/* CTA */}
            <section className="py-16 bg-primary text-white text-center">
                <div className="container">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Bergabunglah Bersama 500+ Klien Puas Kami</h2>
                    <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Konsultasikan kebutuhan kanopi Anda dengan tim profesional kami.</p>
                    <Link href="/kontak" className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-full bg-white text-primary hover:bg-gray-100 transition-all shadow-lg">
                        Hubungi Kami Sekarang
                    </Link>
                </div>
            </section>
        </>
    )
}
