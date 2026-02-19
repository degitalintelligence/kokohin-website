'use client'

import { useState } from 'react'
import styles from './page.module.css'

// Placeholder gallery data (until Supabase connected)
const PLACEHOLDER_PROJECTS = Array.from({ length: 12 }).map((_, i) => ({
    id: String(i + 1),
    title: [
        'Kanopi Baja Ringan Modern', 'Carport Polycarbonate Minimalis', 'Kanopi Kaca Showroom',
        'Teras Spandek Rumah Tinggal', 'Membrane Kanopi Café Outdoor', 'Pergola Taman Elegan',
        'Kanopi Garasi Double', 'Atap Polycarbonate Koridor', 'Kanopi Baja dengan La Tello',
        'Carport Besi Tempa Custom', 'Kanopi Kaca Frameless', 'Pergola Kayu Premium',
    ][i],
    service: ['Baja Ringan', 'Polycarbonate', 'Kaca', 'Spandek', 'Membrane', 'Pergola'][i % 6],
    location: ['Jakarta Selatan', 'Depok', 'Bogor', 'Tangerang', 'Bekasi', 'Bandung'][i % 6],
    year: 2023 + (i % 2),
    featured: i < 3,
}))

const CATEGORIES = ['Semua', 'Baja Ringan', 'Polycarbonate', 'Kaca', 'Spandek', 'Membrane', 'Pergola']

const BG_COLORS = [
    'linear-gradient(135deg,#1a2e4a,#243e63)',
    'linear-gradient(135deg,#f97316,#ea6c0a)',
    'linear-gradient(135deg,#0f766e,#0d9488)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#b45309,#d97706)',
    'linear-gradient(135deg,#1e40af,#2563eb)',
]

export default function GaleriPage() {
    const [activeFilter, setActiveFilter] = useState('Semua')

    const filtered = activeFilter === 'Semua'
        ? PLACEHOLDER_PROJECTS
        : PLACEHOLDER_PROJECTS.filter(p => p.service === activeFilter)

    return (
        <>
            {/* Page Header */}
            <section className={styles.pageHeader}>
                <div className="container">
                    <div className="section-label">📸 Portfolio Kami</div>
                    <h1 className={styles.pageTitle}>Galeri Proyek</h1>
                    <p className={styles.pageDesc}>
                        Lihat ratusan proyek yang telah kami selesaikan dengan standar kualitas tinggi.
                    </p>
                </div>
            </section>

            {/* Gallery */}
            <section className="section">
                <div className="container">
                    {/* Filter tabs */}
                    <div className={styles.filterBar}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                className={`${styles.filterBtn} ${activeFilter === cat ? styles.active : ''}`}
                                onClick={() => setActiveFilter(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className={styles.gallery}>
                        {filtered.map((p, i) => (
                            <div key={p.id} className={styles.galleryItem}>
                                <div
                                    className={styles.galleryThumb}
                                    style={{ background: BG_COLORS[i % BG_COLORS.length] }}
                                >
                                    <div className={styles.thumbEmoji}>
                                        {['🏗️', '✨', '🪟', '🔩', '🎪', '🏡'][i % 6]}
                                    </div>
                                    <div className={styles.thumbOverlay}>
                                        <span className={styles.thumbService}>{p.service}</span>
                                        <h3 className={styles.thumbTitle}>{p.title}</h3>
                                        <p className={styles.thumbMeta}>📍 {p.location} · {p.year}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className={styles.empty}>
                            <p>Belum ada proyek untuk kategori ini.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA */}
            <section className={styles.ctaBanner}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 className={styles.ctaTitle}>Ingin Proyek Anda Ada di Sini?</h2>
                    <p className={styles.ctaDesc}>Hubungi kami dan kami siap mewujudkan kanopi impian Anda.</p>
                    <a href="/kontak" className="btn btn-primary">Mulai Proyek Sekarang</a>
                </div>
            </section>
        </>
    )
}
