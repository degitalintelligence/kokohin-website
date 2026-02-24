import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isRoleAllowed, ALLOWED_MATERIALS_ROLES } from '@/lib/rbac'

export async function middleware(request: NextRequest) {
    const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0)
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Proxy] Node version: ${process.versions.node} (Major: ${nodeMajor})`)
    }

    const pathname = request.nextUrl.pathname
    const isAdminRoute = pathname.startsWith('/admin')
    const isLoginPage = pathname === '/admin/login'

    if (nodeMajor >= 24 && !isAdminRoute) {
        const response = NextResponse.next()
        response.headers.set('x-proxy-disabled', `node-${process.versions.node}`)
        return response
    }

    let supabaseResponse = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    supabaseResponse = NextResponse.next()
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    let userRole: string | null = null
    let userEmail: string | null = null

    if (user) {
        const jwtRole = (user.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined
        const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role as string | undefined
        userRole = jwtRole ?? appRole ?? null
        userEmail = user.email ?? null
    }

    const isDevMode = process.env.DEV_MODE === 'true'
    const hasBypassCookie = request.cookies.get('dev-bypass')?.value === '1'
    const isAuthenticated = !!user || (isDevMode && hasBypassCookie)

    if (isAdminRoute && !isLoginPage && !isAuthenticated) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        return NextResponse.redirect(loginUrl)
    }

    const isSensitiveAdminRoute =
        pathname.startsWith('/admin/materials') ||
        pathname.startsWith('/admin/zones') ||
        pathname.startsWith('/admin/settings')
    if (isSensitiveAdminRoute) {
        // First, allow via metadata/email override
        if (!isRoleAllowed(userRole, ALLOWED_MATERIALS_ROLES, userEmail)) {
            // Fallback: fetch role from profiles table to avoid false negatives
            if (user) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    const dbRole = (profile as { role?: string } | null)?.role ?? null
                    if (!isRoleAllowed(dbRole, ALLOWED_MATERIALS_ROLES, userEmail)) {
                        const leadsUrl = request.nextUrl.clone()
                        leadsUrl.pathname = '/admin/leads'
                        return NextResponse.redirect(leadsUrl)
                    }
                } catch {
                    const leadsUrl = request.nextUrl.clone()
                    leadsUrl.pathname = '/admin/leads'
                    return NextResponse.redirect(leadsUrl)
                }
            } else {
                const leadsUrl = request.nextUrl.clone()
                leadsUrl.pathname = '/admin/leads'
                return NextResponse.redirect(leadsUrl)
            }
        }
    }

    if (isLoginPage && isAuthenticated) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = '/admin'
        return NextResponse.redirect(dashboardUrl)
    }

    return supabaseResponse
}

export const config = {
    runtime: 'nodejs',
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|@vite|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2)$).*)',
    ],
}
