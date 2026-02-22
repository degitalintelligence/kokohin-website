'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ALLOWED_ADMIN_ROLES, isRoleAllowed } from '@/lib/rbac'

export type ServicePayload = {
  id?: string
  name: string
  slug: string
  description_html: string | null
  image_url: string | null
  icon: string | null
  order?: number | null
  is_active?: boolean
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
}

export async function createService(formData: FormData) {
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
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return { error: 'Forbidden' }
  }

  const payload: ServicePayload = {
    name: String(formData.get('name') || '').trim(),
    slug: String(formData.get('slug') || '').trim(),
    description_html: String(formData.get('description_html') || '').trim() || null,
    image_url: String(formData.get('image_url') || '').trim() || null,
    icon: String(formData.get('icon') || '').trim() || null,
    order: Number(formData.get('order') || 0),
    is_active: String(formData.get('is_active') || 'true') === 'true',
    meta_title: String(formData.get('meta_title') || '').trim() || null,
    meta_description: String(formData.get('meta_description') || '').trim() || null,
    meta_keywords: String(formData.get('meta_keywords') || '').trim() || null,
  }

  if (!payload.name || !payload.slug) {
    return { error: 'Nama dan slug wajib diisi' }
  }

  const { error } = await supabase.from('services').insert({
    name: payload.name,
    slug: payload.slug,
    description: payload.description_html,
    image_url: payload.image_url,
    icon: payload.icon,
    "order": payload.order ?? 0,
    is_active: payload.is_active ?? true,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    meta_keywords: payload.meta_keywords,
  })

  if (error) return { error: error.message }
  revalidatePath('/layanan')
  revalidatePath('/admin/services')
  return { success: true }
}

export async function updateService(id: string, formData: FormData) {
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
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return { error: 'Forbidden' }
  }

  const payload: ServicePayload = {
    name: String(formData.get('name') || '').trim(),
    slug: String(formData.get('slug') || '').trim(),
    description_html: String(formData.get('description_html') || '').trim() || null,
    image_url: String(formData.get('image_url') || '').trim() || null,
    icon: String(formData.get('icon') || '').trim() || null,
    order: Number(formData.get('order') || 0),
    is_active: String(formData.get('is_active') || 'true') === 'true',
    meta_title: String(formData.get('meta_title') || '').trim() || null,
    meta_description: String(formData.get('meta_description') || '').trim() || null,
    meta_keywords: String(formData.get('meta_keywords') || '').trim() || null,
  }

  if (!payload.name || !payload.slug) {
    return { error: 'Nama dan slug wajib diisi' }
  }

  const { error } = await supabase.from('services').update({
    name: payload.name,
    slug: payload.slug,
    description: payload.description_html,
    image_url: payload.image_url,
    icon: payload.icon,
    "order": payload.order ?? 0,
    is_active: payload.is_active ?? true,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    meta_keywords: payload.meta_keywords,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/layanan')
  revalidatePath(`/admin/services/${id}`)
  revalidatePath('/admin/services')
  return { success: true }
}

export async function deleteService(id: string) {
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
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return { error: 'Forbidden' }
  }

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/layanan')
  revalidatePath('/admin/services')
  return { success: true }
}

