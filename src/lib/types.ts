export interface Service {
    id: string
    name: string
    slug: string
    short_desc: string
    description: string
    icon: string
    image_url: string | null
    order: number
    created_at: string
}

export interface Project {
    id: string
    title: string
    service_id: string
    service?: Service
    images: string[]
    location: string
    year: number
    featured: boolean
    created_at: string
}

export interface Testimonial {
    id: string
    name: string
    company: string | null
    content: string
    rating: number
    avatar_url: string | null
    active: boolean
    created_at: string
}

export interface Lead {
    id: string
    name: string
    phone: string
    email: string | null
    location: string
    service_id: string | null
    service?: Service
    message: string | null
    status: 'new' | 'contacted' | 'quoted' | 'closed'
    created_at: string
}
