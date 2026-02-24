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
      .from('erp_projects')
      .select('id', { head: true, count: 'exact' })
      .eq('phone', normalizedPhone)
      .gt('created_at', sinceIso)
    if ((count ?? 0) >= maxPerWindow) {
      throw new Error('Terlalu banyak permintaan. Coba lagi beberapa saat.')
    }
  }
  dto.phone = normalizedPhone
  try {
    const result = await createProjectWithEstimationWithRpc(
      async (fn, args) => await supabase.rpc(fn, args),
      dto
    )
    if (result.estimation_id && dto.estimation && dto.catalog_id) {
      const desc = dto.catalog_title ? `Pembuatan ${dto.catalog_title}` : 'Pekerjaan Paket Katalog'
      const itemPayload = {
        estimation_id: result.estimation_id,
        catalog_id: dto.catalog_id,
        material_id: null,
        description: desc,
        qty_needed: dto.calculated_qty ?? 0,
        qty_charged: dto.calculated_qty ?? 0,
        unit: dto.catalog_unit ?? null,
        subtotal: (dto.calculated_qty ?? 0) * (dto.base_price ?? 0)
      }
      const { error: itemsErr } = await supabase.from('estimation_items').insert([itemPayload])
      if (itemsErr) {
        console.warn('Failed to insert estimation item:', itemsErr.message)
      }
      if (!itemsErr) {
        let totalHpp = 0
        try {
          const { data: cat } = await supabase.from('catalogs').select('*').eq('id', dto.catalog_id).maybeSingle()
          const unitHpp = Number((cat as Record<string, unknown> | null)?.hpp_per_unit || 0)
          const qty = Number(dto.calculated_qty || 0)
          if (unitHpp > 0 && qty > 0) {
            totalHpp = unitHpp * qty
          }
        } catch {
          totalHpp = 0
        }
        if (!(totalHpp > 0)) {
          const selling = Number(dto.estimation.total_selling_price || 0)
          totalHpp = Math.max(1, Math.round(selling * 0.7))
        }
        const selling = Number(dto.estimation.total_selling_price || 0)
        const marginPct = selling > 0 ? Math.max(0, Math.min(100, ((selling - totalHpp) / selling) * 100)) : 0
        const { error: estUpdErr } = await supabase
          .from('estimations')
          .update({
            total_hpp: totalHpp,
            margin_percentage: marginPct,
            total_selling_price: dto.estimation.total_selling_price
          })
          .eq('id', result.estimation_id)
        if (estUpdErr) {
          console.warn('Failed to sync estimation totals:', estUpdErr.message)
        }
      }
    }
    return result
  } catch (e) {
    const msg = (e as Error)?.message ?? ''
    const notFound =
      msg.includes('Could not find the function') ||
      msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      msg.includes('rpc') && msg.includes('not found')

    if (!notFound) {
      throw e
    }

    // Fallback path: create rows manually without RPC
    const { data: project, error: insertProjectError } = await supabase
      .from('erp_projects')
      .insert({
        customer_name: dto.customer_name,
        phone: dto.phone,
        address: dto.address,
        zone_id: dto.zone_id,
        custom_notes: dto.custom_notes,
        status: dto.status ?? 'New',
      })
      .select('id')
      .single()

    if (insertProjectError || !project?.id) {
      const reason = insertProjectError?.message ?? 'Unknown error'
      throw new Error(`Gagal membuat proyek: ${reason}`)
    }

    let estimationId: string | null = null
    if (dto.estimation) {
      // Determine next version number
      const { data: latest, error: fetchErr } = await supabase
        .from('estimations')
        .select('version_number')
        .eq('project_id', project.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchErr) {
        throw new Error(`Gagal membaca versi estimasi: ${fetchErr.message}`)
      }
      const nextVersion = (latest?.version_number ?? 0) + 1

      const { data: est, error: insertEstErr } = await supabase
        .from('estimations')
        .insert({
          project_id: project.id,
          version_number: nextVersion,
          total_hpp: dto.estimation.total_hpp,
          margin_percentage: dto.estimation.margin_percentage,
          total_selling_price: dto.estimation.total_selling_price,
          status: dto.estimation.status,
        })
        .select('id')
        .single()

      if (insertEstErr) {
        throw new Error(`Gagal membuat estimasi: ${insertEstErr.message}`)
      }
      estimationId = est?.id ?? null
    }

    if (estimationId && dto.estimation && dto.catalog_id) {
      const desc = dto.catalog_title ? `Pembuatan ${dto.catalog_title}` : 'Pekerjaan Paket Katalog'
      const itemPayload = {
        estimation_id: estimationId,
        catalog_id: dto.catalog_id,
        material_id: null,
        description: desc,
        qty_needed: dto.calculated_qty ?? 0,
        qty_charged: dto.calculated_qty ?? 0,
        unit: dto.catalog_unit ?? null,
        subtotal: (dto.calculated_qty ?? 0) * (dto.base_price ?? 0)
      }
      const { error: itemsErr } = await supabase.from('estimation_items').insert([itemPayload])
      if (itemsErr) {
        throw new Error('Gagal menyimpan detail paket katalog')
      }
      let totalHpp = 0
      try {
        const { data: cat } = await supabase.from('catalogs').select('*').eq('id', dto.catalog_id).maybeSingle()
        const unitHpp = Number((cat as Record<string, unknown> | null)?.hpp_per_unit || 0)
        const qty = Number(dto.calculated_qty || 0)
        if (unitHpp > 0 && qty > 0) {
          totalHpp = unitHpp * qty
        }
      } catch {
        totalHpp = 0
      }
      if (!(totalHpp > 0)) {
        const selling = Number(dto.estimation.total_selling_price || 0)
        totalHpp = Math.max(1, Math.round(selling * 0.7))
      }
      const selling = Number(dto.estimation.total_selling_price || 0)
      const marginPct = selling > 0 ? Math.max(0, Math.min(100, ((selling - totalHpp) / selling) * 100)) : 0
      const { error: estUpdErr } = await supabase
        .from('estimations')
        .update({
          total_hpp: totalHpp,
          margin_percentage: marginPct,
          total_selling_price: dto.estimation.total_selling_price
        })
        .eq('id', estimationId)
      if (estUpdErr) {
        throw new Error('Gagal sinkronisasi total estimasi')
      }
    }

    return { project_id: project.id, estimation_id: estimationId }
  }
}
