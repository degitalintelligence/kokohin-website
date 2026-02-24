import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type RelName = { name: string | null } | null
type RawRel = { name: string | null } | { name: string | null }[] | null
type CatalogRow = {
  id: string
  title: string
  image_url: string | null
  category: 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya' | null
  atap_id: string | null
  rangka_id: string | null
  base_price_per_m2: number | null
  base_price_unit?: 'm2' | 'm1' | 'unit' | null
  atap?: RawRel
  rangka?: RawRel
  is_active?: boolean
  is_popular?: boolean | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createSupabaseAdminClient(supabaseUrl, serviceKey)
    : await createClient()

  const unwrapRel = (rel: RawRel): RelName => {
    if (!rel) return null
    return Array.isArray(rel) ? (rel[0] as RelName) : (rel as RelName)
  }

  if (id) {
    const { data, error } = await supabase
      .from('catalogs')
      .select('id, title, image_url, category, atap_id, rangka_id, base_price_per_m2, base_price_unit, atap:atap_id(name), rangka:rangka_id(name), is_active, is_popular')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || (data as CatalogRow).is_active === false) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const row = data as CatalogRow
    return NextResponse.json({
      catalog: {
        id: row.id,
        title: row.title,
        image_url: row.image_url,
        category: row.category,
        atap_id: row.atap_id,
        rangka_id: row.rangka_id,
        base_price_per_m2: row.base_price_per_m2,
        base_price_unit: row.base_price_unit ?? null,
        atap: unwrapRel(row.atap ?? null),
        rangka: unwrapRel(row.rangka ?? null),
        is_popular: !!row.is_popular
      }
    })
  }

  const popular = searchParams.get('popular')
  const limitRaw = searchParams.get('limit')
  const limitNum = (() => {
    const n = limitRaw ? Number(limitRaw) : NaN
    if (Number.isNaN(n) || n <= 0) return null
    return Math.min(Math.floor(n), 50)
  })()
  let query = supabase
    .from('catalogs')
    .select('id, title, image_url, category, atap_id, rangka_id, base_price_per_m2, base_price_unit, atap:atap_id(name), rangka:rangka_id(name), is_popular')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (popular && ['1', 'true', 'yes'].includes(popular.toLowerCase())) {
    query = query.eq('is_popular', true)
  }
  if (limitNum) {
    query = query.limit(limitNum)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data as CatalogRow[] ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    category: row.category,
    atap_id: row.atap_id,
    rangka_id: row.rangka_id,
    base_price_per_m2: row.base_price_per_m2,
    base_price_unit: row.base_price_unit ?? null,
    atap: unwrapRel(row.atap ?? null),
    rangka: unwrapRel(row.rangka ?? null),
    is_popular: !!row.is_popular
  }))
  return NextResponse.json({ catalogs: items })
}
