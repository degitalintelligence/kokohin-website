import type { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
    title: 'Kontak Kami',
    description: 'Hubungi Kokohin untuk konsultasi gratis mengenai kebutuhan kanopi Anda. Kami siap melayani area Jabodetabek.',
}

export default async function KontakPage() {
    const supabase = await createClient()
    const { data: servicesRows } = await supabase
        .from('services')
        .select('id, name')
        .order('name', { ascending: true })

    const services = (servicesRows || []).map(s => ({
        id: s.id,
        name: s.name
    }))

    const CONTACT_INFO = [
        { 
            icon: MapPin, 
            title: 'Alamat Workshop', 
            desc: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Jl. Raya Bogor KM 30, Cimanggis, Depok, Jawa Barat 16451' 
        },
        { 
            icon: Phone, 
            title: 'Telepon / WhatsApp', 
            desc: `${process.env.NEXT_PUBLIC_CONTACT_PHONE || '0812-3456-7890'} (Respon Cepat)` 
        },
        { 
            icon: Mail, 
            title: 'Email', 
            desc: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'halo@kokohin.com' 
        },
        { 
            icon: Clock, 
            title: 'Jam Operasional', 
            desc: process.env.NEXT_PUBLIC_CONTACT_HOURS || 'Senin - Sabtu: 08:00 - 17:00 WIB' 
        },
    ]

    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-12 bg-gradient-to-br from-primary-dark to-primary text-white">
                <div className="container">
                    <div className="section-label text-white/90">
                        <MessageCircle className="w-5 h-5 inline-block mr-2" />
                        Hubungi Kami
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white my-3">Konsultasi Gratis</h1>
                    <p className="text-white/75 text-lg max-w-xl">
                        Jangan ragu untuk bertanya. Tim kami siap membantu memberikan solusi terbaik untuk kebutuhan kanopi Anda.
                    </p>
                </div>
            </section>

            {/* Contact Content */}
            <section className="section">
                <div className="container">
                    <div className="grid md:grid-cols-[1fr_1.5fr] gap-10 items-start">
                        {/* Info Column */}
                        <div>
                            <h2 className="section-title">Informasi Kontak</h2>
                            <div className="divider" />
                            <p className="section-desc mb-8">
                                Kunjungi workshop kami atau hubungi melalui kontak di bawah ini.
                            </p>

                            <div className="flex flex-col gap-6 mb-8">
                                {CONTACT_INFO.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-start">
                                        <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg flex-shrink-0">
                                            <item.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-primary-dark mb-1">{item.title}</h3>
                                            <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md h-[300px]">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.257642676839!2d106.86296737586948!3d-6.360699993629342!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69ec6555555555%3A0x2e69ec6555555555!2sCimanggis%2C%20Depok%20City%2C%20West%20Java!5e0!3m2!1sen!2sid!4v1708490000000!5m2!1sen!2sid"
                                    width="100%"
                                    height="100%"
                                    className="border-0"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="card">
                            <h2 className="text-2xl font-bold mb-6 text-primary-dark">Kirim Pesan</h2>
                            <ContactForm services={services} />
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
