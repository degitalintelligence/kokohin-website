'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type CreateProjectDTO = {
  customer_name: string
  phone: string
  address: string
  zone_id: string | null
  custom_notes: string | null
  status: 'New' | 'Need Manual Quote'
  catalog_id?: string | null
  catalog_title?: string | null
  catalog_unit?: 'm2' | 'm1' | 'unit' | null
  base_price?: number | null
  calculated_qty?: number | null
  panjang?: number | null
  lebar?: number | null
  unit_qty?: number | null
  attachments?: { url: string; type: 'mockup' | 'reference' }[] | null
  estimation?: {
    total_hpp: number
    margin_percentage: number
    total_selling_price: number
    status: 'draft' | 'sent' | 'approved' | 'rejected'
  } | null
}

export type CreateProjectResult = {
  project_id: string
  estimation_id: string | null
}

export async function createProjectWithEstimationWithRpc(
  rpc: (fn: string, args: unknown) => unknown,
  dto: CreateProjectDTO
): Promise<CreateProjectResult> {
  const resp = await rpc('create_project_with_estimation', { dto }) as { data: unknown; error: { message: string; code?: string; details?: string } | null }
  const { data, error } = resp
  if (error) {
    const err = new Error(error.message) as Error & { code?: string; details?: string }
    if (error.code) err.code = error.code
    if (error.details) err.details = error.details
    throw err
  }
  const payload = data as Record<string, unknown> | null
  const project_id = payload && typeof payload.project_id === 'string' ? payload.project_id : null
  const estimation_id = payload && (typeof payload.estimation_id === 'string' || payload.estimation_id === null || payload.estimation_id === undefined)
    ? (payload.estimation_id as string | null | undefined) ?? null
    : null
  if (!project_id) throw new Error('Project creation failed')
  return { project_id, estimation_id }
}

export async function createProjectWithEstimation(dto: CreateProjectDTO): Promise<CreateProjectResult> {
  const supabase = await createClient()
  const hdrs = await headers()
  const ipRaw = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || ''
  const ip = ipRaw.split(',')[0]?.trim() || ''
  let blockedIpsStr = process.env.BLOCKED_IPS || ''
  let windowMin = Number(process.env.LEAD_RATE_LIMIT_WINDOW_MIN || '15')
  let maxPerWindow = Number(process.env.LEAD_RATE_LIMIT_MAX || '1')
  {
    const { data: sBlocked } = await supabase.from('site_settings').select('value').eq('key', 'blocked_ips').maybeSingle()
    if (sBlocked?.value) blockedIpsStr = String(sBlocked.value)
    const { data: sWin } = await supabase.from('site_settings').select('value').eq('key', 'lead_rate_limit_window_min').maybeSingle()
    if (sWin?.value && !isNaN(Number(sWin.value))) windowMin = Number(sWin.value)
    const { data: sMax } = await supabase.from('site_settings').select('value').eq('key', 'lead_rate_limit_max').maybeSingle()
    if (sMax?.value && !isNaN(Number(sMax.value))) maxPerWindow = Number(sMax.value)
  }
  if (ip) {
    const blocked = blockedIpsStr.split(',').map(s => s.trim()).filter(Boolean)
    if (blocked.includes(ip)) {
      throw new Error('Permintaan ditolak')
    }
  }
  const normalizedPhone = String(dto.phone || '').replace(/\s|-/g, '')
  const indoPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
  if (!indoPhoneRegex.test(normalizedPhone)) {
    throw new Error('Format nomor telepon tidak valid')
  }
  if (maxPerWindow > 0) {
    const sinceIso = new Date(Date.now() - windowMin * 60_000).toISOString()
    const { count } = await supabase
      .from('leads')
      .select('id', { head: true, count: 'exact' })
      .eq('phone', normalizedPhone)
      .gt('created_at', sinceIso)
    if ((count ?? 0) >= maxPerWindow) {
      throw new Error('Terlalu banyak permintaan. Coba lagi beberapa saat.')
    }
  }
  dto.phone = normalizedPhone
  const estimation = dto.estimation
  const payload = {
    name: dto.customer_name,
    phone: dto.phone,
    email: null,
    location: dto.address,
    service_id: null,
    message: dto.custom_notes,
    status: dto.status ?? 'New',
    total_hpp: estimation ? estimation.total_hpp : 0,
    margin_percentage: estimation ? estimation.margin_percentage : 0,
    total_selling_price: estimation ? estimation.total_selling_price : 0,
    catalog_id: dto.catalog_id ?? null,
    zone_id: dto.zone_id,
    panjang: dto.panjang ?? null,
    lebar: dto.lebar ?? null,
    unit_qty: dto.unit_qty ?? null,
    attachments: dto.attachments ?? [],
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(payload)
    .select('id')
    .single()

  if (insertError || !lead?.id) {
    const msg = insertError?.message ?? 'Unknown error'
    const maybeSchemaMismatch = msg.includes('column') && msg.includes('does not exist')
    if (!maybeSchemaMismatch) {
      throw new Error(`Gagal menyimpan lead: ${msg}`)
    }

    const fallbackPayload = {
      name: dto.customer_name,
      phone: dto.phone,
      email: null,
      location: dto.address,
      service_id: null,
      message: dto.custom_notes,
      status: dto.status ?? 'New',
    }
    const { data: leadFallback, error: fallbackErr } = await supabase
      .from('leads')
      .insert(fallbackPayload)
      .select('id')
      .single()
    if (fallbackErr || !leadFallback?.id) {
      const msg2 = fallbackErr?.message ?? 'Unknown error'
      throw new Error(`Gagal menyimpan lead: ${msg2}`)
    }
    return { project_id: leadFallback.id, estimation_id: null }
  }

  return { project_id: lead.id, estimation_id: null }
}
