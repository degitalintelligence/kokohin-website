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
  const category = formData.get('category') as string
  const basePriceStr = formData.get('base_price_per_m2') as string
  const basePriceUnit = ((formData.get('base_price_unit') as string) || 'm2') as 'm2' | 'm1' | 'unit'
  const atapId = (formData.get('atap_id') as string) || ''
  const rangkaId = (formData.get('rangka_id') as string) || ''
  const addonsJson = (formData.get('addons_json') as string) || '[]'
  const imageFile = formData.get('image_file') as File
  const isActive = formData.get('is_active') === 'on'
  const laborCostStr = (formData.get('labor_cost') as string) || '0'
  const transportCostStr = (formData.get('transport_cost') as string) || '0'
  const marginPercentageStr = (formData.get('margin_percentage') as string) || '0'

  if (!title || !basePriceStr) {
    return redirect('/admin/catalogs/new?error=Nama%20paket%20dan%20harga%20dasar%20wajib%20diisi')
  }

  const basePrice = parseFloat(basePriceStr)
  if (isNaN(basePrice)) {
    return redirect('/admin/catalogs/new?error=Harga%20harus%20berupa%20angka')
  }
  const laborCost = parseFloat(laborCostStr) || 0
  const transportCost = parseFloat(transportCostStr) || 0
  const marginPercentage = Math.max(0, Math.min(100, parseFloat(marginPercentageStr) || 0))
  if (category === 'kanopi' && !atapId) {
    return redirect('/admin/catalogs/new?error=Kategori%20Kanopi%20wajib%20memilih%20Material%20Atap')
  }
  const allowedUnits = new Set(['m2', 'm1', 'unit'])
  const safeUnit = allowedUnits.has(basePriceUnit) ? basePriceUnit : 'm2'

  let addons: Array<{ id?: string; material_id: string; basis?: 'm2'|'m1'|'unit'; qty_per_basis?: number; is_optional: boolean }> = []
  try {
    addons = JSON.parse(addonsJson) ?? []
  } catch {
    addons = []
  }

  const imageUrl = await uploadImage(imageFile, supabase)

  const payload = {
    title,
    category,
    base_price_per_m2: basePrice,
    base_price_unit: safeUnit,
    labor_cost: laborCost,
    transport_cost: transportCost,
    margin_percentage: marginPercentage,
    atap_id: atapId || null,
    rangka_id: rangkaId || null,
    image_url: imageUrl || null,
    is_active: isActive,
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('catalogs')
    .insert(payload)
    .select('id')
    .single()

  if (insertErr || !inserted) {
    const msg = insertErr?.message ?? 'Unknown error'
    return redirect(`/admin/catalogs/new?error=Gagal%20menyimpan%20katalog:%20${encodeURIComponent(msg)}`)
  }

  const catalogId = inserted.id as string

  if (addons.length > 0) {
    const rows = addons
      .filter((a) => a.material_id)
      .map((a) => ({
        catalog_id: catalogId,
        material_id: a.material_id,
        basis: (a.basis === 'm1' || a.basis === 'unit') ? a.basis : 'm2',
        qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
        is_optional: !!a.is_optional,
      }))
    const { error: addErr } = await supabase.from('catalog_addons').insert(rows)
    if (addErr) {
      return redirect(`/admin/catalogs/new?error=Katalog%20tersimpan%2C%20namun%20gagal%20menyimpan%20addons:%20${encodeURIComponent(addErr.message)}`)
    }
  }

  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/kalkulator')
  revalidatePath('/katalog')
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
  const category = formData.get('category') as string
  const basePriceStr = formData.get('base_price_per_m2') as string
  const basePriceUnit = ((formData.get('base_price_unit') as string) || 'm2') as 'm2' | 'm1' | 'unit'
  const atapId = (formData.get('atap_id') as string) || ''
  const rangkaId = (formData.get('rangka_id') as string) || ''
  const addonsJson = (formData.get('addons_json') as string) || '[]'
  const imageFile = formData.get('image_file') as File
  const currentImageUrl = (formData.get('current_image_url') as string) || ''
  const isActive = formData.get('is_active') === 'on'
  const laborCostStr = (formData.get('labor_cost') as string) || '0'
  const transportCostStr = (formData.get('transport_cost') as string) || '0'
  const marginPercentageStr = (formData.get('margin_percentage') as string) || '0'

  if (!id) {
    return redirect('/admin/catalogs?error=ID%20katalog%20tidak%20valid')
  }

  if (!title || !basePriceStr) {
    return redirect(`/admin/catalogs/${id}?error=Nama%20paket%20dan%20harga%20dasar%20wajib%20diisi`)
  }

  const basePrice = parseFloat(basePriceStr)
  if (isNaN(basePrice)) {
    return redirect(`/admin/catalogs/${id}?error=Harga%20harus%20berupa%20angka`)
  }
  const laborCost = parseFloat(laborCostStr) || 0
  const transportCost = parseFloat(transportCostStr) || 0
  const marginPercentage = Math.max(0, Math.min(100, parseFloat(marginPercentageStr) || 0))
  if (category === 'kanopi' && !atapId) {
    return redirect(`/admin/catalogs/${id}?error=Kategori%20Kanopi%20wajib%20memilih%20Material%20Atap`)
  }
  const allowedUnits = new Set(['m2', 'm1', 'unit'])
  const safeUnit = allowedUnits.has(basePriceUnit) ? basePriceUnit : 'm2'

  let addons: Array<{ id?: string; material_id: string; basis?: 'm2'|'m1'|'unit'; qty_per_basis?: number; is_optional: boolean }> = []
  try {
    addons = JSON.parse(addonsJson) ?? []
  } catch {
    addons = []
  }

  let imageUrl = currentImageUrl
  const newImageUrl = await uploadImage(imageFile, supabase)
  if (newImageUrl) {
    imageUrl = newImageUrl
  }

  const payload = {
    title,
    category,
    base_price_per_m2: basePrice,
    base_price_unit: safeUnit,
    labor_cost: laborCost,
    transport_cost: transportCost,
    margin_percentage: marginPercentage,
    atap_id: atapId || null,
    rangka_id: rangkaId || null,
    image_url: imageUrl || null,
    is_active: isActive,
  }

  const { error: updErr } = await supabase.from('catalogs').update(payload).eq('id', id)
  if (updErr) {
    return redirect(`/admin/catalogs/${id}?error=Gagal%20mengupdate%20katalog:%20${encodeURIComponent(updErr.message)}`)
  }

  // Sync addons
  const { data: existingAddons } = await supabase
    .from('catalog_addons')
    .select('id')
    .eq('catalog_id', id)

  const existingIds = new Set((existingAddons ?? []).map((x: { id: string }) => x.id))
  const providedIds = new Set(addons.filter((a) => a.id).map((a) => a.id as string))

  // Delete removed
  const toDelete = [...existingIds].filter((eid) => !providedIds.has(eid))
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('catalog_addons').delete().in('id', toDelete)
    if (delErr) {
      return redirect(`/admin/catalogs/${id}?error=Gagal%20menghapus%20addon:%20${encodeURIComponent(delErr.message)}`)
    }
  }

  // Upsert existing
  const toUpdate = addons.filter((a) => a.id)
  for (const a of toUpdate) {
    const { error: uErr } = await supabase
      .from('catalog_addons')
      .update({
        material_id: a.material_id,
        basis: (a.basis === 'm1' || a.basis === 'unit') ? a.basis : 'm2',
        qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
        is_optional: !!a.is_optional,
      })
      .eq('id', a.id as string)
    if (uErr) {
      return redirect(`/admin/catalogs/${id}?error=Gagal%20mengupdate%20addon:%20${encodeURIComponent(uErr.message)}`)
    }
  }

  // Insert new
  const toInsert = addons.filter((a) => !a.id)
  if (toInsert.length > 0) {
    const rows = toInsert.map((a) => ({
      catalog_id: id,
      material_id: a.material_id,
      basis: (a.basis === 'm1' || a.basis === 'unit') ? a.basis : 'm2',
      qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0,
      is_optional: !!a.is_optional,
    }))
    const { error: insErr } = await supabase.from('catalog_addons').insert(rows)
    if (insErr) {
      return redirect(`/admin/catalogs/${id}?error=Gagal%20menambah%20addon:%20${encodeURIComponent(insErr.message)}`)
    }
  }

  revalidatePath('/admin/catalogs')
  revalidatePath(`/admin/catalogs/${id}`)
  revalidatePath('/kalkulator')
  revalidatePath('/katalog')
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

export async function importCatalogAddons(formData: FormData) {
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

  const catalogId = (formData.get('catalog_id') as string) || ''
  const modeRaw = ((formData.get('mode') as string) || 'replace').toLowerCase()
  type Mode = 'replace' | 'append' | 'upsert'
  const mode: Mode = ((['replace','append','upsert'] as const).includes(modeRaw as Mode) ? (modeRaw as Mode) : 'replace')
  const previewRaw = ((formData.get('preview') as string) || '').toLowerCase()
  const preview = ['1', 'true', 'on', 'yes', 'y', 'ya'].includes(previewRaw)
  const file = formData.get('file') as File
  if (!catalogId) {
    return redirect('/admin/catalogs?error=ID%20katalog%20tidak%20valid')
  }
  if (!file || file.size === 0) {
    return redirect(`/admin/catalogs/${catalogId}?error=Berkas%20CSV%20tidak%20ditemukan`)
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) {
    return redirect(`/admin/catalogs/${catalogId}?error=CSV%20kosong%20atau%20header%20saja`)
  }
  const splitCsv = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = !inQ
        }
      } else if (ch === ',' && !inQ) {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
  const header = splitCsv(lines[0]).map(h => h.toLowerCase())
  const idxMaterial = header.indexOf('material_id')
  const idxBasis = header.indexOf('basis')
  const idxQty = header.indexOf('qty_per_basis')
  const idxOptional = header.indexOf('is_optional')
  if (idxMaterial === -1 || idxBasis === -1 || idxQty === -1 || idxOptional === -1) {
    return redirect(`/admin/catalogs/${catalogId}?error=Header%20CSV%20tidak%20sesuai`)
  }
  const allowedBasis = new Set(['m2', 'm1', 'unit'])
  const rows: Array<{ line: number; catalog_id: string; material_id: string; basis: 'm2'|'m1'|'unit'; qty_per_basis: number; is_optional: boolean }> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i])
    if (cols.length === 0) continue
    const materialId = (cols[idxMaterial] || '').trim()
    const basisRaw = (cols[idxBasis] || '').trim().toLowerCase()
    const qtyRaw = (cols[idxQty] || '').trim()
    const optRaw = (cols[idxOptional] || '').trim().toLowerCase()
    if (!materialId) continue
    const basis = allowedBasis.has(basisRaw) ? (basisRaw as 'm2'|'m1'|'unit') : 'm2'
    const qty = Math.max(0, parseFloat(qtyRaw || '0') || 0)
    const isOptional = ['true', '1', 'yes', 'y', 'ya'].includes(optRaw)
    rows.push({
      line: i + 1,
      catalog_id: catalogId,
      material_id: materialId,
      basis,
      qty_per_basis: qty,
      is_optional: isOptional,
    })
  }

  const matIds = Array.from(new Set(rows.map(r => r.material_id)))
  const { data: mats } = await supabase.from('materials').select('id').in('id', matIds)
  const validMat = new Set((mats ?? []).map((m: { id: string }) => m.id))

  let inserted = 0
  let updated = 0
  let failed = 0
  const details: string[] = []
  const detailsAll: string[] = []

  if (preview) {
    if (mode === 'upsert') {
      const { data: existing } = await supabase
        .from('catalog_addons')
        .select('material_id,basis')
        .eq('catalog_id', catalogId)
      const keys = new Set((existing ?? []).map((e: { material_id: string; basis: 'm2'|'m1'|'unit' }) => `${e.material_id}|${e.basis}`))
      for (const r of rows) {
        if (!validMat.has(r.material_id)) {
          failed++
          const msg = `baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`
          if (details.length < 10) details.push(msg)
          detailsAll.push(msg)
          continue
        }
        const key = `${r.material_id}|${r.basis}`
        if (keys.has(key)) {
          updated++
        } else {
          inserted++
        }
      }
    } else if (mode === 'append') {
      for (const r of rows) {
        if (!validMat.has(r.material_id)) {
          failed++
          const msg = `baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`
          if (details.length < 10) details.push(msg)
          detailsAll.push(msg)
        } else {
          inserted++
        }
      }
    } else {
      for (const r of rows) {
        if (!validMat.has(r.material_id)) {
          failed++
          const msg = `baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`
          if (details.length < 10) details.push(msg)
          detailsAll.push(msg)
        } else {
          inserted++
        }
      }
    }
    const msg = `Preview (mode=${mode}): akan tambah ${inserted}, update ${updated}, gagal ${failed}`
    const detailStr = details.join('|')
    let detailUrl = ''
    if (detailsAll.length > details.length) {
      const content = JSON.stringify({ mode, inserted, updated, failed, errors: detailsAll }, null, 2)
      try {
        const blob = new Blob([content], { type: 'application/json' })
        const filePath = `logs/import_addons_${catalogId}_${Date.now()}.json`
        const { error: upErr } = await supabase.storage.from('images').upload(filePath, blob, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
          detailUrl = publicUrl
        }
      } catch {}
    }
    return redirect(`/admin/catalogs/${catalogId}?import=${encodeURIComponent(msg)}&import_detail=${encodeURIComponent(detailStr)}${detailUrl ? `&import_detail_url=${encodeURIComponent(detailUrl)}` : ''}`)
  }

  if (mode === 'replace') {
    const { error: delErr } = await supabase.from('catalog_addons').delete().eq('catalog_id', catalogId)
    if (delErr) {
      return redirect(`/admin/catalogs/${catalogId}?error=Gagal%20membersihkan%20addons:%20${encodeURIComponent(delErr.message)}`)
    }
    for (const r of rows) {
      if (!validMat.has(r.material_id)) {
        failed++
        if (details.length < 10) details.push(`baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`)
        continue
        }
      const { error: insErr } = await supabase.from('catalog_addons').insert({
        catalog_id: r.catalog_id,
        material_id: r.material_id,
        basis: r.basis,
        qty_per_basis: r.qty_per_basis,
        is_optional: r.is_optional,
      })
      if (insErr) {
        failed++
        const msg = `baris ${r.line}: ${insErr.message}`
        if (details.length < 10) details.push(msg)
        detailsAll.push(msg)
      } else {
        inserted++
      }
    }
  } else if (mode === 'append') {
    for (const r of rows) {
      if (!validMat.has(r.material_id)) {
        failed++
        const msg = `baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`
        if (details.length < 10) details.push(msg)
        detailsAll.push(msg)
        continue
      }
      const { error: insErr } = await supabase.from('catalog_addons').insert({
        catalog_id: r.catalog_id,
        material_id: r.material_id,
        basis: r.basis,
        qty_per_basis: r.qty_per_basis,
        is_optional: r.is_optional,
      })
      if (insErr) {
        failed++
        const msg = `baris ${r.line}: ${insErr.message}`
        if (details.length < 10) details.push(msg)
        detailsAll.push(msg)
      } else {
        inserted++
      }
    }
  } else {
    const { data: existing } = await supabase
      .from('catalog_addons')
      .select('id, material_id, basis')
      .eq('catalog_id', catalogId)
    const keyToId = new Map<string, string>()
    for (const e of existing ?? []) {
      keyToId.set(`${e.material_id}|${e.basis}`, e.id as unknown as string)
    }
    for (const r of rows) {
      if (!validMat.has(r.material_id)) {
        failed++
        const msg = `baris ${r.line}: MATERIAL_TIDAK_DITEMUKAN ${r.material_id}`
        if (details.length < 10) details.push(msg)
        detailsAll.push(msg)
        continue
      }
      const key = `${r.material_id}|${r.basis}`
      const existingId = keyToId.get(key)
      if (existingId) {
        const { error: uErr } = await supabase
          .from('catalog_addons')
          .update({
            qty_per_basis: r.qty_per_basis,
            is_optional: r.is_optional,
          })
          .eq('id', existingId)
        if (uErr) {
          failed++
          const msg = `baris ${r.line}: ${uErr.message}`
          if (details.length < 10) details.push(msg)
          detailsAll.push(msg)
        } else {
          updated++
        }
      } else {
        const { error: insErr } = await supabase.from('catalog_addons').insert({
          catalog_id: r.catalog_id,
          material_id: r.material_id,
          basis: r.basis,
          qty_per_basis: r.qty_per_basis,
          is_optional: r.is_optional,
        })
        if (insErr) {
          failed++
          const msg = `baris ${r.line}: ${insErr.message}`
          if (details.length < 10) details.push(msg)
          detailsAll.push(msg)
        } else {
          inserted++
        }
      }
    }
  }

  revalidatePath('/admin/catalogs')
  revalidatePath(`/admin/catalogs/${catalogId}`)
  revalidatePath('/kalkulator')
  revalidatePath('/katalog')
  const msg = `Import selesai (mode=${mode}): ditambah ${inserted}, diperbarui ${updated}, gagal ${failed}`
  const detailStr = details.join('|')
  let detailUrl = ''
  if (detailsAll.length > details.length) {
    const content = JSON.stringify({ mode, inserted, updated, failed, errors: detailsAll }, null, 2)
    try {
      const blob = new Blob([content], { type: 'application/json' })
      const filePath = `logs/import_addons_${catalogId}_${Date.now()}.json`
      const { error: upErr } = await supabase.storage.from('images').upload(filePath, blob, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
        detailUrl = publicUrl
      }
    } catch {}
  }
  redirect(`/admin/catalogs/${catalogId}?import=${encodeURIComponent(msg)}&import_detail=${encodeURIComponent(detailStr)}${detailUrl ? `&import_detail_url=${encodeURIComponent(detailUrl)}` : ''}`)
}
