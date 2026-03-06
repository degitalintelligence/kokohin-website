import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'
import { ALLOWED_ADMIN_ROLES, isRoleAllowed } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403)
    }

    const body = await req.json().catch(() => null) as {
      startDate?: string
      weeksAhead?: number
      pattern?: 'daily' | 'weekdays' | 'custom'
      daysOfWeek?: number[]
      startTime?: string
      endTime?: string
      capacity?: number
      isActive?: boolean
    } | null

    if (!body?.startDate || !body?.startTime || !body?.endTime) {
      return errorResponse('BAD_REQUEST', 'Data tidak lengkap', 400)
    }

    const dto = {
      start_date: body.startDate,
      weeks_ahead: body.weeksAhead ?? 4,
      pattern: body.pattern ?? 'daily',
      days_of_week: body.pattern === 'custom' ? (body.daysOfWeek ?? []) : [],
      start_time: body.startTime,
      end_time: body.endTime,
      capacity: body.capacity ?? 1,
      is_active: body.isActive ?? true,
    }

    const { data, error } = await supabase.rpc('create_recurring_survey_slots', { dto })
    if (error) {
      return errorResponse('INTERNAL_ERROR', 'Gagal membuat slot berulang', 500, error.message)
    }

    return NextResponse.json({ success: true, summary: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse('INTERNAL_ERROR', 'Gagal memproses permintaan', 500, msg)
  }
}

