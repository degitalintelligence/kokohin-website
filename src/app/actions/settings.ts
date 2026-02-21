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

    // Update site_settings table
    const { error: dbError } = await supabase
        .from('site_settings')
        .upsert({
            key: 'logo_url',
            value: publicUrl,
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
