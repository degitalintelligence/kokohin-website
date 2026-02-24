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

type ZoneCsvRow = {
  id?: string
  name: string
  cities: string[] | null
  markup_percentage: number
  flat_fee: number
  description: string | null
  order_index: number | null
  is_active: boolean
}

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      current.push(field.trim())
      field = ''
      continue
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (field.length > 0 || current.length > 0) {
        current.push(field.trim())
        rows.push(current)
        current = []
        field = ''
      }
      continue
    }
    field += char
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim())
    rows.push(current)
  }
  return rows
}

export async function importZones(formData: FormData) {
  'use server'
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

  const file = formData.get('file')
  if (!(file instanceof File)) {
    throw new Error('Berkas CSV tidak ditemukan')
  }
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) {
    throw new Error('CSV kosong atau hanya berisi header')
  }
  const [header, ...dataRows] = rows
  const index = (key: string) => header.findIndex((h) => h.toLowerCase() === key)

  const withId: ZoneCsvRow[] = []
  const byName: ZoneCsvRow[] = []

  for (const row of dataRows) {
    const id = row[index('id')]?.trim()
    const name = row[index('name')]
    if (!name || name.trim() === '') continue
    const citiesRaw = row[index('cities')] || ''
    const markupRaw = row[index('markup_percentage')] || '0'
    const flatRaw = row[index('flat_fee')] || '0'
    const desc = row[index('description')] || ''
    const orderRaw = row[index('order_index')] || ''
    const activeRaw = row[index('is_active')] || 'true'

    const rec: ZoneCsvRow = {
      name: name.trim(),
      cities: citiesRaw ? citiesRaw.split(',').map(c => c.trim()).filter(Boolean) : null,
      markup_percentage: Number(markupRaw) || 0,
      flat_fee: Number(flatRaw) || 0,
      description: desc ? desc : null,
      order_index: orderRaw ? (Number(orderRaw) || null) : null,
      is_active: ['true', '1', 'yes', 'y', 'on'].includes(String(activeRaw).toLowerCase())
    }
    if (id) {
      withId.push({ ...rec, id })
    } else {
      byName.push(rec)
    }
  }

  if (withId.length > 0) {
    const { error } = await supabase.from('zones').upsert(
      withId.map((z) => ({ ...z, updated_at: new Date().toISOString() })),
      { onConflict: 'id' }
    )
    if (error) {
      console.error('Zones import (by id) error:', error)
      throw new Error(`Gagal import (ID): ${error.message}`)
    }
  }

  if (byName.length > 0) {
    const { error } = await supabase.from('zones').upsert(
      byName.map((z) => ({ ...z, updated_at: new Date().toISOString() })),
      { onConflict: 'name' }
    )
    if (error) {
      console.error('Zones import (by name) error:', error)
      throw new Error(`Gagal import (name): ${error.message}`)
    }
  }

  revalidatePath('/admin/zones')
  return 'ok'
}
