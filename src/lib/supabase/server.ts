import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
}

export async function isDevBypass() {
    const cookieStore = await cookies()
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    const hasBypassCookie = cookieStore.get('dev-bypass')?.value === '1'
    return isDevMode && hasBypassCookie
}
