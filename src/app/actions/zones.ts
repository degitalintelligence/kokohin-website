'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'

export async function createZone(formData: FormData) {
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

  const name = formData.get('name') as string
  const citiesStr = formData.get('cities') as string
  const markupPercentageStr = formData.get('markup_percentage') as string
  const flatFeeStr = formData.get('flat_fee') as string
  const description = formData.get('description') as string
  const isActive = formData.get('is_active') === 'on'
  const orderIndexStr = formData.get('order_index') as string

  if (!name) {
    return redirect('/admin/zones/new?error=Nama%20zona%20wajib%20diisi')
  }

  const markupPercentage = parseFloat(markupPercentageStr || '0')
  const flatFee = parseFloat(flatFeeStr || '0')
  const orderIndex = parseInt(orderIndexStr || '0')
  const cities = citiesStr ? citiesStr.split(',').map(c => c.trim()).filter(c => c.length > 0) : []

  const payload = {
    name,
    cities,
    markup_percentage: markupPercentage,
    flat_fee: flatFee,
    description,
    is_active: isActive,
    order_index: orderIndex
  }

  const { error } = await supabase.from('zones').insert(payload)

  if (error) {
    console.error('Error creating zone:', error)
    return redirect(`/admin/zones/new?error=Gagal%20menyimpan%20zona:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/zones')
  redirect('/admin/zones?notice=created')
}

export async function updateZone(formData: FormData) {
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
  const name = formData.get('name') as string
  const citiesStr = formData.get('cities') as string
  const markupPercentageStr = formData.get('markup_percentage') as string
  const flatFeeStr = formData.get('flat_fee') as string
  const description = formData.get('description') as string
  const isActive = formData.get('is_active') === 'on'
  const orderIndexStr = formData.get('order_index') as string

  if (!id) {
    return redirect('/admin/zones?error=ID%20zona%20tidak%20valid')
  }

  if (!name) {
    return redirect(`/admin/zones/${id}?error=Nama%20zona%20wajib%20diisi`)
  }

  const markupPercentage = parseFloat(markupPercentageStr || '0')
  const flatFee = parseFloat(flatFeeStr || '0')
  const orderIndex = parseInt(orderIndexStr || '0')
  const cities = citiesStr ? citiesStr.split(',').map(c => c.trim()).filter(c => c.length > 0) : []

  const payload = {
    name,
    cities,
    markup_percentage: markupPercentage,
    flat_fee: flatFee,
    description,
    is_active: isActive,
    order_index: orderIndex,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from('zones').update(payload).eq('id', id)

  if (error) {
    console.error('Error updating zone:', error)
    return redirect(`/admin/zones/${id}?error=Gagal%20mengupdate%20zona:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/zones')
  redirect('/admin/zones?notice=updated')
}

export async function deleteZone(id: string) {
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

  const { error } = await supabase.from('zones').delete().eq('id', id)

  if (error) {
    console.error('Error deleting zone:', error)
    throw new Error(`Gagal menghapus zona: ${error.message}`)
  }

  revalidatePath('/admin/zones')
}
