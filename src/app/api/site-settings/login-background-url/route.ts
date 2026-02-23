'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function unwrapProxy(url: string | null): string | null {
  if (!url) return null
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const u = new URL(url, base)
    if (u.pathname.startsWith('/_next/image') && u.searchParams.has('url')) {
      const inner = u.searchParams.get('url') || ''
      if (inner) return decodeURIComponent(inner)
    }
    return url
  } catch {
    return url
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'login_background_url')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const value = (data as { value?: string } | null)?.value ?? null
  const normalized = unwrapProxy(value)
  return NextResponse.json({ login_background_url: normalized })
}
