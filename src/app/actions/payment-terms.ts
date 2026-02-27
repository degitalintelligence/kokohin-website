'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPaymentTerms() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('erp_payment_terms')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

interface PaymentTermItem {
    percent: number
    label: string
}

export async function upsertPaymentTerm(payload: { id?: string, name: string, description?: string, terms_json: PaymentTermItem[], is_active?: boolean }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { id, ...data } = payload

    if (id) {
        const { error } = await supabase
            .from('erp_payment_terms')
            .update(data)
            .eq('id', id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('erp_payment_terms')
            .insert(data)
        if (error) throw error
    }

    revalidatePath('/admin/settings/payment-terms')
    revalidatePath('/admin/erp')
    return { success: true }
}

export async function deletePaymentTerm(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('erp_payment_terms')
        .delete()
        .eq('id', id)
    
    if (error) throw error

    revalidatePath('/admin/settings/payment-terms')
    return { success: true }
}
