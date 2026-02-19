import type { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'
import styles from './page.module.css'

export const metadata: Metadata = {
    title: 'Kontak & Penawaran',
    description: 'Hubungi Kokohin untuk konsultasi dan penawaran harga kanopi. Gratis survei dan estimasi!',
}

const CONTACT_INFO = [
    { icon: '📍', label: 'Alamat', value: 'Jl. Contoh No. 123, Depok, Jawa Barat' },
    { icon: '📱', label: 'WhatsApp', value: '+62 812-3456-7890', href: 'https://wa.me/6281234567890' },
    { icon: '✉️', label: 'Email', value: 'info@kokohin.com', href: 'mailto:info@kokohin.com' },
    { icon: '⏰', label: 'Jam Kerja', value: 'Senin – Sabtu, 08.00 – 17.00 WIB' },
]

export default function KontakPage() {
    return (
        <>
            {/* Page Header */}
            <section className={styles.pageHeader}>
                <div className="container">
                    <div className="section-label">📞 Hubungi Kami</div>
                    <h1 className={styles.pageTitle}>Kontak & Penawaran</h1>
                    <p className={styles.pageDesc}>
                        Isi form di bawah untuk mendapatkan penawaran harga. Gratis survei dan estimasi!
                    </p>
                </div>
            </section>

            {/* Main content */}
            <section className="section">
                <div className="container">
                    <div className={styles.layout}>

                        {/* Left: Contact info */}
                        <div className={styles.infoPanel}>
                            <div className={styles.infoPanelInner}>
                                <h2 className={styles.infoTitle}>Informasi Kontak</h2>
                                <p className={styles.infoDesc}>
                                    Kami melayani konsultasi gratis sebelum pemasangan. Tim kami siap membantu Anda memilih material yang tepat sesuai kebutuhan dan budget.
                                </p>

                                <ul className={styles.contactList}>
                                    {CONTACT_INFO.map(c => (
                                        <li key={c.label} className={styles.contactItem}>
                                            <span className={styles.contactIcon}>{c.icon}</span>
                                            <div>
                                                <div className={styles.contactLabel}>{c.label}</div>
                                                {c.href ? (
                                                    <a href={c.href} className={styles.contactValue} target="_blank" rel="noopener noreferrer">
                                                        {c.value}
                                                    </a>
                                                ) : (
                                                    <span className={styles.contactValue}>{c.value}</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                {/* WhatsApp shortcut */}
                                <a
                                    href="https://wa.me/6281234567890?text=Halo%20Kokohin%2C%20saya%20ingin%20konsultasi%20kanopi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`btn btn-primary ${styles.waBtn}`}
                                >
                                    💬 Chat WhatsApp Sekarang
                                </a>

                                {/* Decorative background */}
                                <div className={styles.infoBgDecor} aria-hidden="true">🏗️</div>
                            </div>
                        </div>

                        {/* Right: Form */}
                        <div className={styles.formPanel}>
                            <h2 className={styles.formTitle}>Minta Penawaran Gratis</h2>
                            <p className={styles.formDesc}>Kami akan menghubungi Anda dalam 1×24 jam hari kerja.</p>
                            <ContactForm />
                        </div>

                    </div>
                </div>
            </section>
        </>
    )
}
