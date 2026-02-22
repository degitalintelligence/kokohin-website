'use server'

import { createClient } from '@/lib/supabase/server'

export type CreateProjectDTO = {
  customer_name: string
  phone: string
  address: string
  zone_id: string | null
  custom_notes: string | null
  status: 'New' | 'Need Manual Quote'
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
  try {
    return await createProjectWithEstimationWithRpc(
      async (fn, args) => await supabase.rpc(fn, args),
      dto
    )
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

    return { project_id: project.id, estimation_id: estimationId }
  }
}
