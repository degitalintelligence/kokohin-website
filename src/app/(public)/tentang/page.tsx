import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, BookOpen, Target, Heart, Zap, Leaf, Users } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Tentang Kami',
    description: 'Kenali lebih dekat Kokohin — kontraktor kanopi profesional dengan pengalaman lebih dari 10 tahun.',
}
export const revalidate = 86400

const TIMELINE = [
    { year: '2014', event: 'Kokohin berdiri dengan 3 orang tim kecil di Depok.' },
    { year: '2016', event: 'Ekspansi ke Jakarta dan Tangerang. Proyek ke-100 selesai.' },
    { year: '2018', event: 'Mulai melayani proyek komersial gedung dan pusat perbelanjaan.' },
    { year: '2020', event: 'Bertahan di masa pandemi dengan layanan konsultasi online.' },
    { year: '2022', event: 'Proyek ke-400 selesai. Tim berkembang menjadi 25 orang.' },
    { year: '2024', event: 'Layanan diperluas ke wilayah Jawa Barat dan Jawa Tengah.' },
]

const TEAM = [
    { name: 'Bapak Hendra', role: 'Direktur & Pendiri' },
    { name: 'Ibu Sari', role: 'Manajer Proyek' },
    { name: 'Pak Dian', role: 'Kepala Teknisi' },
    { name: 'Pak Reza', role: 'Konsultan Desain' },
]

const VALUES = [
    { icon: Target, title: 'Presisi', desc: 'Setiap detail pengerjaan dilakukan dengan cermat dan terukur.' },
    { icon: Heart, title: 'Kepercayaan', desc: 'Kami menjaga kepercayaan klien sebagai aset terpenting.' },
    { icon: Zap, title: 'Inovasi', desc: 'Terus berinovasi dalam material dan teknik pemasangan.' },
    { icon: Leaf, title: 'Keberlanjutan', desc: 'Menggunakan material ramah lingkungan dan efisien.' },
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

            {/* Timeline */}
            <section className="section">
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">
                            <BookOpen className="w-5 h-5 inline-block mr-2" />
                            Perjalanan Kami
                        </div>
                        <h2 className="section-title">Milestone Kokohin</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className="relative max-w-3xl mx-auto flex flex-col gap-6">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2 hidden md:block" />
                        
                        {TIMELINE.map((t, i) => (
                            <div key={t.year} className={`grid grid-cols-1 md:grid-cols-[1fr_24px_1fr] items-center gap-4 relative`}>
                                {/* Mobile: Year on top or handled differently? For now using md:grid */}
                                <div className={`${i % 2 === 0 ? 'md:col-start-1 md:text-right' : 'md:col-start-3 md:text-left'} bg-white border border-gray-200 rounded-md p-4 shadow-sm z-10`}>
                                    <div className="font-bold text-lg text-primary mb-1">{t.year}</div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{t.event}</p>
                                </div>
                                <div className="hidden md:block w-3.5 h-3.5 bg-primary rounded-full border-[3px] border-white shadow-[0_0_0_2px_var(--primary)] justify-self-center col-start-2 z-10" />
                                {/* Empty div for the other side */}
                                <div className={`hidden md:block ${i % 2 === 0 ? 'md:col-start-3' : 'md:col-start-1'}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="section bg-white">
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">
                            <Users className="w-5 h-5 inline-block mr-2" />
                            Tim Kami
                        </div>
                        <h2 className="section-title">Orang di Balik Kokohin</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TEAM.map(m => (
                            <div key={m.name} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 flex flex-col items-center gap-3 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-2">
                                    <Users className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{m.name}</h3>
                                <p className="text-sm font-medium text-primary">{m.role}</p>
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
