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

export async function updateHppPerUnit(catalogId: string, userId?: string) {
  const supabase = await createClient()

  // 1. Fetch components and catalog settings
  const { data: catalog, error: catalogError } = await supabase
    .from('catalogs')
    .select('use_std_calculation, std_calculation, labor_cost, transport_cost, atap_id, rangka_id, finishing_id, isian_id')
    .eq('id', catalogId)
    .single()

  if (catalogError || !catalog) {
    console.error(`[HPP Update] Error fetching catalog ${catalogId}:`, catalogError)
    return
  }

  const { data: hppComponents, error: fetchError } = await supabase
    .from('catalog_hpp_components')
    .select('quantity, material_id')
    .eq('catalog_id', catalogId)

  if (fetchError) {
    console.error(`[HPP Update] Error fetching HPP components for catalog ${catalogId}:`, fetchError)
    return
  }

  // 2. Get unique material IDs from both HPP components AND main fields
  const hppMaterialIds = (hppComponents ?? []).map(c => c.material_id).filter(Boolean)
  const mainMaterialIds = [
    catalog.atap_id, 
    catalog.rangka_id, 
    catalog.finishing_id, 
    catalog.isian_id
  ].filter(Boolean) as string[]

  const materialIds = [...new Set([...hppMaterialIds, ...mainMaterialIds])]
  
  if (materialIds.length === 0) {
    await supabase.from('catalogs').update({ hpp_per_unit: 0 }).eq('id', catalogId)
    return
  }

  // 3. Fetch materials
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('id, base_price_per_unit')
    .in('id', materialIds)

  if (materialsError) {
    console.error(`[HPP Update] Error fetching materials for HPP calculation for catalog ${catalogId}:`, materialsError)
    return
  }

  // 4. Create price map
  const priceMap = new Map((materials ?? []).map(m => [m.id, m.base_price_per_unit]))

  // 5. Calculate total HPP (Total Cost)
  // Calculate from HPP components table
  const hppComponentsCost = (hppComponents ?? []).reduce((sum, component) => {
    const quantity = Number(component.quantity || 0)
    const price = Number(priceMap.get(component.material_id) || 0)
    return sum + (quantity * price)
  }, 0)

  // Calculate from main fields (1 unit each if not already in HPP table)
  // To avoid double counting, only add if NOT in hppComponents
  const hppMaterialSet = new Set(hppMaterialIds)
  const mainFieldsCost = mainMaterialIds.reduce((sum, mId) => {
    if (hppMaterialSet.has(mId)) return sum
    const price = Number(priceMap.get(mId) || 0)
    return sum + (1 * price) // Default 1 unit for main material
  }, 0)

  const totalMaterialCost = hppComponentsCost + mainFieldsCost

  const laborCost = Number((catalog as any).labor_cost || 0)
  const transportCost = Number((catalog as any).transport_cost || 0)
  const totalCost = totalMaterialCost + laborCost + transportCost

  // 6. Calculate HPP per unit/m2 based on use_std_calculation flag
  let finalHppPerUnit = totalCost
  if (catalog.use_std_calculation && catalog.std_calculation && catalog.std_calculation > 0) {
    finalHppPerUnit = totalCost / catalog.std_calculation
  }

  // 7. Update catalog
  const { error: updateError } = await supabase
    .from('catalogs')
    .update({ hpp_per_unit: Math.round(finalHppPerUnit) })
    .eq('id', catalogId)

  if (updateError) {
    console.error(`[HPP Update] Error updating HPP for catalog ${catalogId}:`, updateError)
  }

  // 8. Log the HPP update if audit is needed (log even if not using std_calculation for full history)
  await supabase.from('catalog_hpp_log').insert({
    catalog_id: catalogId,
    atap_id: catalog.atap_id || null,
    rangka_id: catalog.rangka_id || null,
    finishing_id: catalog.finishing_id || null,
    isian_id: catalog.isian_id || null,
    hpp_per_m2: Math.round(finalHppPerUnit),
    total_cost: Math.round(totalCost),
    calc_by: userId || null
  })
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
    return redirect('/admin/leads')
  }

  const title = formData.get('title') as string
  const category = formData.get('category') as string
  const basePriceStr = formData.get('base_price_per_m2') as string
  const basePriceUnit = ((formData.get('base_price_unit') as string) || 'm2') as 'm2' | 'm1' | 'unit'
  const atapId = (formData.get('atap_id') as string) || ''
  const rangkaId = (formData.get('rangka_id') as string) || ''
  const finishingId = (formData.get('finishing_id') as string) || ''
  const isianId = (formData.get('isian_id') as string) || ''
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
  
  // Mandatory Components Validation
  if (category === 'kanopi') {
    if (!atapId) return redirect('/admin/catalogs/new?error=Kategori%20Kanopi%20wajib%20memilih%20Material%20Atap')
    if (!rangkaId) return redirect('/admin/catalogs/new?error=Kategori%20Kanopi%20wajib%20memilih%20Material%20Rangka')
    if (!finishingId) return redirect('/admin/catalogs/new?error=Kategori%20Kanopi%20wajib%20memilih%20Jenis%20Finishing')
  }
  if (category === 'pagar' || category === 'railing') {
    if (!rangkaId) return redirect('/admin/catalogs/new?error=Kategori%20Pagar/Railing%20wajib%20memilih%20Material%20Rangka')
    if (!isianId) return redirect('/admin/catalogs/new?error=Kategori%20Pagar/Railing%20wajib%20memilih%20Material%20Isian')
    if (!finishingId) return redirect('/admin/catalogs/new?error=Kategori%20Pagar/Railing%20wajib%20memilih%20Jenis%20Finishing')
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
    finishing_id: finishingId || null,
    isian_id: isianId || null,
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

  try { await updateHppPerUnit(catalogId, user.id) } catch {}

  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/kalkulator')
  revalidatePath('/katalog')
  redirect('/admin/catalogs?notice=created')
}

export async function updateCatalog(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  try {
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

    if (!id) {
      throw new Error('ID katalog tidak valid')
    }

    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const basePriceStr = formData.get('base_price_per_m2') as string
    const basePriceUnit = ((formData.get('base_price_unit') as string) || 'm2') as 'm2' | 'm1' | 'unit'
    const atapId = (formData.get('atap_id') as string) || ''
    const rangkaId = (formData.get('rangka_id') as string) || ''
    const finishingId = (formData.get('finishing_id') as string) || ''
    const isianId = (formData.get('isian_id') as string) || ''
    const addonsJson = (formData.get('addons_json') as string) || '[]'
    const hppComponentsJson = (formData.get('hpp_components_json') as string) || '[]'
    const imageFile = formData.get('image_file') as File
    const currentImageUrl = (formData.get('current_image_url') as string) || ''
    const isActive = formData.get('is_active') === 'on'
    const marginPercentageStr = (formData.get('margin_percentage') as string) || '0'
    const useStdCalculation = formData.get('use_std_calculation') === 'on'
    const stdCalculationStr = (formData.get('std_calculation') as string) || '1'

    if (!title || !basePriceStr) {
      throw new Error('Nama paket dan harga dasar wajib diisi')
    }

    const basePrice = parseFloat(basePriceStr)
    if (isNaN(basePrice)) {
      throw new Error('Harga harus berupa angka')
    }
    const marginPercentage = Math.max(0, Math.min(100, parseFloat(marginPercentageStr) || 0))
    const stdCalculation = Math.max(0.01, parseFloat(stdCalculationStr) || 1)
    const laborCostStr = formData.get('labor_cost') as string
    const transportCostStr = formData.get('transport_cost') as string
    const laborCost = laborCostStr ? parseFloat(laborCostStr) : 0
    const transportCost = transportCostStr ? parseFloat(transportCostStr) : 0

    if (category === 'kanopi') {
      if (!atapId) throw new Error('Kategori Kanopi wajib memilih Material Atap')
      if (!rangkaId) throw new Error('Kategori Kanopi wajib memilih Material Rangka')
      if (!finishingId) throw new Error('Kategori Kanopi wajib memilih Jenis Finishing')
    }
    if (category === 'pagar' || category === 'railing') {
      if (!rangkaId) throw new Error('Kategori Pagar/Railing wajib memilih Material Rangka')
      if (!isianId) throw new Error('Kategori Pagar/Railing wajib memilih Material Isian')
      if (!finishingId) throw new Error('Kategori Pagar/Railing wajib memilih Jenis Finishing')
    }

    const allowedUnits = new Set(['m2', 'm1', 'unit'])
    const safeUnit = allowedUnits.has(basePriceUnit) ? basePriceUnit : 'm2'

    const addons: Array<{ id?: string; material_id: string; basis?: 'm2'|'m1'|'unit'; qty_per_basis?: number; is_optional: boolean }> = JSON.parse(addonsJson) ?? []
    const hppComponents: Array<{ id?: string; material_id: string; quantity: number; section?: string }> = JSON.parse(hppComponentsJson) ?? []

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
      margin_percentage: marginPercentage,
      std_calculation: stdCalculation,
      use_std_calculation: useStdCalculation,
      labor_cost: laborCost,
      transport_cost: transportCost,
      atap_id: atapId || null,
      rangka_id: rangkaId || null,
      finishing_id: finishingId || null,
      isian_id: isianId || null,
      image_url: imageUrl || null,
      is_active: isActive,
    }

    const { error: updErr } = await supabase.from('catalogs').update(payload).eq('id', id)
    if (updErr) {
      throw new Error(`Gagal mengupdate katalog: ${updErr.message}`)
    }

    // Sync HPP Components
    const { data: existingHppComponents } = await supabase.from('catalog_hpp_components').select('id').eq('catalog_id', id)
    const existingHppIds = new Set((existingHppComponents ?? []).map((x: { id: string }) => x.id))
    const providedHppIds = new Set(hppComponents.filter((c) => c.id).map((c) => c.id as string))

    const hppToDelete = [...existingHppIds].filter((eid) => !providedHppIds.has(eid))
    if (hppToDelete.length > 0) {
      const { error: delErr } = await supabase.from('catalog_hpp_components').delete().in('id', hppToDelete)
      if (delErr) throw new Error(`Gagal menghapus komponen HPP: ${delErr.message}`)
    }

    for (const c of hppComponents.filter((c) => c.id)) {
      const { error: uErr } = await supabase.from('catalog_hpp_components').update({ material_id: c.material_id, quantity: typeof c.quantity === 'number' ? c.quantity : 0, section: c.section || 'lainnya' }).eq('id', c.id as string)
      if (uErr) throw new Error(`Gagal mengupdate komponen HPP: ${uErr.message}`)
    }

    const hppToInsert = hppComponents.filter((c) => !c.id && c.material_id)
    if (hppToInsert.length > 0) {
      const rows = hppToInsert.map((c) => ({ catalog_id: id, material_id: c.material_id, quantity: Number(c.quantity) > 0 ? Number(c.quantity) : 1, section: c.section || 'lainnya' }))
      const { error: insErr } = await supabase.from('catalog_hpp_components').insert(rows)
      if (insErr) throw new Error(`Gagal menambah komponen HPP: ${insErr.message}`)
    }

    // Sync addons
    const { data: existingAddons } = await supabase.from('catalog_addons').select('id').eq('catalog_id', id)
    const existingIds = new Set((existingAddons ?? []).map((x: { id: string }) => x.id))
    const providedIds = new Set(addons.filter((a) => a.id).map((a) => a.id as string))

    const toDelete = [...existingIds].filter((eid) => !providedIds.has(eid))
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('catalog_addons').delete().in('id', toDelete)
      if (delErr) throw new Error(`Gagal menghapus addon: ${delErr.message}`)
    }

    for (const a of addons.filter((a) => a.id)) {
      const { error: uErr } = await supabase.from('catalog_addons').update({ material_id: a.material_id, basis: (a.basis === 'm1' || a.basis === 'unit') ? a.basis : 'm2', qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0, is_optional: !!a.is_optional }).eq('id', a.id as string)
      if (uErr) throw new Error(`Gagal mengupdate addon: ${uErr.message}`)
    }

    const toInsert = addons.filter((a) => !a.id)
    if (toInsert.length > 0) {
      const rows = toInsert.map((a) => ({ catalog_id: id, material_id: a.material_id, basis: (a.basis === 'm1' || a.basis === 'unit') ? a.basis : 'm2', qty_per_basis: typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0, is_optional: !!a.is_optional }))
      const { error: insErr } = await supabase.from('catalog_addons').insert(rows)
      if (insErr) throw new Error(`Gagal menambah addon: ${insErr.message}`)
    }

    await updateHppPerUnit(id, user.id)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error(`[FATAL] Error in updateCatalog for ID ${id}:`, error)
    const redirectUrl = id ? `/admin/catalogs/${id}` : '/admin/catalogs'
    return redirect(`${redirectUrl}?error=${encodeURIComponent(errorMessage)}`)
  }

  revalidatePath('/admin/catalogs')
  revalidatePath(`/admin/catalogs/${id}`)
  revalidatePath('/kalkulator')
  revalidatePath('/katalog')
  redirect('/admin/catalogs?notice=updated')
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
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
  redirect('/admin/catalogs?notice=deleted')
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
  if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, user.email)) {
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

  try { await updateHppPerUnit(catalogId, user.id) } catch {}

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

export async function searchCatalogs(query: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('catalogs')
    .select('id, title, base_price_per_m2, base_price_unit, image_url')
    .ilike('title', `%${query}%`)
    .eq('is_active', true)
    .limit(10)

  if (error) {
    console.error('Error searching catalogs:', error)
    return []
  }

  return data || []
}
