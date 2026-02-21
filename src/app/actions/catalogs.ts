'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'

async function uploadImage(file: File, supabase: SupabaseClient) {
  if (!file || file.size === 0) return null

  // Create unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `catalogs/${fileName}`

  // Upload to Supabase Storage 'images' bucket (public)
  // Assuming 'images' bucket exists and is public
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading image:', uploadError)
    // Don't throw, just return null so we can proceed without image
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(filePath)

  return publicUrl
}

export async function createCatalog(formData: FormData) {
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
    return redirect('/admin/leads')
  }

  const title = formData.get('title') as string
  const basePriceStr = formData.get('base_price_per_m2') as string
  const atapId = formData.get('atap_id') as string
  const rangkaId = formData.get('rangka_id') as string
  const imageFile = formData.get('image_file') as File
  const isActive = formData.get('is_active') === 'on'

  if (!title || !basePriceStr) {
    return redirect('/admin/catalogs/new?error=Nama%20paket%20dan%20harga%20per%20m²%20wajib%20diisi')
  }

  const basePrice = parseFloat(basePriceStr)
  if (isNaN(basePrice)) {
    return redirect('/admin/catalogs/new?error=Harga%20harus%20berupa%20angka')
  }

  // Handle image upload
  const imageUrl = await uploadImage(imageFile, supabase)

  const payload = {
    title,
    base_price_per_m2: basePrice,
    atap_id: atapId || null,
    rangka_id: rangkaId || null,
    image_url: imageUrl || null,
    is_active: isActive
  }

  const { error } = await supabase.from('catalogs').insert(payload)

  if (error) {
    console.error('Error creating catalog:', error)
    return redirect(`/admin/catalogs/new?error=Gagal%20menyimpan%20katalog:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/catalogs')
  redirect('/admin/catalogs')
}

export async function updateCatalog(formData: FormData) {
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
    return redirect('/admin/leads')
  }

  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const basePriceStr = formData.get('base_price_per_m2') as string
  const atapId = formData.get('atap_id') as string
  const rangkaId = formData.get('rangka_id') as string
  const imageFile = formData.get('image_file') as File
  const currentImageUrl = formData.get('current_image_url') as string
  const isActive = formData.get('is_active') === 'on'

  if (!id) {
    return redirect('/admin/catalogs?error=ID%20katalog%20tidak%20valid')
  }

  if (!title || !basePriceStr) {
    return redirect(`/admin/catalogs/${id}?error=Nama%20paket%20dan%20harga%20per%20m²%20wajib%20diisi`)
  }

  const basePrice = parseFloat(basePriceStr)
  if (isNaN(basePrice)) {
    return redirect(`/admin/catalogs/${id}?error=Harga%20harus%20berupa%20angka`)
  }

  // Handle image upload
  let imageUrl = currentImageUrl
  const newImageUrl = await uploadImage(imageFile, supabase)
  if (newImageUrl) {
    imageUrl = newImageUrl
  }

  const payload = {
    title,
    base_price_per_m2: basePrice,
    atap_id: atapId || null,
    rangka_id: rangkaId || null,
    image_url: imageUrl || null,
    is_active: isActive
  }

  const { error } = await supabase.from('catalogs').update(payload).eq('id', id)

  if (error) {
    console.error('Error updating catalog:', error)
    return redirect(`/admin/catalogs/${id}?error=Gagal%20mengupdate%20katalog:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/catalogs')
  redirect('/admin/catalogs')
}

export async function deleteCatalog(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
    return redirect('/admin/leads')
  }

  if (!id) {
    return redirect('/admin/catalogs?error=ID%20katalog%20tidak%20valid')
  }

  const { error } = await supabase.from('catalogs').delete().eq('id', id)

  if (error) {
    console.error('Error deleting catalog:', error)
    return redirect(`/admin/catalogs?error=Gagal%20menghapus%20katalog:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/catalogs')
  redirect('/admin/catalogs')
}
