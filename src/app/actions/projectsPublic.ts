'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRoleAllowed, ALLOWED_ADMIN_ROLES } from '@/lib/rbac'
import { createServiceClient } from './users'

async function hasIsPublicColumn(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .select('is_public', { head: true, count: 'exact' })
    return !error
  } catch {
    return false
  }
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_ADMIN_ROLES, user.email)) {
    redirect('/admin')
  }
  return supabase
}

export async function addProjectPublic(formData: FormData) {
  const supabase = await assertAdmin()
  const canUseIsPublic = await hasIsPublicColumn(supabase)
  const title = String(formData.get('title') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim() || null
  const yearRaw = String(formData.get('year') ?? '').trim()
  const year = yearRaw ? Number(yearRaw) : null
  const featured = String(formData.get('featured') ?? '') === 'on'
  const is_public = String(formData.get('is_public') ?? '') === 'on'
  const service_id = String(formData.get('service_id') ?? '').trim() || null
  if (!title) {
    redirect('/admin/gallery?error=Judul%20wajib%20diisi')
  }
  const payload: Record<string, unknown> = { title, location, featured }
  if (canUseIsPublic) payload.is_public = is_public
  if (service_id) payload.service_id = service_id
  if (year !== null && !Number.isNaN(year)) payload.year = year
  const { error } = await supabase.from('projects').insert(payload).select().single()
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery?success=Proyek%20ditambahkan')
}

export async function updateProjectPublic(formData: FormData) {
  const supabase = await assertAdmin()
  const canUseIsPublic = await hasIsPublicColumn(supabase)
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim() || null
  const yearRaw = String(formData.get('year') ?? '').trim()
  const year = yearRaw ? Number(yearRaw) : null
  const featured = String(formData.get('featured') ?? '') === 'on'
  const is_public = String(formData.get('is_public') ?? '') === 'on'
  const service_id = String(formData.get('service_id') ?? '').trim() || null
  if (!id || !title) {
    redirect('/admin/gallery?error=ID%20dan%20judul%20wajib')
  }
  const payload: Record<string, unknown> = { title, location, featured }
  if (canUseIsPublic) payload.is_public = is_public
  if (service_id) payload.service_id = service_id
  if (year !== null && !Number.isNaN(year)) payload.year = year
  const { error } = await supabase.from('projects').update(payload).eq('id', id)
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery?success=Proyek%20diperbarui')
}

export async function deleteProjectPublic(formData: FormData) {
  const supabase = await assertAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) {
    redirect('/admin/gallery?error=ID%20tidak%20valid')
  }
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery?success=Proyek%20dihapus')
}

export async function togglePublish(formData: FormData) {
  const supabase = await assertAdmin()
  const canUseIsPublic = await hasIsPublicColumn(supabase)
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') === 'true'
  if (!id) {
    redirect('/admin/gallery?error=ID%20tidak%20valid')
  }
  if (!canUseIsPublic) {
    redirect('/admin/gallery?error=Kolom%20is_public%20tidak%20tersedia.%20Tambahkan%20kolom%20atau%20abaikan%20fitur%20Publish.')
  }
  const { error } = await supabase.from('projects').update({ is_public: next }).eq('id', id)
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery')
}

export async function toggleFeatured(formData: FormData) {
  const supabase = await assertAdmin()
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') === 'true'
  if (!id) {
    redirect('/admin/gallery?error=ID%20tidak%20valid')
  }
  const { error } = await supabase.from('projects').update({ featured: next }).eq('id', id)
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery')
}

export async function importFromErp() {
  await assertAdmin()
  const supabase = await createClient()
  const canUseIsPublic = await hasIsPublicColumn(supabase)
  type CurProject = {
    id: string | number
    customer_name: string | null
    address: string | null
    created_at: string | null
    status: string | null
    service_id?: string | null
    lead?: { service_id: string | null } | null
  }
  let rows: CurProject[] | null = null
  const leadsMap: Record<string, { service_id: string | null }> = {}

  // Attempt A: fetch with lead_id
  const { data: erp, error: erpErr } = await supabase
    .from('erp_projects')
    .select('id, customer_name, address, created_at, status, lead_id')
    .limit(100)
  if (!erpErr && Array.isArray(erp) && erp.length) {
    const leadIds = Array.from(new Set(erp.map(p => p.lead_id).filter((v): v is string | number => v !== null && v !== undefined))).map(String)
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, service_id')
        .in('id', leadIds)
      if (Array.isArray(leads)) {
        leads.forEach(l => { leadsMap[String(l.id)] = { service_id: l.service_id ?? null } })
      }
    }
    rows = erp.map(p => ({
      id: p.id,
      customer_name: p.customer_name,
      address: p.address,
      created_at: p.created_at,
      status: p.status,
      service_id: leadsMap[String(p.lead_id)]?.service_id ?? null
    }))
  }

  // Attempt B: if A failed or empty, fetch without lead_id (RLS-safe), import with null service_id
  if (!rows || rows.length === 0) {
    const { data: erpNoLead, error: erpErrNoLead } = await supabase
      .from('erp_projects')
      .select('id, customer_name, address, created_at, status')
      .limit(100)
    if (!erpErrNoLead && Array.isArray(erpNoLead) && erpNoLead.length) {
      rows = erpNoLead.map(p => ({
        id: p.id,
        customer_name: p.customer_name,
        address: p.address,
        created_at: p.created_at,
        status: p.status,
        service_id: null
      }))
    }
  }

  if (!rows || rows.length === 0) {
    try {
      const admin = await createServiceClient()
      const { data } = await admin
        .from('erp_projects')
        .select(`
          id,
          customer_name,
          address,
          created_at,
          status,
          lead:lead_id(
            service_id
          )
        `)
        .limit(100)
      rows = Array.isArray(data) ? (data as unknown as CurProject[]).map((p) => ({
        id: p.id,
        customer_name: p.customer_name,
        address: p.address,
        created_at: p.created_at,
        status: p.status,
        service_id: p?.lead?.service_id ?? null
      })) : null
    } catch {
      rows = null
    }
  }

  if (!rows || rows.length === 0) {
    redirect('/admin/gallery?error=Tidak%20ada%20data%20ERP%20untuk%20diimpor')
  }

  const inserts = rows.map((p) => {
    const base: Record<string, unknown> = {
      title: p.customer_name || 'Proyek',
      location: p.address || null,
      year: p.created_at ? new Date(p.created_at).getUTCFullYear() : null,
      featured: p.status === 'Deal',
      service_id: p?.service_id ?? null,
      created_at: p.created_at || new Date().toISOString()
    }
    if (canUseIsPublic) base.is_public = true
    return base
  })
  const { error } = await supabase.from('projects').insert(inserts)
  if (error) {
    redirect(`/admin/gallery?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/galeri')
  revalidatePath('/admin/gallery')
  redirect('/admin/gallery?success=Impor%20ERP%20berhasil')
}
