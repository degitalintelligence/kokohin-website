import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Camera } from 'lucide-react'
import type { ProjectRow, GalleryProject } from '@/lib/types'

export const revalidate = 3600 // Revalidate every hour (ISR)
const GalleryGrid = dynamic(() => import('@/components/gallery/GalleryGrid'))

export default async function GaleriPage() {
    const supabase = await createClient()
    const { data: curated } = await supabase
        .from('projects')
        .select('id, title, location, year, featured, service:service_id(name)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

    const projects: GalleryProject[] = ((curated ?? []) as ProjectRow[]).map((item) => {
        const serviceData = item.service
        const serviceName = Array.isArray(serviceData)
            ? serviceData[0]?.name ?? null
            : serviceData?.name ?? null
            
        return {
            id: item.id,
            title: item.title,
            location: item.location ?? null,
            year: item.year ?? null,
            featured: item.featured ?? null,
            service: serviceName ? { name: serviceName } : null
        }
    })

    const uniqueServices = Array.from(
        new Set(projects.map((p) => p.service?.name).filter((name): name is string => typeof name === 'string' && name.length > 0))
    )
    const categories = ['Semua', ...uniqueServices]

    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-12 bg-gradient-to-br from-primary-dark to-primary text-white">
                <div className="container">
                    <div className="section-label text-white/90">
                        <Camera className="w-5 h-5 inline-block mr-2" />
                        Portfolio Kami
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white my-3">Galeri Proyek</h1>
                    <p className="text-white/75 text-lg max-w-xl">
                        Lihat ratusan proyek yang telah kami selesaikan dengan standar kualitas tinggi.
                    </p>
                </div>
            </section>

            {/* Gallery */}
            <section className="section">
                <div className="container">
                    <Suspense fallback={<div className="text-center text-gray-600">Memuat galeri proyek...</div>}>
                        <GalleryGrid projects={projects} categories={categories} />
                    </Suspense>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-gradient-to-br from-primary to-primary-light text-center text-white">
                <div className="container">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ingin Proyek Anda Ada di Sini?</h2>
                    <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">Hubungi kami dan kami siap mewujudkan kanopi impian Anda.</p>
                    <a href="/kontak" className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-full bg-white text-primary hover:bg-gray-100 transition-all shadow-lg">Mulai Proyek Sekarang</a>
                </div>
            </section>
        </>
    )
}
