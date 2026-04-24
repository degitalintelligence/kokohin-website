import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  const supabase = await createClient()

  if (id) {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,unit,base_price_per_unit,length_per_unit,is_laser_cut,requires_sealant,is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) return errorResponse('INTERNAL_ERROR', 'Failed to fetch material', 500, error.message)
    if (!data || (data as { is_active?: boolean }).is_active === false) return errorResponse('NOT_FOUND', 'Not found', 404)
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
      .eq('is_active', true)
      .ilike('name', `%${search}%`)
      .order('name')
      .limit(20)
    if (error) return errorResponse('INTERNAL_ERROR', 'Failed to search material', 500, error.message)
    const candidates = Array.isArray(data) ? data : []
    if (candidates.length === 0) return NextResponse.json({ material: null })
    const candidateIds = candidates.map((row) => row.id)
    const { data: childRows } = await supabase
      .from('materials')
      .select('parent_material_id')
      .in('parent_material_id', candidateIds)
    const parentIdsWithChildren = new Set(
      (childRows ?? [])
        .map((row) => row.parent_material_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    )
    const row = candidates.find((candidate) => !parentIdsWithChildren.has(candidate.id)) ?? null
    if (!row) return NextResponse.json({ material: null })
    return NextResponse.json({
      material: { id: row.id, name: row.name, base_price_per_unit: row.base_price_per_unit },
    })
  }

  if (category) {
    const { data, error } = await supabase
      .from('materials')
      .select('id,name,unit')
      .eq('category', category)
      .eq('is_active', true)
      .order('name')
    if (error) return errorResponse('INTERNAL_ERROR', 'Failed to fetch materials by category', 500, error.message)
    const rows = data ?? []
    if (rows.length === 0) return NextResponse.json({ materials: [] })
    const ids = rows.map((row) => row.id)
    const { data: childRows } = await supabase
      .from('materials')
      .select('parent_material_id')
      .in('parent_material_id', ids)
    const parentIdsWithChildren = new Set(
      (childRows ?? [])
        .map((row) => row.parent_material_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    )
    const filtered = rows.filter((row) => !parentIdsWithChildren.has(row.id))
    return NextResponse.json({ materials: filtered })
  }

  return errorResponse('BAD_REQUEST', 'Bad Request', 400)
}
