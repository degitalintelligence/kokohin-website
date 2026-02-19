import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.inner}`}>

                {/* Brand */}
                <div className={styles.brand}>
                    <Link href="/" className={styles.logo}>
                        <span>🏗️</span>
                        <span>Kokohin</span>
                    </Link>
                    <p className={styles.tagline}>
                        Solusi kanopi berkualitas untuk hunian dan komersial Anda. Berpengalaman, bergaransi, dan terpercaya.
                    </p>
                    <div className={styles.socials}>
                        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={styles.social}>📱</a>
                        <a href="https://instagram.com/kokohin" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.social}>📸</a>
                        <a href="https://facebook.com/kokohin" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.social}>📘</a>
                    </div>
                </div>

                {/* Links */}
                <div className={styles.linksGroup}>
                    <h4 className={styles.groupTitle}>Navigasi</h4>
                    <ul className={styles.linkList}>
                        {[
                            { href: '/', label: 'Beranda' },
                            { href: '/layanan', label: 'Layanan' },
                            { href: '/galeri', label: 'Galeri' },
                            { href: '/tentang', label: 'Tentang Kami' },
                            { href: '/kontak', label: 'Kontak' },
                        ].map(l => (
                            <li key={l.href}><Link href={l.href} className={styles.link}>{l.label}</Link></li>
                        ))}
                    </ul>
                </div>

                {/* Layanan */}
                <div className={styles.linksGroup}>
                    <h4 className={styles.groupTitle}>Layanan</h4>
                    <ul className={styles.linkList}>
                        {[
                            'Kanopi Baja Ringan',
                            'Kanopi Polycarbonate',
                            'Kanopi Kaca',
                            'Kanopi Spandek',
                            'Kanopi Membrane',
                            'Pergola & Carport',
                        ].map(s => (
                            <li key={s}><Link href="/layanan" className={styles.link}>{s}</Link></li>
                        ))}
                    </ul>
                </div>

                {/* Kontak */}
                <div className={styles.linksGroup}>
                    <h4 className={styles.groupTitle}>Kontak</h4>
                    <ul className={styles.contactList}>
                        <li>
                            <span className={styles.contactIcon}>📍</span>
                            <span>Jl. Contoh No. 123, Kota Anda</span>
                        </li>
                        <li>
                            <span className={styles.contactIcon}>📱</span>
                            <a href="https://wa.me/6281234567890" className={styles.link}>+62 812-3456-7890</a>
                        </li>
                        <li>
                            <span className={styles.contactIcon}>✉️</span>
                            <a href="mailto:info@kokohin.com" className={styles.link}>info@kokohin.com</a>
                        </li>
                        <li>
                            <span className={styles.contactIcon}>⏰</span>
                            <span>Senin – Sabtu, 08.00 – 17.00</span>
                        </li>
                    </ul>
                </div>

            </div>

            <div className={styles.bottom}>
                <div className="container">
                    <p>© {year} Kokohin. Semua hak dilindungi.</p>
                    <p>Dibuat dengan ❤️ untuk kontraktor kanopi terpercaya.</p>
                </div>
            </div>
        </footer>
    )
}
