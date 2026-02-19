import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata: Metadata = {
    title: 'Tentang Kami',
    description: 'Kenali lebih dekat Kokohin — kontraktor kanopi profesional dengan pengalaman lebih dari 10 tahun.',
}

const TIMELINE = [
    { year: '2014', event: 'Kokohin berdiri dengan 3 orang tim kecil di Depok.' },
    { year: '2016', event: 'Ekspansi ke Jakarta dan Tangerang. Proyek ke-100 selesai.' },
    { year: '2018', event: 'Mulai melayani proyek komersial gedung dan pusat perbelanjaan.' },
    { year: '2020', event: 'Bertahan di masa pandemi dengan layanan konsultasi online.' },
    { year: '2022', event: 'Proyek ke-400 selesai. Tim berkembang menjadi 25 orang.' },
    { year: '2024', event: 'Layanan diperluas ke wilayah Jawa Barat dan Jawa Tengah.' },
]

const TEAM = [
    { name: 'Bapak Hendra', role: 'Direktur & Pendiri', emoji: '👨‍💼' },
    { name: 'Ibu Sari', role: 'Manajer Proyek', emoji: '👩‍💼' },
    { name: 'Pak Dian', role: 'Kepala Teknisi', emoji: '👨‍🔧' },
    { name: 'Pak Reza', role: 'Konsultan Desain', emoji: '👨‍🎨' },
]

const VALUES = [
    { icon: '🎯', title: 'Presisi', desc: 'Setiap detail pengerjaan dilakukan dengan cermat dan terukur.' },
    { icon: '🤝', title: 'Kepercayaan', desc: 'Kami menjaga kepercayaan klien sebagai aset terpenting.' },
    { icon: '🔄', title: 'Inovasi', desc: 'Terus berinovasi dalam material dan teknik pemasangan.' },
    { icon: '🌱', title: 'Keberlanjutan', desc: 'Menggunakan material ramah lingkungan dan efisien.' },
]

export default function TentangPage() {
    return (
        <>
            {/* Page Header */}
            <section className={styles.pageHeader}>
                <div className="container">
                    <div className="section-label">🏢 Siapa Kami</div>
                    <h1 className={styles.pageTitle}>Tentang Kokohin</h1>
                    <p className={styles.pageDesc}>
                        Kontraktor kanopi profesional dengan pengalaman lebih dari 10 tahun melayani hunian dan komersial di seluruh Jabodetabek.
                    </p>
                </div>
            </section>

            {/* About intro */}
            <section className="section">
                <div className="container">
                    <div className={styles.aboutIntro}>
                        <div className={styles.introVisual}>
                            <div className={styles.introBig}>🏗️</div>
                            <div className={styles.introStats}>
                                {[
                                    { v: '10+', l: 'Tahun Berdiri' },
                                    { v: '500+', l: 'Proyek Selesai' },
                                    { v: '25+', l: 'Tim Profesional' },
                                ].map(s => (
                                    <div key={s.l} className={styles.introStat}>
                                        <span className={styles.introStatVal}>{s.v}</span>
                                        <span className={styles.introStatLbl}>{s.l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="section-label">📖 Cerita Kami</div>
                            <h2 className="section-title">Berpengalaman Sejak 2014</h2>
                            <div className="divider" />
                            <p className="section-desc" style={{ marginBottom: 'var(--sp-4)' }}>
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
            <section className={`section ${styles.valuesSection}`}>
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">💡 Nilai Kami</div>
                        <h2 className="section-title">Yang Kami Pegang Teguh</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className="grid-4">
                        {VALUES.map(v => (
                            <div key={v.title} className={`card ${styles.valueCard}`}>
                                <div className={styles.valueIcon}>{v.icon}</div>
                                <h3 className={styles.valueTitle}>{v.title}</h3>
                                <p className={styles.valueDesc}>{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="section">
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">📅 Perjalanan Kami</div>
                        <h2 className="section-title">Milestone Kokohin</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className={styles.timeline}>
                        {TIMELINE.map((t, i) => (
                            <div key={t.year} className={`${styles.timelineItem} ${i % 2 === 1 ? styles.right : ''}`}>
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineYear}>{t.year}</div>
                                    <p className={styles.timelineEvent}>{t.event}</p>
                                </div>
                                <div className={styles.timelineDot} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className={`section ${styles.teamSection}`}>
                <div className="container">
                    <div className="section-header section-header--center">
                        <div className="section-label">👥 Tim Kami</div>
                        <h2 className="section-title">Orang di Balik Kokohin</h2>
                        <div className="divider divider--center" />
                    </div>
                    <div className={`grid-4 ${styles.teamGrid}`}>
                        {TEAM.map(m => (
                            <div key={m.name} className={`card ${styles.teamCard}`}>
                                <div className={styles.teamAvatar}>{m.emoji}</div>
                                <h3 className={styles.teamName}>{m.name}</h3>
                                <p className={styles.teamRole}>{m.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className={styles.ctaBanner}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 className={styles.ctaTitle}>Bergabunglah Bersama 500+ Klien Puas Kami</h2>
                    <p className={styles.ctaDesc}>Konsultasikan kebutuhan kanopi Anda dengan tim profesional kami.</p>
                    <Link href="/kontak" className="btn btn-primary">Hubungi Kami Sekarang</Link>
                </div>
            </section>
        </>
    )
}
