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

// ============================================
// MINI-ERP TYPES (From PRD Section 5)
// ============================================

export interface Profile {
    id: string
    email: string
    full_name: string | null
    role: 'super_admin' | 'admin_sales' | 'admin_proyek'
    created_at: string
    updated_at: string
}

export interface Material {
    id: string
    code: string
    name: string
    category: 'atap' | 'frame' | 'aksesoris' | 'lainnya'
    unit: 'batang' | 'lembar' | 'm1' | 'm2' | 'hari' | 'unit'
    base_price_per_unit: number   // kolom DB: base_price_per_unit (bukan 'price')
    length_per_unit: number | null
    is_active: boolean
    is_laser_cut: boolean
    requires_sealant: boolean
    created_at: string
    updated_at: string
}

export interface Catalog {
    id: string
    image_url: string | null
    title: string
    atap_id: string | null
    atap?: Material
    rangka_id: string | null
    rangka?: Material
    base_price_per_m2: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Zone {
    id: string
    name: string
    markup_percentage: number
    flat_fee: number
    created_at: string
}

export interface ErpProject {
    id: string
    customer_name: string
    phone: string
    address: string
    zone_id: string | null
    zone?: Zone
    custom_notes: string | null
    status: 'New' | 'Surveyed' | 'Quoted' | 'Deal' | 'Lost' | 'Need Manual Quote'
    created_at: string
    updated_at: string
}

export interface Estimation {
    id: string
    project_id: string
    project?: ErpProject
    version_number: number
    total_hpp: number
    margin_percentage: number
    total_selling_price: number
    status: 'draft' | 'sent' | 'approved' | 'rejected'
    created_at: string
    updated_at: string
}

export interface EstimationItem {
    id: string
    estimation_id: string
    estimation?: Estimation
    material_id: string
    material?: Material
    qty_needed: number
    qty_charged: number
    subtotal: number
    created_at: string
}

export interface PaymentTerm {
    id: string
    estimation_id: string
    estimation?: Estimation
    term_name: 'DP' | 'Termin 1' | 'Termin 2' | 'Pelunasan'
    percentage: number
    amount_due: number
    created_at: string
}

// ============================================
// CALCULATOR TYPES
// ============================================

export interface CalculatorInput {
    panjang: number
    lebar: number
    tinggi?: number
    materialId?: string
    catalogId?: string
    zoneId?: string
    jenis: 'standard' | 'custom'
    customNotes?: string
}

export interface CalculatorResult {
    luas: number
    materialCost: number
    wasteCost: number
    totalHpp: number
    marginPercentage: number
    markupPercentage: number
    flatFee: number
    totalSellingPrice: number
    estimatedPrice: number
    breakdown: {
        name: string
        qtyNeeded: number
        qtyCharged: number
        unit: string
        pricePerUnit: number
        subtotal: number
    }[]
    warnings?: string[]
    suggestedItems?: {
        name: string
        reason: string
        estimatedCost: number
    }[]
}