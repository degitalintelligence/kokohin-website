import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { formatZoneName } from '@/lib/zone'
import { errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createSupabaseAdminClient(supabaseUrl, serviceKey)
    : await createClient()

  if (id) {
    const { data, error } = await supabase
      .from('zones')
      .select('id,name,markup_percentage,flat_fee,is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) return errorResponse('INTERNAL_ERROR', 'Failed to fetch zone', 500, error.message)
    if (!data || (data as { is_active?: boolean }).is_active === false) return errorResponse('NOT_FOUND', 'Not found', 404)
    const row = data as { id: string; name: string; markup_percentage: number | null; flat_fee: number | null }
    try {
      console.warn('[ZoneDebug]', {
        id: row.id,
        name: row.name,
        markup_raw: row.markup_percentage,
        flat_fee_raw: row.flat_fee,
      })
    } catch {}
    return NextResponse.json({
      zone: {
        id: row.id,
        name: formatZoneName(row.name),
        markup_percentage: Number(row.markup_percentage || 0),
        flat_fee: Number(row.flat_fee || 0)
      }
    })
  }

  const { data, error } = await supabase
    .from('zones')
    .select('id,name,markup_percentage,flat_fee')
    .eq('is_active', true)
    .order('name')
  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to fetch zones', 500, error.message)
  const rows = (data as Array<{ id: string; name: string; markup_percentage: number | null; flat_fee: number | null }> | null) ?? []
  return NextResponse.json({
    zones: rows.map((row) => ({
      id: row.id,
      name: formatZoneName(row.name),
      markup_percentage: Number(row.markup_percentage || 0),
      flat_fee: Number(row.flat_fee || 0)
    }))
  })
}
