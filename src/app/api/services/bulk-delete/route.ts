'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRoleAllowed, ALLOWED_ADMIN_ROLES } from '@/lib/rbac'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  const email = (profile as { email?: string } | null)?.email ?? undefined
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = body as { ids?: unknown }
  const idsRaw = Array.isArray(parsed.ids) ? parsed.ids : []
  const validIds = (idsRaw as unknown[]).map(v => String(v)).filter(Boolean)
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
  }

  const { error } = await supabase.from('services').delete().in('id', validIds)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: validIds.length })
}
