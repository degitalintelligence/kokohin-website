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
  return createProjectWithEstimationWithRpc(
    async (fn, args) => await supabase.rpc(fn, args),
    dto
  )
}
