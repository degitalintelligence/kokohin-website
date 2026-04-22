'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import { updateHppPerUnit } from './catalogs'

const resolveMaterialCategory = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryCode: string,
) => {
  const normalized = (categoryCode || '').trim()
  if (!normalized) return null as string | null

  const { data: category } = await supabase
    .from('material_categories')
    .select('code')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle()

  return category?.code ?? null
}

const validateParentMaterial = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentMaterialId: string | null,
  category: string,
) => {
  if (!parentMaterialId) {
    return { ok: true as const, error: null }
  }

  const { data: parent } = await supabase
    .from('materials')
    .select('id, category, parent_material_id')
    .eq('id', parentMaterialId)
    .maybeSingle()

  if (!parent) {
    return { ok: false as const, error: 'Parent material tidak ditemukan' }
  }
  if (parent.parent_material_id) {
    return { ok: false as const, error: 'Parent harus material utama, bukan varian' }
  }
  if (parent.category !== category) {
    return { ok: false as const, error: 'Kategori parent harus sama dengan kategori varian' }
  }

  return { ok: true as const, error: null }
}

const materialHasChildren = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  materialId: string,
) => {
  const { data } = await supabase
    .from('materials')
    .select('id')
    .eq('parent_material_id', materialId)
    .limit(1)
  return (data ?? []).length > 0
}

const buildMaterialCodePrefix = (category: string) => {
  const normalized = (category || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!normalized) return 'MAT'
  const parts = normalized.split('_').filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 3) || 'MAT'
  }
  const initials = parts.map((part) => part[0]).join('').slice(0, 4)
  return initials || normalized.slice(0, 3) || 'MAT'
}

const generateNextMaterialCode = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  category: string,
) => {
  const prefix = buildMaterialCodePrefix(category)
  const { data } = await supabase
    .from('materials')
    .select('code')
    .ilike('code', `${prefix}-%`)
    .limit(500)

  let maxSeq = 0
  const regex = new RegExp(`^${prefix}-(\\d+)$`)
  ;(data ?? []).forEach((row) => {
    const code = String(row.code ?? '')
    const match = code.match(regex)
    if (!match) return
    const seq = Number(match[1])
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  })

  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`
}

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

  const codeRaw = formData.get('code')
  const codeInput = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : ''
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const unit = formData.get('unit') as string
  const basePrice = Number(formData.get('base_price_per_unit'))
  const lengthPerUnitRaw = formData.get('length_per_unit')
  let lengthPerUnit = Number(lengthPerUnitRaw)
  if (!lengthPerUnitRaw || Number.isNaN(lengthPerUnit) || lengthPerUnit <= 0) {
    lengthPerUnit = 1
  }
  const isActive = formData.get('is_active') === 'on'
  const isLaserCut = formData.get('is_laser_cut') === 'on'
  const requiresSealant = formData.get('requires_sealant') === 'on'
  const parentMaterialIdRaw = formData.get('parent_material_id')
  const parentMaterialId = typeof parentMaterialIdRaw === 'string' && parentMaterialIdRaw.trim() !== '' ? parentMaterialIdRaw.trim() : null
  const variantNameRaw = formData.get('variant_name')
  const variantName = typeof variantNameRaw === 'string' && variantNameRaw.trim() !== '' ? variantNameRaw.trim() : 'Default'

  const validCategory = await resolveMaterialCategory(supabase, category)
  if (!validCategory) {
    return redirect('/admin/materials/new?error=' + encodeURIComponent('Kategori material tidak valid atau tidak aktif'))
  }
  const parentValidation = await validateParentMaterial(supabase, parentMaterialId, category)
  if (!parentValidation.ok) {
    return redirect('/admin/materials/new?error=' + encodeURIComponent(parentValidation.error || 'Parent varian tidak valid'))
  }

  let finalCode = codeInput
  let insertErrorMessage: string | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!finalCode) {
      finalCode = await generateNextMaterialCode(supabase, validCategory)
    }

    const { error } = await supabase
      .from('materials')
      .insert({
        code: finalCode,
        name,
        category,
        unit,
        base_price_per_unit: basePrice,
        length_per_unit: lengthPerUnit,
        is_active: isActive,
        is_laser_cut: isLaserCut,
        requires_sealant: requiresSealant,
        parent_material_id: parentMaterialId,
        variant_name: variantName,
      })

    if (!error) {
      insertErrorMessage = null
      break
    }

    insertErrorMessage = error.message
    if (error.code === '23505' && !codeInput) {
      finalCode = ''
      continue
    }
    break
  }

  if (insertErrorMessage) {
    console.error('Error creating material:', insertErrorMessage)
    return redirect(`/admin/materials/new?error=${encodeURIComponent(insertErrorMessage)}`)
  }

  // Business rule: jika parent punya child/varian, harga parent harus 0 agar tidak salah dipilih saat kalkulasi.
  if (parentMaterialId) {
    await supabase
      .from('materials')
      .update({ base_price_per_unit: 0, updated_at: new Date().toISOString() })
      .eq('id', parentMaterialId)
  }

  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
  redirect('/admin/materials?notice=created')
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
  let lengthPerUnit = Number(lengthPerUnitRaw)
  if (!lengthPerUnitRaw || Number.isNaN(lengthPerUnit) || lengthPerUnit <= 0) {
    lengthPerUnit = 1
  }
  const isActive = formData.get('is_active') === 'on'
  const isLaserCut = formData.get('is_laser_cut') === 'on'
  const requiresSealant = formData.get('requires_sealant') === 'on'
  const parentMaterialIdRaw = formData.get('parent_material_id')
  const parentMaterialId = typeof parentMaterialIdRaw === 'string' && parentMaterialIdRaw.trim() !== '' ? parentMaterialIdRaw.trim() : null
  const variantNameRaw = formData.get('variant_name')
  const variantName = typeof variantNameRaw === 'string' && variantNameRaw.trim() !== '' ? variantNameRaw.trim() : 'Default'

  const validCategory = await resolveMaterialCategory(supabase, category)
  if (!validCategory) {
    return redirect(`/admin/materials/${id}?error=${encodeURIComponent('Kategori material tidak valid atau tidak aktif')}`)
  }
  if (parentMaterialId && parentMaterialId === id) {
    return redirect(`/admin/materials/${id}?error=${encodeURIComponent('Parent varian tidak boleh material itu sendiri')}`)
  }
  const parentValidation = await validateParentMaterial(supabase, parentMaterialId, category)
  if (!parentValidation.ok) {
    return redirect(`/admin/materials/${id}?error=${encodeURIComponent(parentValidation.error || 'Parent varian tidak valid')}`)
  }

  const hasChildren = await materialHasChildren(supabase, id)
  if (hasChildren && basePrice > 0) {
    return redirect(
      `/admin/materials/${id}?error=${encodeURIComponent(
        'Material utama yang punya varian tidak boleh punya harga. Set ke 0.',
      )}`,
    )
  }

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
      requires_sealant: requiresSealant,
      parent_material_id: parentMaterialId,
      variant_name: variantName,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating material:', error)
    return redirect(`/admin/materials/${id}?error=${encodeURIComponent(error.message)}`)
  }

  if (parentMaterialId) {
    await supabase
      .from('materials')
      .update({ base_price_per_unit: 0, updated_at: new Date().toISOString() })
      .eq('id', parentMaterialId)
  }

  // Trigger HPP update for all catalogs using this material
  const { data: affectedCatalogs } = await supabase
    .from('catalog_hpp_components')
    .select('catalog_id')
    .eq('material_id', id)

  if (affectedCatalogs && affectedCatalogs.length > 0) {
    const catalogIds = [...new Set(affectedCatalogs.map(c => c.catalog_id))]
    for (const catalogId of catalogIds) {
      try {
        await updateHppPerUnit(catalogId, user.id)
      } catch (err) {
        console.error(`[Material Update] Failed to update HPP for catalog ${catalogId}:`, err)
      }
    }
  }

  revalidatePath('/admin/materials')
  revalidatePath(`/admin/materials/${id}`)
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
  redirect('/admin/materials?notice=updated')
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

export async function bulkDeleteMaterials(ids: string[]) {
  const supabase = await createClient()

  const normalizedIds = Array.from(
    new Set((ids ?? []).map((id) => String(id).trim()).filter((id) => id.length > 0)),
  )
  if (normalizedIds.length === 0) {
    throw new Error('Pilih minimal 1 material untuk dihapus')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const [hppRefs, addonRefs, estimationRefs, catalogRefs] = await Promise.all([
    supabase
      .from('catalog_hpp_components')
      .select('material_id')
      .in('material_id', normalizedIds),
    supabase
      .from('catalog_addons')
      .select('material_id')
      .in('material_id', normalizedIds),
    supabase
      .from('estimation_items')
      .select('material_id')
      .in('material_id', normalizedIds),
    supabase
      .from('catalogs')
      .select('id, atap_id, rangka_id, finishing_id, isian_id')
      .or(
        [
          `atap_id.in.(${normalizedIds.join(',')})`,
          `rangka_id.in.(${normalizedIds.join(',')})`,
          `finishing_id.in.(${normalizedIds.join(',')})`,
          `isian_id.in.(${normalizedIds.join(',')})`,
        ].join(','),
      ),
  ])

  const referencedIds = new Set<string>()
  ;(hppRefs.data ?? []).forEach((row) => {
    if (row.material_id) referencedIds.add(String(row.material_id))
  })
  ;(addonRefs.data ?? []).forEach((row) => {
    if (row.material_id) referencedIds.add(String(row.material_id))
  })
  ;(estimationRefs.data ?? []).forEach((row) => {
    if (row.material_id) referencedIds.add(String(row.material_id))
  })
  ;(catalogRefs.data ?? []).forEach((row) => {
    const refs = [row.atap_id, row.rangka_id, row.finishing_id, row.isian_id]
    refs.forEach((id) => {
      if (id) referencedIds.add(String(id))
    })
  })

  if (referencedIds.size > 0) {
    throw new Error(
      `Sebagian material tidak bisa dihapus karena masih dipakai (${referencedIds.size} material terhubung ke katalog/estimasi).`,
    )
  }

  const { error } = await supabase
    .from('materials')
    .delete()
    .in('id', normalizedIds)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')

  return { deletedCount: normalizedIds.length }
}

export async function bulkMoveMaterialsCategory(ids: string[], targetCategoryCode: string) {
  const supabase = await createClient()

  const normalizedIds = Array.from(
    new Set((ids ?? []).map((id) => String(id).trim()).filter((id) => id.length > 0)),
  )
  if (normalizedIds.length === 0) {
    throw new Error('Pilih minimal 1 material untuk dipindahkan')
  }

  const targetCategory = await resolveMaterialCategory(supabase, targetCategoryCode)
  if (!targetCategory) {
    throw new Error('Kategori tujuan tidak valid atau tidak aktif')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const { data: selectedRows, error: selectedErr } = await supabase
    .from('materials')
    .select('id, parent_material_id, category')
    .in('id', normalizedIds)

  if (selectedErr) {
    throw new Error(selectedErr.message)
  }
  if (!selectedRows || selectedRows.length === 0) {
    throw new Error('Material terpilih tidak ditemukan')
  }

  const parentIds = Array.from(
    new Set(
      selectedRows
        .map((row) => row.parent_material_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  )

  const [childRowsResult, parentRowsResult] = await Promise.all([
    supabase
      .from('materials')
      .select('id')
      .in('parent_material_id', normalizedIds),
    parentIds.length > 0
      ? supabase.from('materials').select('id').in('id', parentIds)
      : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
  ])

  if (childRowsResult.error) {
    throw new Error(childRowsResult.error.message)
  }
  if (parentRowsResult.error) {
    throw new Error(parentRowsResult.error.message)
  }

  const relatedIds = new Set(normalizedIds)
  ;(childRowsResult.data ?? []).forEach((row) => relatedIds.add(String(row.id)))
  ;(parentRowsResult.data ?? []).forEach((row) => relatedIds.add(String(row.id)))

  const idsToMove = Array.from(relatedIds)
  if (idsToMove.length === 0) {
    throw new Error('Tidak ada material yang bisa dipindahkan')
  }

  const { data: beforeMoveRows, error: beforeMoveErr } = await supabase
    .from('materials')
    .select('id, category')
    .in('id', idsToMove)
  if (beforeMoveErr) {
    throw new Error(beforeMoveErr.message)
  }

  const changedCount = (beforeMoveRows ?? []).filter((row) => row.category !== targetCategory).length
  const autoIncludedCount = Math.max(0, idsToMove.length - normalizedIds.length)

  if (changedCount > 0) {
    const { error: updateErr } = await supabase
      .from('materials')
      .update({ category: targetCategory, updated_at: new Date().toISOString() })
      .in('id', idsToMove)
    if (updateErr) {
      throw new Error(updateErr.message)
    }
  }

  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')

  return {
    movedCount: changedCount,
    relatedCount: idsToMove.length,
    autoIncludedCount,
    targetCategory,
  }
}
