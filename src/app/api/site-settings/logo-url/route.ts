'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizeLogoUrl(raw: string | null): string | null {
  if (!raw) return null
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || siteBase
  let value = raw.trim()
  try {
    const u = new URL(value, siteBase)
    if (u.pathname.startsWith('/_next/image') && u.searchParams.has('url')) {
      const inner = u.searchParams.get('url') || ''
      if (inner) value = decodeURIComponent(inner)
    }
  } catch {
    // ignore
  }
  try {
    // Jika value relatif (mis. "/storage/v1/object/public/..."), pastikan jadi absolute ke SUPABASE_URL
    const absolute = new URL(value, supabaseBase)
    return absolute.toString()
  } catch {
    return value
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'logo_url')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const value = (data as { value?: string } | null)?.value ?? null
  const normalized = normalizeLogoUrl(value)
  return NextResponse.json({ logo_url: normalized })
}
