'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'

export async function getLogoUrl() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single()
    
    return data?.value || null
}

export async function updateLogoUrl(publicUrl: string) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
        return { error: 'Forbidden' }
    }

    // Normalize if user pasted Next Image proxy URL (/_next/image?url=...)
    let normalized = String(publicUrl || '').trim()
    try {
        const u = new URL(normalized, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        if (u.pathname.startsWith('/_next/image') && u.searchParams.has('url')) {
            const actual = u.searchParams.get('url') || ''
            if (actual) normalized = decodeURIComponent(actual)
        }
    } catch {
        // keep original if URL parsing fails
    }

    // Update site_settings table
    const { error: dbError } = await supabase
        .from('site_settings')
        .upsert({
            key: 'logo_url',
            value: normalized,
            updated_at: new Date().toISOString()
        })

    if (dbError) {
        console.error('Error updating settings:', dbError)
        return { error: 'Failed to save logo setting' }
    }

    revalidatePath('/')
    revalidatePath('/admin/settings')
    
    return { success: true }
}

export async function getLoginBackgroundUrl() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'login_background_url')
        .single()
    
    return data?.value || null
}

export async function updateLoginBackgroundUrl(publicUrl: string) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
        return { error: 'Forbidden' }
    }

    // Update site_settings table
    const { error: dbError } = await supabase
        .from('site_settings')
        .upsert({
            key: 'login_background_url',
            value: publicUrl,
            updated_at: new Date().toISOString()
        })

    if (dbError) {
        console.error('Error updating settings:', dbError)
        return { error: 'Failed to save background setting' }
    }

    revalidatePath('/admin/login')
    
    return { success: true }
}

function normalizeIndoPhone(input: string): string {
    const digits = input.replace(/\D+/g, '')
    if (digits.startsWith('0')) return `62${digits.slice(1)}`
    if (digits.startsWith('62')) return digits
    if (digits.startsWith('8')) return `62${digits}`
    return digits
}

export async function getWaNumber() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'wa_number')
        .maybeSingle()
    return (data as { value?: string } | null)?.value ?? null
}

export async function updateWaNumber(value: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, (profile as { email?: string } | null)?.email)) {
        return { error: 'Forbidden' }
    }
    const normalized = normalizeIndoPhone(String(value || '').trim())
    if (!/^(62)\d{8,15}$/.test(normalized)) {
        return { error: 'Format nomor WhatsApp tidak valid. Gunakan 62xxxxxxxxxx' }
    }
    const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'wa_number', value: normalized, updated_at: new Date().toISOString() })
    if (error) {
        return { error: error.message }
    }
    revalidatePath('/admin/settings')
    return { success: true, value: normalized }
}

export async function getBasicSettings() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('site_settings')
        .select('key,value')
        .in('key', ['site_name','support_email','support_phone','contact_address','contact_hours','company_website','instagram_url','facebook_url','tiktok_url','youtube_url'])
    const map: Record<string, string> = {}
    const rows = (data as Array<{ key?: string; value?: string }> | null) ?? []
    rows.forEach((row) => { if (row && row.key) map[row.key] = row.value ?? '' })
    return {
        siteName: map['site_name'] ?? '',
        supportEmail: map['support_email'] ?? '',
        supportPhone: map['support_phone'] ?? '',
        contactAddress: map['contact_address'] ?? '',
        contactHours: map['contact_hours'] ?? '',
        companyWebsite: map['company_website'] ?? '',
        instagramUrl: map['instagram_url'] ?? '',
        facebookUrl: map['facebook_url'] ?? '',
        tiktokUrl: map['tiktok_url'] ?? '',
        youtubeUrl: map['youtube_url'] ?? ''
    }
}

export async function updateBasicSettings(payload: { siteName?: string; supportEmail?: string; supportPhone?: string; contactAddress?: string; contactHours?: string; companyWebsite?: string; instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string; youtubeUrl?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role,email')
        .eq('id', user.id)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    const email = (profile as { email?: string } | null)?.email ?? undefined
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, email)) {
        return { error: 'Forbidden' }
    }
    const siteName = String(payload.siteName ?? '').trim()
    const supportEmail = String(payload.supportEmail ?? '').trim()
    const supportPhone = String(payload.supportPhone ?? '').trim()
    const contactAddress = String(payload.contactAddress ?? '').trim()
    const contactHours = String(payload.contactHours ?? '').trim()
    const companyWebsite = String(payload.companyWebsite ?? '').trim()
    const instagramUrl = String(payload.instagramUrl ?? '').trim()
    const facebookUrl = String(payload.facebookUrl ?? '').trim()
    const tiktokUrl = String(payload.tiktokUrl ?? '').trim()
    const youtubeUrl = String(payload.youtubeUrl ?? '').trim()
    if (siteName && siteName.length < 2) return { error: 'Nama situs terlalu pendek' }
    if (supportEmail && !/^\S+@\S+\.\S+$/.test(supportEmail)) return { error: 'Format email tidak valid' }
    if (supportPhone && !/^\+?\d{6,20}$/.test(supportPhone)) return { error: 'Format nomor telepon tidak valid' }
    if (companyWebsite && !/^[a-zA-Z0-9\-_.]+(\.[a-zA-Z]{2,})+/.test(companyWebsite)) return { error: 'Format website tidak valid' }
    if (instagramUrl && !/^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._%-]+\/?$/.test(instagramUrl)) return { error: 'Format URL Instagram tidak valid' }
    if (facebookUrl && !/^https?:\/\/(www\.)?facebook\.com\/[A-Za-z0-9._%-/]+\/?$/.test(facebookUrl)) return { error: 'Format URL Facebook tidak valid' }
    if (tiktokUrl && !/^https?:\/\/(www\.)?tiktok\.com\/.+/.test(tiktokUrl)) return { error: 'Format URL TikTok tidak valid' }
    if (youtubeUrl && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(youtubeUrl)) return { error: 'Format URL YouTube tidak valid' }
    const rows: Array<{ key: string; value: string; updated_at: string }> = []
    if (siteName) rows.push({ key: 'site_name', value: siteName, updated_at: new Date().toISOString() })
    if (supportEmail) rows.push({ key: 'support_email', value: supportEmail, updated_at: new Date().toISOString() })
    if (supportPhone) rows.push({ key: 'support_phone', value: supportPhone, updated_at: new Date().toISOString() })
    if (contactAddress) rows.push({ key: 'contact_address', value: contactAddress, updated_at: new Date().toISOString() })
    if (contactHours) rows.push({ key: 'contact_hours', value: contactHours, updated_at: new Date().toISOString() })
    if (companyWebsite) rows.push({ key: 'company_website', value: companyWebsite, updated_at: new Date().toISOString() })
    if (instagramUrl) rows.push({ key: 'instagram_url', value: instagramUrl, updated_at: new Date().toISOString() })
    if (facebookUrl) rows.push({ key: 'facebook_url', value: facebookUrl, updated_at: new Date().toISOString() })
    if (tiktokUrl) rows.push({ key: 'tiktok_url', value: tiktokUrl, updated_at: new Date().toISOString() })
    if (youtubeUrl) rows.push({ key: 'youtube_url', value: youtubeUrl, updated_at: new Date().toISOString() })
    if (rows.length === 0) return { error: 'Tidak ada perubahan' }
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return { success: true }
}

export async function getSealantMaterialId() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sealant_material_id')
        .maybeSingle()
    return (data as { value?: string } | null)?.value ?? null
}

export async function updateSealantMaterialId(materialId: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role,email')
        .eq('id', user.id)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    const email = (profile as { email?: string } | null)?.email ?? undefined
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, email)) {
        return { error: 'Forbidden' }
    }
    let validId: string | null = null
    if (materialId) {
        const { data: mat } = await supabase.from('materials').select('id').eq('id', materialId).maybeSingle()
        if (!mat) return { error: 'Material tidak ditemukan' }
        validId = materialId
    }
    const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'sealant_material_id', value: validId ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return { success: true, value: validId }
}

export async function getSecuritySettings() {
    const supabase = await createClient()
    const keys = ['blocked_ips', 'lead_rate_limit_window_min', 'lead_rate_limit_max']
    const { data } = await supabase.from('site_settings').select('key,value').in('key', keys)
    const map: Record<string, string> = {}
    const rows = (data as Array<{ key?: string; value?: string }> | null) ?? []
    rows.forEach((row) => { if (row && row.key) map[row.key] = row.value ?? '' })
    return {
        blockedIps: map['blocked_ips'] ?? '',
        rateWindowMin: Number(map['lead_rate_limit_window_min'] || '15') || 15,
        rateMax: Number(map['lead_rate_limit_max'] || '1') || 1,
    }
}

export async function updateSecuritySettings(payload: { blockedIps?: string; rateWindowMin?: number; rateMax?: number }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: profile } = await supabase.from('profiles').select('role,email').eq('id', user.id).maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    const email = (profile as { email?: string } | null)?.email ?? undefined
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, email)) {
        return { error: 'Forbidden' }
    }
    const blockedIps = String(payload.blockedIps ?? '').trim()
    const rateWindowMin = Number(payload.rateWindowMin ?? 15)
    const rateMax = Number(payload.rateMax ?? 1)
    const rows: Array<{ key: string; value: string; updated_at: string }> = [
        { key: 'blocked_ips', value: blockedIps, updated_at: new Date().toISOString() },
        { key: 'lead_rate_limit_window_min', value: String(rateWindowMin), updated_at: new Date().toISOString() },
        { key: 'lead_rate_limit_max', value: String(rateMax), updated_at: new Date().toISOString() },
    ]
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return { success: true }
}
