'use client'

import { useMemo, useState } from 'react'
import { Construction, Sparkles, Blinds, Wrench, Tent, Home, MapPin, Calendar } from 'lucide-react'

type GalleryProject = {
    id: string
    title: string
    location: string | null
    year: number | null
    featured: boolean | null
    service?: { name: string | null } | null
}

const BG_CLASSES = [
    'bg-gradient-to-br from-slate-900 to-slate-700',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-teal-600 to-teal-700',
    'bg-gradient-to-br from-violet-600 to-violet-800',
    'bg-gradient-to-br from-amber-600 to-amber-700',
    'bg-gradient-to-br from-blue-700 to-blue-600',
]

const ICONS = [Construction, Sparkles, Blinds, Wrench, Tent, Home]

interface GalleryGridProps {
    projects: GalleryProject[]
    categories: string[]
}

export default function GalleryGrid({ projects, categories }: GalleryGridProps) {
    const [activeFilter, setActiveFilter] = useState('Semua')

    const filtered = useMemo(() => {
        if (activeFilter === 'Semua') return projects
        return projects.filter((p) => (p.service?.name ?? 'Lainnya') === activeFilter)
    }, [activeFilter, projects])

    return (
        <div>
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-10">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`px-5 py-2 rounded-full border-[1.5px] text-sm font-medium cursor-pointer transition-all duration-200 ${
                            activeFilter === cat 
                                ? 'bg-primary border-primary text-white shadow-[0_4px_12px_rgba(227,6,19,0.3)]' 
                                : 'border-gray-200 bg-white text-gray-500 hover:border-primary hover:text-primary'
                        }`}
                        onClick={() => setActiveFilter(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p, i) => {
                    const Icon = ICONS[i % ICONS.length]
                    return (
                        <div key={p.id} className="group rounded-xl overflow-hidden cursor-pointer shadow-md hover:scale-[1.02] hover:shadow-xl transition-all duration-200 bg-white">
                            <div
                                className={`relative aspect-[4/3] flex items-center justify-center overflow-hidden ${BG_CLASSES[i % BG_CLASSES.length]}`}
                            >
                                <div className="text-white/20 z-0 transform scale-150 transition-transform duration-500 group-hover:scale-125">
                                    <Icon size={80} strokeWidth={1} />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 z-10 opacity-0 flex flex-col justify-end transition-opacity duration-300 group-hover:opacity-100">
                                    <span className="text-xs uppercase tracking-wider font-bold text-orange-300 mb-1">{p.service?.name ?? 'Lainnya'}</span>
                                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{p.title}</h3>
                                    <p className="text-sm text-gray-300 flex items-center gap-3">
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {p.location ?? '-'}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {p.year ?? '-'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Belum ada proyek untuk kategori ini.</p>
                </div>
            )}
        </div>
    )
}