'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type LeadFormState = {
    success: boolean
    error?: string
    message?: string
}

export async function submitLead(
    _prevState: LeadFormState,
    formData: FormData
): Promise<LeadFormState> {
    const name = String(formData.get('name') ?? '').trim()
    const phone = String(formData.get('phone') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim() || null
    const location = String(formData.get('location') ?? '').trim()
    const serviceId = String(formData.get('service') ?? '').trim() || null
    const message = String(formData.get('message') ?? '').trim() || null

    if (!name || !phone || !location) {
        return { success: false, error: 'Nama, nomor telepon, dan lokasi wajib diisi.' }
    }
    if (phone.length < 9) {
        return { success: false, error: 'Nomor telepon tidak valid.' }
    }

    try {
        const supabase = await createClient()
        const { error } = await supabase.from('leads').insert({
            name,
            phone,
            email,
            location,
            service_id: serviceId || null,
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
