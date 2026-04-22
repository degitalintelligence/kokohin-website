'use server'

import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import { buildCopyCode, buildCopyName } from '@/lib/materialsCopyLogic'

type MaterialImportData = {
  id?: string
  code: string
  name: string
  category: string
  unit: string
  base_price_per_unit: number
  length_per_unit: number | null
  is_active: boolean
  is_laser_cut: boolean
  requires_sealant: boolean
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

export async function importMaterials(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) return
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  if (user && !bypass) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
      throw new Error('Hanya Super Admin yang boleh mengimport material')
    }
  }
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return
  const [header, ...dataRows] = rows
  const index = (key: string) => header.findIndex((h) => h.toLowerCase() === key)

  const payloadWithId: MaterialImportData[] = []
  const payloadWithoutId: MaterialImportData[] = []

  dataRows.forEach((row) => {
    const id = row[index('id')]
    const basePrice = row[index('base_price_per_unit')]
    const lengthPerUnit = row[index('length_per_unit')]
    const isActiveValue = row[index('is_active')]
    const isLaserCutValue = row[index('is_laser_cut')]
    const requiresSealantValue = row[index('requires_sealant')]

    const materialData = {
      code: row[index('code')],
      name: row[index('name')],
      category: row[index('category')],
      unit: row[index('unit')],
      base_price_per_unit: basePrice ? Number(basePrice) : 0,
      length_per_unit: (() => {
        const v = lengthPerUnit ? Number(lengthPerUnit) : 1
        return Number.isFinite(v) && v > 0 ? v : 1
      })(),
      is_active: isActiveValue
        ? ['true', '1', 'yes'].includes(String(isActiveValue).toLowerCase())
        : true,
      is_laser_cut: isLaserCutValue
        ? ['true', '1', 'yes'].includes(String(isLaserCutValue).toLowerCase())
        : false,
      requires_sealant: requiresSealantValue
        ? ['true', '1', 'yes'].includes(String(requiresSealantValue).toLowerCase())
        : false,
    }

    if (id && id.trim() !== '') {
      payloadWithId.push({ ...materialData, id: id.trim() })
    } else {
      payloadWithoutId.push(materialData)
    }
  })

  const importedCategories = Array.from(
    new Set(
      [...payloadWithId, ...payloadWithoutId]
        .map((item) => (item.category || '').trim())
        .filter((value) => value.length > 0),
    ),
  )

  if (importedCategories.length > 0) {
    const categoryPayload = importedCategories.map((code, index) => ({
      code,
      name: code.charAt(0).toUpperCase() + code.slice(1),
      sort_order: 200 + index,
      is_active: true,
    }))
    await supabase
      .from('material_categories')
      .upsert(categoryPayload, { onConflict: 'code' })
  }

  if (payloadWithId.length > 0) {
    const { error } = await supabase
      .from('materials')
      .upsert(payloadWithId, { onConflict: 'id' })
    if (error) {
      console.error('Error updating materials by ID:', error)
      throw new Error(`Update failed: ${error.message}`)
    }
  }

  if (payloadWithoutId.length > 0) {
    const { error } = await supabase
      .from('materials')
      .upsert(payloadWithoutId, { onConflict: 'code' })
    if (error) {
      console.error('Error importing materials by Code:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  revalidatePath('/admin/materials')
  return 'ok'
}

export async function copyMaterial(materialId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) {
    throw new Error('Sesi telah berakhir, silakan login kembali')
  }
  if (user && !bypass) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
      throw new Error('Anda tidak memiliki akses untuk menyalin material')
    }
  }

  if (!materialId) {
    throw new Error('ID material tidak valid')
  }

  const { data: original, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single()

  if (error || !original) {
    throw new Error('Material tidak ditemukan')
  }

  const baseName = (original as { name?: string }).name || ''
  const copyName = buildCopyName(baseName)

  const { data: existingCopy } = await supabase
    .from('materials')
    .select('id')
    .eq('name', copyName)
    .limit(1)

  if (existingCopy && existingCopy.length > 0) {
    throw new Error(
      'Salinan material sudah ada. Silakan gunakan atau ubah material hasil copy tersebut.',
    )
  }

  const baseCode = (original as { code?: string }).code || ''
  type CodeRow = { code: string }
  const codeCache = new Map<string, string[]>()
  const generateCopyCode = async (sourceCode: string) => {
    if (!sourceCode) {
      throw new Error('Kode material tidak valid')
    }
    if (!codeCache.has(sourceCode)) {
      const { data: sameCodeRows, error: codeErr } = await supabase
        .from('materials')
        .select('code')
        .like('code', `${sourceCode}-COPY%`)
      if (codeErr) {
        throw new Error(codeErr.message || 'Gagal menyiapkan kode salinan')
      }
      codeCache.set(
        sourceCode,
        (sameCodeRows ?? []).map((r: CodeRow) => r.code),
      )
    }
    const existingCodes = codeCache.get(sourceCode) ?? []
    const nextCode = buildCopyCode(sourceCode, existingCodes)
    codeCache.set(sourceCode, [...existingCodes, nextCode])
    return nextCode
  }
  const newCode = await generateCopyCode(baseCode)

  const clone: Record<string, unknown> = { ...(original as Record<string, unknown>) }
  delete clone.id
  delete clone.created_at
  delete clone.updated_at

  const payload = {
    ...clone,
    code: newCode,
    name: copyName,
    is_active: true,
  }

  const { data: inserted, error: insErr } = await supabase
    .from('materials')
    .insert(payload)
    .select('id')
    .single()

  if (insErr || !inserted) {
    throw new Error(insErr?.message || 'Gagal menyalin material')
  }

  const { data: childRows, error: childErr } = await supabase
    .from('materials')
    .select('*')
    .eq('parent_material_id', materialId)

  if (childErr) {
    throw new Error(childErr.message || 'Gagal membaca varian material')
  }

  if (childRows && childRows.length > 0) {
    const childPayloads: Record<string, unknown>[] = []
    for (const child of childRows as Record<string, unknown>[]) {
      const childCode = String(child.code ?? '')
      const newChildCode = await generateCopyCode(childCode)
      const childClone: Record<string, unknown> = { ...child }
      delete childClone.id
      delete childClone.created_at
      delete childClone.updated_at
      childPayloads.push({
        ...childClone,
        code: newChildCode,
        parent_material_id: inserted.id,
        is_active: true,
      })
    }

    const { error: insertChildrenErr } = await supabase.from('materials').insert(childPayloads)
    if (insertChildrenErr) {
      await supabase.from('materials').delete().eq('id', inserted.id)
      throw new Error(insertChildrenErr.message || 'Gagal menyalin varian material')
    }
  }

  revalidatePath('/admin/materials')
  return { id: inserted.id as string }
}

export async function replaceMaterialsWithBusinessList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  if (user && !bypass) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES)) {
      throw new Error('Hanya Super Admin yang boleh mengganti material')
    }
  }
  const raw = `Kategori,Material,Spek_Varian,Ketebalan,Satuan,Harga_Bawah_Rp,Harga_Atas_Rp,Fungsi_dan_Strategi_Bisnis
Rangka Utama,Baja Ringan Kanal C,C75,0.75 mm,Batang (6m),95000,105000,Segmen budget / Low-end.
Rangka Utama,Baja Ringan Kanal C,C75,1.00 mm,Batang (6m),115000,135000,Segmen budget dengan bentang lebih lebar.
Rangka Utama,Besi Hollow Hitam,40x40 mm,1.2 mm,Batang (6m),110000,125000,Opsi murah besi las. Wajib ekstra cat dasar.
Rangka Utama,Besi Hollow Hitam,40x60 mm,1.4 mm,Batang (6m),160000,185000,Tiang/Frame standar. Wajib cat dasar.
Rangka Utama,Besi Hollow Galvanis,40x40 mm,1.2 mm,Batang (6m),145000,160000,Best value. Anti karat bawaan pabrik.
Rangka Utama,Besi Hollow Galvanis,40x60 mm,1.4 mm,Batang (6m),210000,240000,Tiang/Frame utama. Durabilitas tinggi.
Rangka Utama,Besi Hollow Galvanis,50x100 mm,1.6 mm,Batang (6m),380000,420000,Frame premium/bentang lebar tanpa tiang tengah.
Rangka Utama,Baja WF (Wide Flange),WF 150,Tebal Standar,Batang (6m),2600000,2800000,Komersial/High-end. Aesthetic industrial.
Rangka Jari-jari,Reng Baja Ringan,Standar,0.40 mm,Batang (6m),40000,50000,Dudukan atap spandek pada rangka baja ringan.
Rangka Jari-jari,Reng Baja Ringan,Standar,0.45 mm,Batang (6m),55000,65000,Lebih kaku untuk atap yang lebih berat.
Rangka Jari-jari,Besi Hollow Galvanis,20x40 mm,1.2 mm,Batang (6m),90000,110000,Kisi-kisi atau dudukan atap rapat.
Atap,Spandek Polos,Galvalum,0.25 mm,Meter Lari,45000,55000,Super budget. Resiko komplain berisik tinggi.
Atap,Spandek Polos,Galvalum,0.30 mm,Meter Lari,55000,65000,Standar proyek murah.
Atap,Spandek Pasir,Peredam Suara,0.30 mm,Meter Lari,70000,85000,Upgrade UX (meredam suara hujan).
Atap,Alderon RS,Single Layer / Corrugated,1.2 mm,Meter Lari,75000,95000,Alternatif UPVC murah. Tidak meredam panas maksimal.
Atap,Alderon Twinwall,Double Layer / Rongga,10 mm,Meter Lari,175000,225000,Segmen Menengah-Atas. Adem dan kedap suara (High margin).
Atap,Polycarbonate,X-Lite (Ekonomis),4 mm,Roll (11.8m),1400000,1600000,Transparan budget. Cepat kusam/jamuran.
Atap,Polycarbonate,Twinlite (Premium),5 - 6 mm,Roll (11.8m),3200000,3800000,Transparan awet. UV Protection bagus.
Atap,SolarTuff Gelombang,Transparan Polycarbonate,0.8 mm,Meter Lari,145000,175000,Durable transparan. Look mirip kaca gelombang.
Atap,SolarTuff Solid/Flat,Transparan Kaca,1.2 mm,Meter Lari,280000,350000,Alternatif kaca tempered yang lebih aman/ringan.
Atap,Kaca Tempered,Clear/Dark,8 mm,Meter Persegi,750000,950000,Sangat Premium. Butuh handling/tukang khusus kaca.
Aksesoris,Base Plate / Tapak Besi,15x15 cm / 20x20 cm,5 mm,Pcs,25000,45000,Fondasi tiang ke lantai. Wajib untuk stabilitas.
Aksesoris,Dynabolt,10 x 77 mm,Standar,Pcs,2500,4000,Anchor tiang ke beton.
Aksesoris,Dynabolt,12 x 99 mm,Standar,Pcs,4500,6000,Anchor beban berat.
Aksesoris,Baut Roofing (Spandek),5 cm (plus karet),Standar,Pack (100pcs),25000,35000,Pengunci atap. Karet aus = kebocoran.
Aksesoris,Sekrup Baja Ringan,Standar,Standar,Pack (1000pcs),60000,80000,Sambungan rangka baja ringan.
Aksesoris,Sealant Kaca/Atap,Clear / Black / White,Tube,Tube,35000,55000,Waterproofing area sambungan dinding & atap.
Consumables,Kawat Las,2.0 mm (Besi Tipis),Box (5kg),Box,145000,165000,Habis pakai boros jika banyak sambungan jari-jari.
Consumables,Kawat Las,2.6 mm (Besi Tebal),Box (5kg),Box,155000,185000,Habis pakai untuk struktur tiang/frame.
Consumables,Mata Gerinda Potong,4 Inch (WD/BWS),Pcs,Pcs,5000,8000,Sangat boros. Selalu alokasikan waste 15%.
Consumables,Mata Gerinda Amplas,Flap Disc,Pcs,Pcs,12000,18000,Menghaluskan sisa las sebelum dempul/cat.
Finishing,Dempul Besi,Isamu / Sanpolac,1 Kg,Kaleng,45000,65000,Menutup lubang pori-pori sisa las agar mulus.
Finishing,Cat Dasar Anti Karat,Zincromate / Epoxy,1 Kg,Kaleng,65000,95000,Vital untuk besi hitam.
Finishing,Cat Warna (Sintetik),FTALIT / Seiv,1 Kg,Kaleng,75000,95000,Warna akhir. (Hitam doff paling laku).
Finishing,Powder Coating,Standar Warna,m2,Meter Persegi,150000,180000,Finishing premium tahan gores & cuaca.
Finishing,Cat Duco / PU,Automotive Grade,m2,Meter Persegi,120000,150000,Finishing halus dan mengkilap.
Finishing,Hot Dip Galvanize,Anti Karat Total,m2,Meter Persegi,200000,250000,Proteksi maksimal terhadap karat.
Isian,Besi Hollow,20x20 / 20x40 mm,1.2 mm,Meter Lari,45000,65000,Isian jari-jari pagar minimalis.
Isian,Besi Tempa,Ornamen Klasik,Variasi,Meter Persegi,350000,550000,Isian pagar gaya klasik/mewah.
Isian,Aluminium,Spandrel / Woodgrain,Variasi,Meter Persegi,250000,450000,Isian pagar modern tahan karat.
Thinner,ND / A Super,1 Liter,Botol/Kaleng,30000,45000,Pelarut cat dasar dan cat warna.
Finishing,Kuas & Roll Cat,Berbagai Ukuran,Standar,Set,30000,50000,Alat aplikasi.
Jasa & Ops,Ongkos Tukang Las (Borongan),Per Meter Persegi,Standar,Meter Persegi,80000,150000,Lebih aman untuk cashflow daripada harian.
Jasa & Ops,Transport & Kuli,Pick up / Engkel,Standar,Trip,150000,350000,Hidden cost logistik yang sering lupa dihitung.`
  const rows = parseCsv(raw)
  const [header, ...dataRows] = rows
  const idx = (key: string) => header.findIndex((h) => h.toLowerCase() === key.toLowerCase())
  const catMap = (v: string) => {
    const t = v.toLowerCase()
    if (t.includes('atap')) return 'atap'
    if (t.includes('rangka')) return 'frame'
    if (t.includes('aksesoris')) return 'aksesoris'
    if (t.includes('finishing')) return 'finishing'
    if (t.includes('isian')) return 'isian'
    return 'lainnya'
  }
  const unitMap = (v: string) => {
    const t = v.toLowerCase()
    if (t.includes('meter lari')) return { unit: 'm1' as const, len: 1 }
    if (t.includes('meter persegi')) return { unit: 'm2' as const, len: 1 }
    if (t.includes('batang')) {
      const m = v.match(/\((\d+(?:\.\d+)?)m\)/i)
      const len = m ? Number(m[1]) : 6
      return { unit: 'batang' as const, len }
    }
    if (t.includes('roll')) {
      const m = v.match(/\((\d+(?:\.\d+)?)m\)/i)
      const len = m ? Number(m[1]) : 1
      return { unit: 'lembar' as const, len }
    }
    return { unit: 'unit' as const, len: 1 }
  }
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const codeFrom = (cat: string, material: string, spec: string, thick: string) => {
    const catTag = cat === 'atap' ? 'AT' : cat === 'frame' ? 'FR' : cat === 'aksesoris' ? 'AK' : 'LN'
    const specTag = slug(spec).replace(/-/g, '').toUpperCase()
    const thickTag = slug(thick).replace(/mm/i, 'MM').replace(/\./g, '_').toUpperCase()
    return `${catTag}-${slug(material).slice(0, 8).toUpperCase()}-${specTag}-${thickTag}`
  }
  const toName = (material: string, spec: string, thick: string) =>
    `${material} ${spec} ${thick}`.replace(/\s+/g, ' ').trim()
  const rawPayload = dataRows.map((row) => {
    const cat = catMap(row[idx('Kategori')])
    const material = row[idx('Material')]
    const spec = row[idx('Spek_Varian')]
    const thick = row[idx('Ketebalan')]
    const satuan = row[idx('Satuan')]
    const hi = Number(row[idx('Harga_Atas_Rp')] || '0')
    const um = unitMap(satuan)
    return {
      code: codeFrom(cat, material, spec, thick),
      name: toName(material, spec, thick),
      category: cat,
      unit: um.unit,
      base_price_per_unit: hi,
      length_per_unit: um.len,
      is_active: true,
      is_laser_cut: false,
      requires_sealant: false,
    } as MaterialImportData
  })
  const payload: MaterialImportData[] = []
  const seen: Record<string, number> = {}
  for (const p of rawPayload) {
    const base = p.code
    if (seen[base]) {
      let i = ++seen[base]
      while (seen[`${base}-V${i}`]) i++
      p.code = `${base}-V${i}`
      seen[p.code] = 1
    } else {
      seen[base] = 1
    }
    payload.push(p)
  }
  await supabase.from('materials').update({ is_active: false })
  const { error: upErr } = await supabase
    .from('materials')
    .upsert(payload, { onConflict: 'code' })
  if (upErr) {
    throw new Error(upErr.message)
  }
  const { data: mats } = await supabase.from('materials').select('id,code')
  const newCodes = new Set(payload.map((p) => p.code))
  const deletable = (mats ?? []).filter((m) => !newCodes.has(m.code)).map((m) => m.id)
  const refIds = new Set<string>()
  const { data: ei } = await supabase.from('estimation_items').select('material_id')
  ;(ei ?? []).forEach((x: { material_id: string }) => refIds.add(x.material_id))
  const { data: cats } = await supabase.from('catalogs').select('atap_id,rangka_id')
  ;(cats ?? []).forEach(
    (x: { atap_id: string | null; rangka_id: string | null }) => {
      if (x.atap_id) refIds.add(x.atap_id)
      if (x.rangka_id) refIds.add(x.rangka_id)
    },
  )
  try {
    const { data: add } = await supabase.from('catalog_addons').select('material_id')
    ;(add ?? []).forEach((x: { material_id: string }) => refIds.add(x.material_id))
  } catch {}
  const toDelete = deletable.filter((id) => !refIds.has(id))
  if (toDelete.length > 0) {
    await supabase.from('materials').delete().in('id', toDelete)
  }
  revalidatePath('/admin/materials')
  revalidatePath('/kalkulator')
  revalidatePath('/admin/catalogs')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  revalidatePath('/katalog')
  redirect('/admin/materials')
}
