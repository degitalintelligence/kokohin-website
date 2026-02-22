import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ALLOWED_ADMIN_ROLES, isRoleAllowed } from '@/lib/rbac'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const payload = body as Record<string, unknown>
  const { error } = await supabase.from('services').insert({
    name: String(payload.name || ''),
    slug: String(payload.slug || ''),
    description: String(payload.description_html || '') || null,
    image_url: String(payload.image_url || '') || null,
    icon: String(payload.icon || '') || null,
    "order": Number(payload.order || 0),
    is_active: Boolean(payload.is_active ?? true),
    meta_title: String(payload.meta_title || '') || null,
    meta_description: String(payload.meta_description || '') || null,
    meta_keywords: String(payload.meta_keywords || '') || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

