'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export type LeadFormState = {
    success: boolean
    error?: string
    message?: string
}

export async function submitLead(
    _prevState: LeadFormState,
    formData: FormData
): Promise<LeadFormState> {
    const hdrs = await headers()
    const ipRaw = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || ''
    const ip = ipRaw.split(',')[0]?.trim() || ''

    const name = String(formData.get('name') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim() || null
    const location = String(formData.get('location') ?? '').trim()
    const serviceId = String(formData.get('service') ?? '').trim() || null
    const message = String(formData.get('message') ?? '').trim() || null
    const honeypot = String(formData.get('website') ?? '').trim()
    if (honeypot) {
        return { success: false, error: 'Permintaan ditolak.' }
    }

    const cfToken = String(formData.get('cf-turnstile-response') ?? formData.get('turnstile_token') ?? '').trim()
    if (process.env.TURNSTILE_SECRET_KEY && cfToken) {
        try {
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    secret: process.env.TURNSTILE_SECRET_KEY,
                    response: cfToken
                })
            })
            const verifyJson = (await verifyRes.json()) as { success?: boolean }
            if (!verifyJson?.success) {
                return { success: false, error: 'Verifikasi keamanan gagal. Silakan muat ulang dan coba lagi.' }
            }
        } catch {
            return { success: false, error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }
        }
    }

    if (!name || !phone || !location) {
        return { success: false, error: 'Nama, nomor telepon, dan lokasi wajib diisi.' }
    }
    const normalizedPhone = phone.replace(/\s|-/g, '')
    const indoPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
    if (!indoPhoneRegex.test(normalizedPhone)) {
        return { success: false, error: 'Format nomor telepon tidak valid. Gunakan format Indonesia (contoh: 08xxxxxxxxxx).' }
    }

    try {
        const supabase = await createClient()
        let blockedIpsStr = process.env.BLOCKED_IPS || ''
        let windowMin = Number(process.env.LEAD_RATE_LIMIT_WINDOW_MIN || '15')
        let maxPerWindow = Number(process.env.LEAD_RATE_LIMIT_MAX || '1')
        {
            const { data: sBlocked } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'blocked_ips')
                .maybeSingle()
            if (sBlocked?.value) blockedIpsStr = String(sBlocked.value)
            const { data: sWin } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'lead_rate_limit_window_min')
                .maybeSingle()
            if (sWin?.value && !isNaN(Number(sWin.value))) windowMin = Number(sWin.value)
            const { data: sMax } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'lead_rate_limit_max')
                .maybeSingle()
            if (sMax?.value && !isNaN(Number(sMax.value))) maxPerWindow = Number(sMax.value)
        }
        if (ip) {
            const blocked = blockedIpsStr
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            if (blocked.includes(ip)) {
                return { success: false, error: 'Permintaan ditolak.' }
            }
        }
        if (maxPerWindow > 0) {
            const sinceIso = new Date(Date.now() - windowMin * 60_000).toISOString()
            const { count } = await supabase
                .from('leads')
                .select('id', { head: true, count: 'exact' })
                .eq('phone', normalizedPhone)
                .gt('created_at', sinceIso)
            if ((count ?? 0) >= maxPerWindow) {
                return { success: false, error: 'Terlalu banyak permintaan. Coba lagi beberapa saat.' }
            }
        }
        let validServiceId: string | null = serviceId
        if (serviceId) {
            const { data: svc } = await supabase
                .from('services')
                .select('id')
                .eq('id', serviceId)
                .maybeSingle()
            if (!svc) {
                validServiceId = null
            }
        }
        const { error } = await supabase.from('leads').insert({
            name,
            phone: normalizedPhone,
            email,
            location,
            service_id: validServiceId,
            message,
            status: 'new',
        })

        if (error) throw error

        revalidatePath('/admin/leads')
        return { success: true, message: 'Terima kasih! Kami akan menghubungi Anda segera.' }
    } catch (err) {
        console.error('submitLead error:', err)
        return { success: false, error: 'Terjadi kesalahan. Silakan coba lagi atau hubungi via WhatsApp.' }
    }
}

export async function saveLeadEstimation(
    leadId: string,
    data: {
        catalog_id: string | null
        total_hpp: number
        margin_percentage: number
        total_selling_price: number
        zone_id: string | null
        panjang?: number
        lebar?: number
        unit_qty?: number
        status?: string
        items?: any[]
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Get current lead to check if we should increment version
    const { data: lead } = await supabase
        .from('leads')
        .select('estimation_version, status, original_selling_price')
        .eq('id', leadId)
        .single()

    const currentVersion = lead?.estimation_version || 1
    const newVersion = (lead?.status === 'Quoted' || lead?.status === 'quoted') 
        ? currentVersion + 1 
        : currentVersion

    // Create a snapshot in estimations table for history
    const { data: newEstimation, error: estError } = await supabase
        .from('estimations')
        .insert({
            lead_id: leadId,
            version_number: newVersion,
            total_hpp: data.total_hpp,
            margin_percentage: data.margin_percentage,
            total_selling_price: data.total_selling_price,
            status: 'draft'
        })
        .select('id')
        .single()

    if (estError) {
        console.error('Failed to create estimation snapshot:', estError)
    }

    // 0. Save estimation items if present
    if (newEstimation && data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
            estimation_id: newEstimation.id,
            name: item.name,
            unit: item.unit,
            quantity: item.qtyCharged || item.quantity || 0,
            unit_price: item.hpp || item.unit_price || 0,
            subtotal: item.subtotal || 0,
            type: item.type
        }))
        const { error: itemError } = await supabase.from('erp_estimation_items').insert(itemsToInsert)
        if (itemError) console.error('Failed to save estimation items:', itemError)
    }

    // Check if original_selling_price is already set. If not, this is the first save or it was empty.
    // If it's already set (and > 0), we DO NOT overwrite it, preserving the historical value.
    const originalSellingPrice = lead?.original_selling_price && lead.original_selling_price > 0 
        ? lead.original_selling_price 
        : data.total_selling_price

    const { error } = await supabase
        .from('leads')
        .update({
            catalog_id: data.catalog_id,
            total_hpp: data.total_hpp,
            margin_percentage: data.margin_percentage,
            total_selling_price: data.total_selling_price,
            original_selling_price: originalSellingPrice, // Ensure this is set/preserved
            zone_id: data.zone_id,
            panjang: data.panjang,
            lebar: data.lebar,
            unit_qty: data.unit_qty,
            status: data.status || 'Quoted',
            estimation_version: newVersion,
            updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

    if (error) throw error

    // 1. Create entry in Audit Trail
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()
            
        await supabase.from('erp_audit_trail').insert({
            user_id: user.id,
            entity_type: 'estimation',
            entity_id: leadId,
            action_type: lead?.status === 'Quoted' ? 'revision' : 'create',
            new_value: {
                version: newVersion,
                total_selling_price: data.total_selling_price,
                status: 'Quoted'
            }
        })
    } catch (auditError) {
        console.warn('Failed to log audit trail:', auditError)
    }

    revalidatePath('/admin/leads')
    return { success: true }
}

