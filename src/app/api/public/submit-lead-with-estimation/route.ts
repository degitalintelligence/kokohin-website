import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api-response'
import type { CalculatorInput, CalculatorResult, LeadInfo } from '@/lib/types'
import { createProjectWithEstimation } from '@/app/actions/createProjectWithEstimation'
import { createRateLimiter } from '@/lib/rate-limit'

type Payload = {
  leadInfo?: LeadInfo
  result?: CalculatorResult
  input?: CalculatorInput
  projectId?: string
  catalogTitle?: string | null
  customNotes?: string | null
}

export async function POST(request: Request) {
  try {
    const limiter = createRateLimiter({ windowSeconds: 3600, maxRequests: 5, prefix: 'submit-lead' })
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const allowed = await limiter.check(ip)
    if (!allowed) {
      return errorResponse('TOO_MANY_REQUESTS', 'Terlalu banyak permintaan dari IP ini, coba lagi nanti', 429)
    }

    const json = await request.json().catch(() => null) as Payload | null
    if (!json) {
      return errorResponse('BAD_REQUEST', 'Invalid request body', 400)
    }

    const { leadInfo, result, input } = json

    if (!leadInfo || !leadInfo.name || !leadInfo.whatsapp) {
      return errorResponse('BAD_REQUEST', 'Data kontak tidak lengkap', 400)
    }

    if (!result || result.estimatedPrice <= 0) {
      return errorResponse('BAD_REQUEST', 'Data estimasi tidak valid', 400)
    }

    if (!input) {
      return errorResponse('BAD_REQUEST', 'Data input kalkulator tidak tersedia', 400)
    }

    const isCustom = input.jenis === 'custom'

    const dto = {
      customer_name: leadInfo.name,
      phone: leadInfo.whatsapp,
      address: '',
      zone_id: input.zoneId ?? null,
      custom_notes: json.customNotes ?? null,
      status: isCustom ? 'Need Manual Quote' as const : 'New' as const,
      catalog_id: input.catalogId ?? null,
      catalog_title: json.catalogTitle ?? null,
      catalog_unit: result.unitUsed ?? 'm2',
      base_price: null,
      calculated_qty: result.computedQty ?? null,
      panjang: input.panjang ?? null,
      lebar: input.lebar ?? null,
      unit_qty: input.unitQty ?? null,
      attachments: null,
      estimation: isCustom
        ? null
        : {
            total_hpp: result.totalHpp,
            margin_percentage: result.marginPercentage,
            total_selling_price: result.estimatedPrice,
            status: 'draft' as const,
          },
    }

    const res = await createProjectWithEstimation(dto)

    return NextResponse.json({
      success: true,
      project_id: res.project_id,
      estimation_id: res.estimation_id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse('INTERNAL_ERROR', 'Gagal menyimpan lead dengan estimasi', 500, message)
  }
}
