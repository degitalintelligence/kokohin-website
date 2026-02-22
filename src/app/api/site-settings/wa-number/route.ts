'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isRoleAllowed, ALLOWED_MATERIALS_ROLES } from '@/lib/rbac'

function normalizeIndoPhone(input: string): string {
  const digits = input.replace(/\D+/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'wa_number')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const value = (data as { value?: string } | null)?.value ?? null
  return NextResponse.json({ wa_number: value })
}

export async function PATCH(request: Request) {
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = typeof body === 'object' && body !== null && 'value' in body
    ? String((body as { value: unknown }).value ?? '').trim()
    : ''
  if (!raw) return NextResponse.json({ error: 'Empty value' }, { status: 400 })
  const normalized = normalizeIndoPhone(raw)

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'wa_number', value: normalized })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ wa_number: normalized })
}
