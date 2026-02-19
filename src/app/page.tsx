import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Service, Project, Testimonial } from '@/lib/types'
import styles from './page.module.css'

// ——————————————————————————————
// Static fallback data (shown when Supabase is not yet connected)
// ——————————————————————————————
const FALLBACK_SERVICES: Partial<Service>[] = [
  { id: '1', name: 'Kanopi Baja Ringan', short_desc: 'Material kuat, ringan, dan tahan lama untuk hunian modern.', icon: '🏗️' },
  { id: '2', name: 'Kanopi Polycarbonate', short_desc: 'Anti-UV, tembus cahaya, dan estetis untuk tampilan modern.', icon: '✨' },
  { id: '3', name: 'Kanopi Kaca', short_desc: 'Elegan dan premium untuk area komersial dan rumah mewah.', icon: '🪟' },
  { id: '4', name: 'Kanopi Spandek', short_desc: 'Harga terjangkau dengan ketahanan terhadap panas dan hujan.', icon: '🔩' },
  { id: '5', name: 'Kanopi Membrane', short_desc: 'Desain artistik dan fleksibel untuk area outdoor modern.', icon: '🎪' },
  { id: '6', name: 'Pergola & Carport', short_desc: 'Struktur outdoor elegan untuk taman dan area parkir.', icon: '🏡' },
]

const FALLBACK_TESTIMONIALS: Partial<Testimonial>[] = [
  { id: '1', name: 'Budi Santoso', company: 'Perumahan Griya Asri', content: 'Hasil pemasangan kanopi sangat rapih dan profesional. Tim Kokohin bekerja cepat dan hasilnya memuaskan!', rating: 5 },
  { id: '2', name: 'Siti Rahayu', company: null, content: 'Saya pesan kanopi polycarbonate untuk teras rumah. Kualitasnya bagus dan harganya sesuai budget. Recommended!', rating: 5 },
  { id: '3', name: 'Ahmad Fauzi', company: 'Toko Bangunan Maju Jaya', content: 'Sudah 3 kali pakai jasa Kokohin untuk proyek kanopi. Selalu puas dengan hasilnya. Garansi juga ditepati!', rating: 5 },
]

const STATS = [
  { value: '10+', label: 'Tahun Pengalaman' },
  { value: '500+', label: 'Proyek Selesai' },
  { value: '98%', label: 'Klien Puas' },
  { value: '2 Th', label: 'Garansi Kerja' },
]

const FEATURES = [
  { icon: '🏆', title: 'Berpengalaman', desc: 'Lebih dari 10 tahun mengerjakan proyek kanopi untuk hunian dan komersial.' },
  { icon: '🛡️', title: 'Bergaransi', desc: 'Setiap pekerjaan dijamin dengan garansi konstruksi selama 2 tahun.' },
  { icon: '💎', title: 'Material Premium', desc: 'Kami hanya menggunakan material berkualitas tinggi dari supplier terpercaya.' },
  { icon: '💰', title: 'Harga Terjangkau', desc: 'Harga kompetitif tanpa mengorbankan kualitas. Gratis survei dan estimasi.' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars} aria-label={`Rating ${rating} dari 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </div>
  )
}

export default async function HomePage() {
  let services: Partial<Service>[] = FALLBACK_SERVICES
  let testimonials: Partial<Testimonial>[] = FALLBACK_TESTIMONIALS

  try {
    const supabase = await createClient()
    const [{ data: svcData }, { data: testiData }] = await Promise.all([
      supabase.from('services').select('*').order('order'),
      supabase.from('testimonials').select('*').eq('active', true).order('created_at'),
    ])
    if (svcData && svcData.length > 0) services = svcData
    if (testiData && testiData.length > 0) testimonials = testiData
  } catch {
    // Supabase not yet configured — use static fallback
  }

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgOverlay} />
        </div>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroText}>
            <div className="section-label">⚡ Kontraktor Kanopi Terpercaya</div>
            <h1 className={styles.heroTitle}>
              Kanopi Berkualitas untuk<br />
              <span className={styles.heroAccent}>Hunian Impian</span> Anda
            </h1>
            <p className={styles.heroDesc}>
              Kami menyediakan jasa pemasangan kanopi profesional dengan berbagai pilihan material — baja ringan, polycarbonate, kaca, dan lebih banyak lagi. Gratis survei & estimasi!
            </p>
            <div className={styles.heroCtas}>
              <Link href="/kontak" className="btn btn-primary">
                🎯 Minta Penawaran Gratis
              </Link>
              <Link href="/galeri" className="btn btn-outline">
                📸 Lihat Galeri
              </Link>
            </div>
          </div>
        </div>

        {/* Stats ribbon */}
        <div className={styles.statsRibbon}>
          <div className="container">
            <div className={styles.statsGrid}>
              {STATS.map(s => (
                <div key={s.label} className={styles.statItem}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== KEUNGGULAN ==================== */}
      <section className={`section ${styles.featuresSection}`}>
        <div className="container">
          <div className="section-header section-header--center">
            <div className="section-label">✅ Mengapa Memilih Kami</div>
            <h2 className="section-title">Keunggulan Kokohin</h2>
            <div className="divider divider--center" />
            <p className="section-desc">
              Kami berkomitmen memberikan layanan terbaik dengan kualitas material dan pengerjaan yang tidak mengecewakan.
            </p>
          </div>
          <div className={`grid-4 ${styles.featuresGrid}`}>
            {FEATURES.map(f => (
              <div key={f.title} className={`card ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LAYANAN ==================== */}
      <section className={`section ${styles.servicesSection}`}>
        <div className="container">
          <div className="section-header">
            <div className="section-label">🔧 Apa Yang Kami Kerjakan</div>
            <h2 className="section-title">Layanan Kami</h2>
            <div className="divider" />
            <p className="section-desc">
              Berbagai jenis kanopi tersedia untuk memenuhi kebutuhan hunian dan komersial Anda.
            </p>
          </div>
          <div className={`grid-3 ${styles.servicesGrid}`}>
            {services.map(s => (
              <Link key={s.id} href="/layanan" className={`card ${styles.serviceCard}`}>
                <div className={styles.serviceIcon}>{s.icon}</div>
                <div className={styles.serviceBody}>
                  <h3 className={styles.serviceTitle}>{s.name}</h3>
                  <p className={styles.serviceDesc}>{s.short_desc}</p>
                  <span className={styles.serviceLink}>Selengkapnya →</span>
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.servicesCta}>
            <Link href="/layanan" className="btn btn-outline-dark">
              Lihat Semua Layanan
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section className={styles.ctaBanner}>
        <div className="container">
          <div className={styles.ctaContent}>
            <div>
              <h2 className={styles.ctaTitle}>Siap Pasang Kanopi?</h2>
              <p className={styles.ctaDesc}>Dapatkan survei dan estimasi harga gratis. Tim kami siap membantu Anda.</p>
            </div>
            <div className={styles.ctaBtns}>
              <Link href="/kontak" className="btn btn-primary">
                🎯 Minta Penawaran
              </Link>
              <a href="https://wa.me/6281234567890?text=Halo%20Kokohin%2C%20saya%20ingin%20konsultasi%20kanopi" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                💬 Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONI ==================== */}
      <section className={`section ${styles.testiSection}`}>
        <div className="container">
          <div className="section-header section-header--center">
            <div className="section-label">💬 Kata Mereka</div>
            <h2 className="section-title">Testimoni Pelanggan</h2>
            <div className="divider divider--center" />
          </div>
          <div className={`grid-3 ${styles.testiGrid}`}>
            {testimonials.map(t => (
              <div key={t.id} className={`card ${styles.testiCard}`}>
                <StarRating rating={t.rating ?? 5} />
                <p className={styles.testiContent}>&quot;{t.content}&quot;</p>
                <div className={styles.testiAuthor}>
                  <div className={styles.testiAvatar}>
                    {(t.name ?? 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.testiName}>{t.name}</div>
                    {t.company && <div className={styles.testiCompany}>{t.company}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
