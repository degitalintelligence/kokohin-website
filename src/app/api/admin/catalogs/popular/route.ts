import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRoleAllowed, ALLOWED_ADMIN_ROLES } from '@/lib/rbac'
import { errorResponse } from '@/lib/api-response'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  const email = (profile as { email?: string } | null)?.email ?? undefined
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, email)) {
    return errorResponse('FORBIDDEN', 'Forbidden', 403)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON', 400)
  }
  const id = typeof payload === 'object' && payload !== null && 'id' in payload ? String((payload as { id: unknown }).id || '') : ''
  const isPopular =
    typeof payload === 'object' && payload !== null && 'is_popular' in payload
      ? Boolean((payload as { is_popular: unknown }).is_popular)
      : null
  if (!id) return errorResponse('BAD_REQUEST', 'Invalid ID', 400)
  if (isPopular === null) return errorResponse('BAD_REQUEST', 'Missing is_popular', 400)

  const { data: updated, error } = await supabase
    .from('catalogs')
    .update({ is_popular: isPopular })
    .eq('id', id)
    .select('id, is_popular')
    .maybeSingle()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to update popular flag', 500, error.message)
  }
  if (!updated) {
    return errorResponse('NOT_FOUND', 'Not found', 404)
  }

  return NextResponse.json({ success: true, id: updated.id, is_popular: updated.is_popular })
}
