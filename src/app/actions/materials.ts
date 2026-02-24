'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/admin/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
    return redirect('/admin/leads')
  }

  const code = formData.get('code') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const unit = formData.get('unit') as string
  const basePrice = Number(formData.get('base_price_per_unit'))
  const lengthPerUnitRaw = formData.get('length_per_unit')
  const lengthPerUnit = lengthPerUnitRaw ? Number(lengthPerUnitRaw) : null
  const isActive = formData.get('is_active') === 'on'
  const isLaserCut = formData.get('is_laser_cut') === 'on'
  const requiresSealant = formData.get('requires_sealant') === 'on'

  const { error } = await supabase
    .from('materials')
    .insert({
      code,
      name,
      category,
      unit,
      base_price_per_unit: basePrice,
      length_per_unit: lengthPerUnit,
      is_active: isActive,
      is_laser_cut: isLaserCut,
      requires_sealant: requiresSealant
    })

  if (error) {
    console.error('Error creating material:', error)
    return redirect(`/admin/materials/new?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
  redirect('/admin/materials')
}

export async function updateMaterial(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/admin/login')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
    return redirect('/admin/leads')
  }

  const id = formData.get('id') as string
  const code = formData.get('code') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const unit = formData.get('unit') as string
  const basePrice = Number(formData.get('base_price_per_unit'))
  const lengthPerUnitRaw = formData.get('length_per_unit')
  const lengthPerUnit = lengthPerUnitRaw ? Number(lengthPerUnitRaw) : null
  const isActive = formData.get('is_active') === 'on'
  const isLaserCut = formData.get('is_laser_cut') === 'on'
  const requiresSealant = formData.get('requires_sealant') === 'on'

  const { error } = await supabase
    .from('materials')
    .update({
      code,
      name,
      category,
      unit,
      base_price_per_unit: basePrice,
      length_per_unit: lengthPerUnit,
      is_active: isActive,
      is_laser_cut: isLaserCut,
      requires_sealant: requiresSealant
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating material:', error)
    return redirect(`/admin/materials/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/materials')
  revalidatePath(`/admin/materials/${id}`)
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
  redirect('/admin/materials')
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
    throw new Error('Forbidden')
  }

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
}
