import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'

export async function GET(
  request: Request,
  context: { params: Promise<{ catalogId: string }> }
) {
  const { catalogId } = await context.params
  const supabase = await createClient()

  try {
    const { data: catalog, error: catalogError } = await supabase
      .from('catalogs')
      .select(
        '*, atap_material:materials!catalogs_atap_id_fkey(*), finishing_material:materials!catalogs_finishing_id_fkey(*), isian_material:materials!catalogs_isian_id_fkey(*), rangka_material:materials!catalogs_rangka_id_fkey(*)'
      )
      .eq('id', catalogId)
      .single()

    if (catalogError) {
      console.error('Error fetching catalog:', catalogError)
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch catalog', 500, catalogError.message)
    }

    if (!catalog) {
      return errorResponse('NOT_FOUND', 'Catalog not found', 404)
    }

    const { data: addons, error: addonsError } = await supabase
      .from('catalog_addons')
      .select('*, materials(*)')
      .eq('catalog_id', catalogId)

    if (addonsError) {
      console.error('Error fetching catalog addons:', addonsError)
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch catalog addons', 500, addonsError.message)
    }

    return NextResponse.json({ catalog, addons })
  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse('INTERNAL_ERROR', 'Failed to process request', 500, message)
  }
}
