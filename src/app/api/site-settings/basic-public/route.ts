'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('key,value')
    .in('key', ['site_name', 'contact_address', 'support_phone', 'support_email'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data as Array<{ key?: string; value?: string }> | null) ?? []
  const map: Record<string, string> = {}
  rows.forEach((row) => {
    if (row && row.key) map[row.key] = row.value ?? ''
  })

  return NextResponse.json({
    site_name: map['site_name'] ?? '',
    contact_address: map['contact_address'] ?? '',
    support_phone: map['support_phone'] ?? '',
    support_email: map['support_email'] ?? '',
  })
}

