import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isRoleAllowed, ALLOWED_ADMIN_ROLES } from '@/lib/rbac'
import { errorResponse } from '@/lib/api-response'

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return errorResponse('NOT_FOUND', 'Not found', 404)
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role,email')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    const email = (profile as { email?: string } | null)?.email ?? undefined
    if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, email)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403)
    }

    // Test connection by querying tables
    let materialsCount: number | null = null
    let materialsError: string | null = null
    let zonesCount: number | null = null
    let zonesError: string | null = null

    // Try materials table
    try {
      const { count, error } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })
      if (error) {
        materialsError = `materials query error: ${error.message} (code: ${error.code || 'no-code'}, details: ${error.details || 'no-details'})`
      } else {
        materialsCount = count
      }
    } catch (err) {
      materialsError = `materials catch error: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
    
    // Try zones table
    try {
      const { count, error } = await supabase
        .from('zones')
        .select('*', { count: 'exact', head: true })
      if (error) {
        zonesError = error.message
      } else {
        zonesCount = count
      }
    } catch (err) {
      zonesError = err instanceof Error ? err.message : 'Unknown error'
    }

    // Determine overall status
    const tablesExist = materialsCount !== null || zonesCount !== null

    let status: string
    let message: string
    if (!tablesExist) {
      status = 'error'
      message = 'Business tables missing or inaccessible.'
    } else {
      status = 'success'
      message = 'Business tables are accessible.'
    }

    return NextResponse.json({
      status,
      message,
      tables: {
        materials_count: materialsCount,
        zones_count: zonesCount,
      },
      diagnostics: {
        materials_error: materialsError,
        zones_error: zonesError,
        checked_by: user.id,
      },
      suggestions:
        materialsCount === null && zonesCount === null
          ? ['Run pending business migrations in supabase/migrations.']
          : [],
    })
  } catch (error: unknown) {
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to run diagnostic',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}
