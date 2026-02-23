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
