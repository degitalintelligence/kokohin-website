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

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const id = typeof payload === 'object' && payload !== null && 'id' in payload ? String((payload as { id: unknown }).id || '') : ''
  const isActive =
    typeof payload === 'object' && payload !== null && 'is_active' in payload
      ? Boolean((payload as { is_active: unknown }).is_active)
      : null
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  if (isActive === null) return NextResponse.json({ error: 'Missing is_active' }, { status: 400 })

  const { data: updated, error } = await supabase
    .from('catalogs')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id, is_active')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, id: updated.id, is_active: updated.is_active })
}
