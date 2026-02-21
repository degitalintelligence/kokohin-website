import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
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
        console.log('Materials query error object:', error)
      } else {
        materialsCount = count
        console.log('Materials count:', count)
      }
    } catch (err) {
      materialsError = `materials catch error: ${err instanceof Error ? err.message : 'Unknown error'}`
      console.log('Materials catch error:', err)
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

    // Test auth.users table (using service role key for bypassing RLS)
    let authUsersCount: number | null = null
    let authUsersError: string | null = null
    let profilesCount: number | null = null
    let profilesError: string | null = null
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      try {
        const cookieStore = await cookies()
        const serviceClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll()
              },
              setAll(cookiesToSet) {
                try {
                  cookiesToSet.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)
                  )
                } catch {
                  // Server Component — cookies can't be set here, ignore
                }
              },
            },
          }
        )

        // Try to query auth.users (requires service role or appropriate permissions)
        const { count: authCount, error: authErr } = await serviceClient
          .from('auth.users')
          .select('*', { count: 'exact', head: true })
        
        if (authErr) {
          authUsersError = `auth.users query error: ${authErr.message} (code: ${authErr.code})`
          console.log('Auth users query error:', authErr)
        } else {
          authUsersCount = authCount
          console.log('Auth users count:', authCount)
        }

        // Try to query profiles table
        const { count: profilesCountResult, error: profilesErr } = await serviceClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        if (profilesErr) {
          profilesError = `profiles query error: ${profilesErr.message} (code: ${profilesErr.code})`
          console.log('Profiles query error:', profilesErr)
        } else {
          profilesCount = profilesCountResult
          console.log('Profiles count:', profilesCountResult)
        }
      } catch (serviceErr) {
        authUsersError = serviceErr instanceof Error ? serviceErr.message : 'Unknown service client error'
      }
    }

    // Also try with regular anon client (may fail due to RLS)
    let anonAuthError: string | null = null
    try {
      const { error: anonError } = await supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true })
      
      if (anonError) {
        anonAuthError = anonError.message
      }
    } catch (anonErr) {
      anonAuthError = anonErr instanceof Error ? anonErr.message : 'Unknown error'
    }

    // Determine overall status
    const tablesExist = materialsCount !== null || zonesCount !== null
    const authExists = authUsersCount !== null
    
    let status: string
    let message: string
    const statusCode = 200
    
    if (!tablesExist && !authExists) {
      status = 'error'
      message = 'Database tables and auth schema not found. Migrations may not have been applied.'
      // Keep statusCode 200 for diagnostic API
    } else if (!tablesExist) {
      status = 'partial'
      message = 'Auth schema exists but business tables missing. Apply mini‑ERP migration.'
    } else if (!authExists) {
      status = 'partial'
      message = 'Business tables exist but auth schema missing. Check Supabase Auth service.'
    } else {
      status = 'success'
      message = 'Database migration applied successfully'
    }

    const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0)

    return NextResponse.json({
      status,
      message,
      tables: {
        materials_count: materialsCount,
        zones_count: zonesCount,
        auth_users_count: authUsersCount,
        profiles_count: profilesCount
      },
      diagnostics: {
        materials_error: materialsError,
        zones_error: zonesError,
        auth_users_service_error: authUsersError,
        auth_users_anon_error: anonAuthError,
        profiles_error: profilesError,
        service_role_key_available: !!serviceRoleKey,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL
      },
      runtime: {
        node: process.versions.node,
        node_major: nodeMajor,
        proxy_disabled: nodeMajor >= 24
      },
      suggestions: [
        ...(materialsCount === null && zonesCount === null ? [
          'Run the migration file: supabase/migrations/002_mini_erp_schema.sql'
        ] : []),
        ...(authUsersCount === null ? [
          'Auth schema may not be initialized. Supabase self-hosted should include auth schema by default.',
          'Check if Supabase Auth service is running and database migrations for auth have been applied.',
          'If auth.users table is missing, you may need to reset/rebuild Supabase service.'
        ] : [])
      ]
    }, { status: statusCode })
    
  } catch (error: unknown) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Supabase',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
