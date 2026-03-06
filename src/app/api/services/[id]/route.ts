import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ALLOWED_ADMIN_ROLES, isRoleAllowed } from '@/lib/rbac'
import { errorResponse } from '@/lib/api-response'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data, error } = await supabase.from('services').select('*').eq('id', id).maybeSingle()
  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to fetch service', 500, error.message)
  return NextResponse.json({ service: data })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return errorResponse('FORBIDDEN', 'Forbidden', 403)
  }

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('BAD_REQUEST', 'Invalid JSON', 400) }
  const payload = body as Record<string, unknown>
  const { error } = await supabase.from('services').update({
    name: 'name' in payload ? String(payload.name || '') : undefined,
    slug: 'slug' in payload ? String(payload.slug || '') : undefined,
    description: 'description_html' in payload ? (String(payload.description_html || '') || null) : undefined,
    image_url: 'image_url' in payload ? (String(payload.image_url || '') || null) : undefined,
    icon: 'icon' in payload ? (String(payload.icon || '') || null) : undefined,
    "order": 'order' in payload ? Number(payload.order || 0) : undefined,
    is_active: 'is_active' in payload ? Boolean(payload.is_active) : undefined,
    meta_title: 'meta_title' in payload ? (String(payload.meta_title || '') || null) : undefined,
    meta_description: 'meta_description' in payload ? (String(payload.meta_description || '') || null) : undefined,
    meta_keywords: 'meta_keywords' in payload ? (String(payload.meta_keywords || '') || null) : undefined,
  }).eq('id', id)
  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to update service', 500, error.message)
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return errorResponse('FORBIDDEN', 'Forbidden', 403)
  }
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to delete service', 500, error.message)
  return NextResponse.json({ success: true })
}
