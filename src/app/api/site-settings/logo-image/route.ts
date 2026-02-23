'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizeLogoUrl(raw: string | null): string | null {
  if (!raw) return null
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || siteBase
  let value = String(raw).trim()
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
    return new NextResponse('Failed to read logo setting', { status: 500 })
  }
  const url = normalizeLogoUrl((data as { value?: string } | null)?.value ?? null)
  if (!url) {
    return new NextResponse('Logo not set', { status: 404 })
  }
  try {
    const upstream = await fetch(url)
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Upstream fetch failed', { status: 502 })
    }
    const ct = upstream.headers.get('content-type') || 'image/png'
    const cache = upstream.headers.get('cache-control') || 'public, max-age=3600'
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': cache,
      },
    })
  } catch {
    return new NextResponse('Upstream error', { status: 502 })
  }
}

