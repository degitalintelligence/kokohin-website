'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProject(formData: FormData) {
  const supabase = await createClient()

  // 1. Extract Basic Info
  const customerName = formData.get('customer_name') as string
  const customerPhone = formData.get('customer_phone') as string
  const address = formData.get('address') as string
  const zoneId = formData.get('zone_id') as string
  const notes = formData.get('notes') as string

  // 2. Extract Dimensions & Catalog (to be stored in custom_notes for now)
  const length = formData.get('length') as string
  const width = formData.get('width') as string
  const height = formData.get('height') as string
  const catalogId = formData.get('catalog_id') as string

  // Validation
  if (!customerName || !address || !zoneId) {
    return redirect('/admin/projects/new?error=Nama,%20alamat,%20dan%20zona%20wajib%20diisi')
  }

  // Format Custom Notes
  // Combine user notes with technical specs
  let formattedNotes = notes ? `${notes}\n\n` : ''
  formattedNotes += `--- Spesifikasi Awal ---\n`
  formattedNotes += `Dimensi: P ${length || '-'}m x L ${width || '-'}m`
  if (height) formattedNotes += ` x T ${height}m`
  formattedNotes += `\n`
  
  if (catalogId) {
    // Fetch catalog name if possible, or just store ID for reference
    formattedNotes += `Katalog ID: ${catalogId}\n`
  }

  const payload = {
    customer_name: customerName,
    phone: customerPhone,
    address: address,
    zone_id: zoneId,
    custom_notes: formattedNotes,
    status: 'New'
  }

  const { error } = await supabase
    .from('erp_projects')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return redirect(`/admin/projects/new?error=Gagal%20menyimpan%20proyek:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/projects')
  revalidatePath('/admin/leads')
  
  // Redirect to project detail or list
  redirect('/admin/projects')
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get('id') as string
  const customerName = formData.get('customer_name') as string
  const customerPhone = formData.get('customer_phone') as string
  const address = formData.get('address') as string
  const zoneId = formData.get('zone_id') as string
  const status = formData.get('status') as string
  const customNotes = formData.get('custom_notes') as string

  if (!id || !customerName || !address || !zoneId) {
    return redirect(`/admin/projects/${id}/edit?error=Nama,%20alamat,%20dan%20zona%20wajib%20diisi`)
  }

  const payload = {
    customer_name: customerName,
    phone: customerPhone,
    address: address,
    zone_id: zoneId,
    status: status,
    custom_notes: customNotes
  }

  const { error } = await supabase
    .from('erp_projects')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('Error updating project:', error)
    return redirect(`/admin/projects/${id}/edit?error=Gagal%20mengupdate%20proyek:%20${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${id}`)
  
  redirect('/admin/projects')
}
