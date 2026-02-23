import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createSupabaseAdminClient(supabaseUrl, serviceKey)
    : await createClient()

  if (id) {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,unit,base_price_per_unit,length_per_unit,is_laser_cut,requires_sealant,is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || (data as { is_active?: boolean }).is_active === false) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const row = data as {
      id: string
      name: string
      unit: string
      base_price_per_unit: number
      length_per_unit: number | null
      is_laser_cut: boolean | null
      requires_sealant: boolean | null
    }
    return NextResponse.json({
      material: {
        id: row.id,
        name: row.name,
        unit: row.unit,
        base_price_per_unit: row.base_price_per_unit,
        length_per_unit: row.length_per_unit,
        is_laser_cut: row.is_laser_cut ?? false,
        requires_sealant: row.requires_sealant ?? false
      }
    })
  }

  if (search) {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,base_price_per_unit')
      .ilike('name', `%${search}%`)
      .order('name')
      .limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!row) return NextResponse.json({ material: null })
    return NextResponse.json({ material: { id: row.id, name: row.name, base_price_per_unit: row.base_price_per_unit } })
  }

  if (category) {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,unit')
      .eq('category', category)
      .eq('is_active', true)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ materials: data ?? [] })
  }

  return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
}
