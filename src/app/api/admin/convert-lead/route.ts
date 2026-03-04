import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createQuotationForLead } from '@/app/actions/quotations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { leadId?: string } | null
    const leadId = body?.leadId

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'leadId tidak valid' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Cek apakah lead sudah pernah dikonversi ke quotation
    const { data: existing } = await supabase
      .from('erp_quotations')
      .select('id')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({
        success: true,
        quotationId: existing.id,
        alreadyConverted: true,
      })
    }

    const { success, quotationId } = await createQuotationForLead(leadId)

    if (!success || !quotationId) {
      return NextResponse.json(
        { success: false, error: 'Gagal membuat quotation dari lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      quotationId,
      alreadyConverted: false,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Terjadi kesalahan internal saat mengkonversi lead'
    console.error('API /api/admin/convert-lead error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

