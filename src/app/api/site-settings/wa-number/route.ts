'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'wa_number')
    .maybeSingle()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch wa number', 500, error.message)
  }

  const value = (data as { value?: string } | null)?.value ?? null
  return NextResponse.json({ wa_number: value })
}
