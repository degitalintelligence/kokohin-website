import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Segmen HPP Katalog',
}

const TABS = ['sections', 'categories'] as const
type PageTab = (typeof TABS)[number]

type CatalogCategoryRow = {
  code: string
  name: string
  sort_order: number
  is_active: boolean
  require_atap: boolean
  require_rangka: boolean
  require_isian: boolean
  require_finishing: boolean
}

type HppSectionRow = {
  code: string
  name: string
  sort_order: number
  is_active: boolean
}

async function ensureAuthorized() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    const email = (profile as { email?: string } | null)?.email
    if (!isRoleAllowed(role, ALLOWED_MATERIALS_ROLES, email)) {
      redirect('/admin')
    }
  }
  return supabase
}

function normalizeCode(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function createCatalogCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 100) || 100
  const isActive = formData.get('is_active') === 'on'
  const requireAtap = formData.get('require_atap') === 'on'
  const requireRangka = formData.get('require_rangka') === 'on'
  const requireIsian = formData.get('require_isian') === 'on'
  const requireFinishing = formData.get('require_finishing') === 'on'

  if (!code || !name) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Kode dan nama kategori wajib diisi'))
  }

  const { error } = await supabase.from('catalog_categories').insert({
    code,
    name,
    sort_order: sortOrder,
    is_active: isActive,
    require_atap: requireAtap,
    require_rangka: requireRangka,
    require_isian: requireIsian,
    require_finishing: requireFinishing,
  })

  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=categories&notice=created')
}

async function createHppSection(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 100) || 100
  const isActive = formData.get('is_active') === 'on'

  if (!code || !name) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Kode dan nama segmen wajib diisi'))
  }

  const { error } = await supabase.from('catalog_hpp_sections').insert({
    code,
    name,
    sort_order: sortOrder,
    is_active: isActive,
  })
  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=sections&notice=section_created')
}

async function updateHppSection(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  const originalCode = normalizeCode(String(formData.get('original_code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 100) || 100
  const isActive = formData.get('is_active') === 'on'

  if (!code || !name || !originalCode) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Data segmen tidak valid'))
  }

  if (code !== originalCode) {
    const confirmMigration = formData.get('confirm_code_migration') === 'on'
    if (!confirmMigration) {
      redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Centang konfirmasi migrasi sebelum mengubah kode segmen'))
    }

    const { error: renameError } = await supabase.rpc('rename_catalog_hpp_section', {
      old_code: originalCode,
      new_code: code,
      new_name: name,
      new_sort_order: sortOrder,
      new_is_active: isActive,
    })
    if (renameError) {
      redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent(renameError.message))
    }

    revalidatePath('/admin/catalog-hpp-segments')
    revalidatePath('/admin/catalogs/[id]')
    redirect('/admin/catalog-hpp-segments?tab=sections&notice=section_updated')
  }

  const { error } = await supabase
    .from('catalog_hpp_sections')
    .update({
      name,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('code', originalCode)
  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=sections&notice=section_updated')
}

async function deleteHppSection(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  if (!code) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Kode segmen tidak valid'))
  }

  const [{ count: usedByComponents }, { count: usedByMappings }] = await Promise.all([
    supabase
      .from('catalog_hpp_components')
      .select('id', { count: 'exact', head: true })
      .eq('section', code),
    supabase
      .from('catalog_category_hpp_sections')
      .select('category_code', { count: 'exact', head: true })
      .eq('section_code', code),
  ])

  if ((usedByComponents ?? 0) > 0) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Segmen masih dipakai komponen HPP. Pindahkan segmen pada BOM terlebih dahulu.'))
  }
  if ((usedByMappings ?? 0) > 0) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent('Segmen masih terhubung ke kategori katalog. Lepas relasi segmen terlebih dahulu.'))
  }

  const { error } = await supabase.from('catalog_hpp_sections').delete().eq('code', code)
  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=sections&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=sections&notice=section_deleted')
}

async function updateCatalogCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  const originalCode = normalizeCode(String(formData.get('original_code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 100) || 100
  const isActive = formData.get('is_active') === 'on'
  const requireAtap = formData.get('require_atap') === 'on'
  const requireRangka = formData.get('require_rangka') === 'on'
  const requireIsian = formData.get('require_isian') === 'on'
  const requireFinishing = formData.get('require_finishing') === 'on'

  if (!code || !name || !originalCode) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Data kategori tidak valid'))
  }

  if (code !== originalCode) {
    const { error: moveMapError } = await supabase
      .from('catalog_category_hpp_sections')
      .update({ category_code: code })
      .eq('category_code', originalCode)
    if (moveMapError) {
      redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(moveMapError.message))
    }
    const { error: moveCatalogError } = await supabase
      .from('catalogs')
      .update({ category: code })
      .eq('category', originalCode)
    if (moveCatalogError) {
      redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(moveCatalogError.message))
    }
  }

  const { error } = await supabase
    .from('catalog_categories')
    .update({
      code,
      name,
      sort_order: sortOrder,
      is_active: isActive,
      require_atap: requireAtap,
      require_rangka: requireRangka,
      require_isian: requireIsian,
      require_finishing: requireFinishing,
      updated_at: new Date().toISOString(),
    })
    .eq('code', originalCode)

  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=categories&notice=updated')
}

async function saveCategorySectionMapping(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const categoryCode = normalizeCode(String(formData.get('category_code') ?? ''))
  const selectedSectionCodes = formData.getAll('section_code').map((v) => String(v).toLowerCase())
  const selectedSet = new Set(selectedSectionCodes)

  if (!categoryCode) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Kategori tidak valid'))
  }

  const { data: activeSections } = await supabase
    .from('catalog_hpp_sections')
    .select('code')
    .eq('is_active', true)
  const allowedCodes = new Set((activeSections ?? []).map((row) => String(row.code).toLowerCase()))

  const filtered = [...selectedSet].filter((code) => allowedCodes.has(code))
  if (filtered.length === 0) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Pilih minimal 1 segmen HPP'))
  }

  const { error: delErr } = await supabase
    .from('catalog_category_hpp_sections')
    .delete()
    .eq('category_code', categoryCode)
  if (delErr) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(delErr.message))
  }

  const rows = filtered.map((sectionCode, index) => ({
    category_code: categoryCode,
    section_code: sectionCode,
    sort_order: (index + 1) * 10,
    is_active: true,
  }))
  const { error: insErr } = await supabase.from('catalog_category_hpp_sections').insert(rows)
  if (insErr) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(insErr.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=categories&notice=mapping_saved')
}

async function deleteCatalogCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCode(String(formData.get('code') ?? ''))
  if (!code) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Kode kategori tidak valid'))
  }

  const { count } = await supabase
    .from('catalogs')
    .select('id', { count: 'exact', head: true })
    .eq('category', code)
  if ((count ?? 0) > 0) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent('Kategori masih dipakai katalog. Ubah kategori katalog terlebih dahulu.'))
  }

  const { error } = await supabase.from('catalog_categories').delete().eq('code', code)
  if (error) {
    redirect('/admin/catalog-hpp-segments?tab=categories&error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/catalog-hpp-segments')
  revalidatePath('/admin/catalogs/new')
  revalidatePath('/admin/catalogs/[id]')
  redirect('/admin/catalog-hpp-segments?tab=categories&notice=deleted')
}

export default async function CatalogHppSegmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; tab?: string }>
}) {
  const { error, notice, tab } = await searchParams
  const activeTab: PageTab = TABS.includes((tab ?? '') as PageTab) ? (tab as PageTab) : 'sections'
  const tabHref = (nextTab: PageTab) => {
    const params = new URLSearchParams()
    params.set('tab', nextTab)
    if (notice) params.set('notice', notice)
    if (error) params.set('error', error)
    return `/admin/catalog-hpp-segments?${params.toString()}`
  }
  const supabase = await ensureAuthorized()

  const { data: categories } = await supabase
    .from('catalog_categories')
    .select('code, name, sort_order, is_active, require_atap, require_rangka, require_isian, require_finishing')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  const { data: sections } = await supabase
    .from('catalog_hpp_sections')
    .select('code, name, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  const { data: mappings } = await supabase
    .from('catalog_category_hpp_sections')
    .select('category_code, section_code')

  const rows = (categories ?? []) as CatalogCategoryRow[]
  const sectionRows = (sections ?? []) as HppSectionRow[]
  const activeSectionRows = sectionRows.filter((section) => section.is_active)
  const mapped = new Map<string, Set<string>>()
  ;(mappings ?? []).forEach((item) => {
    const categoryCode = String((item as { category_code?: string }).category_code ?? '')
    const sectionCode = String((item as { section_code?: string }).section_code ?? '')
    if (!categoryCode || !sectionCode) return
    if (!mapped.has(categoryCode)) mapped.set(categoryCode, new Set())
    mapped.get(categoryCode)?.add(sectionCode)
  })

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Segmen HPP Katalog</h1>
          <p className={styles.sub}>Kelola kategori katalog + segmen HPP per kategori tanpa enum hardcoded.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalogs" className="btn btn-outline-dark">
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>

      <div className="mb-5 bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={tabHref('sections')}
            className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
              activeTab === 'sections'
                ? 'bg-[#E30613] text-white border-[#E30613]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Master Segmen HPP
          </Link>
          <Link
            href={tabHref('categories')}
            className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
              activeTab === 'categories'
                ? 'bg-[#E30613] text-white border-[#E30613]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Kategori & Mapping
          </Link>
        </div>
      </div>

      {(error || notice) && (
        <div className="mb-6">
          {error && (
            <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}
          {!error && (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
              {notice === 'created' && 'Kategori katalog berhasil ditambahkan.'}
              {notice === 'updated' && 'Kategori katalog berhasil diperbarui.'}
              {notice === 'mapping_saved' && 'Relasi segmen HPP berhasil disimpan.'}
              {notice === 'deleted' && 'Kategori katalog berhasil dihapus.'}
              {notice === 'section_created' && 'Segmen HPP berhasil ditambahkan.'}
              {notice === 'section_updated' && 'Segmen HPP berhasil diperbarui.'}
              {notice === 'section_deleted' && 'Segmen HPP berhasil dihapus.'}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sections' && (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Master Segmen HPP ({sectionRows.length})</h2>
        </div>
        <div className="p-5 space-y-4">
          <form action={createHppSection} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border border-gray-200 rounded-xl p-4">
            <div>
              <label className="label">Kode Segmen</label>
              <input name="code" className="input" placeholder="contoh: struktur_utama" required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Nama Segmen</label>
              <input name="name" className="input" placeholder="Contoh: Struktur Utama" required />
            </div>
            <div>
              <label className="label">Urutan</label>
              <input name="sort_order" type="number" className="input" defaultValue={100} />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input type="checkbox" name="is_active" className="w-4 h-4" defaultChecked />
              <span className="text-sm">Aktif</span>
            </label>
            <div className="md:col-span-5">
              <button type="submit" className="btn btn-primary btn-sm">Simpan Segmen</button>
            </div>
          </form>

          <div className="space-y-3">
            {sectionRows.map((section) => (
              <div key={section.code} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{section.name}</p>
                    <p className="text-xs text-gray-500">Kode: {section.code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${section.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {section.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">Edit Segmen</summary>
                  <form action={updateHppSection} className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <input type="hidden" name="original_code" value={section.code} />
                    <div>
                      <label className="label">Kode</label>
                      <input name="code" className="input" defaultValue={section.code} required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Nama</label>
                      <input name="name" className="input" defaultValue={section.name} required />
                    </div>
                    <div>
                      <label className="label">Urutan</label>
                      <input name="sort_order" type="number" className="input" defaultValue={section.sort_order} />
                    </div>
                    <label className="flex items-center gap-2 pb-2">
                      <input type="checkbox" name="is_active" className="w-4 h-4" defaultChecked={section.is_active} />
                      <span className="text-sm">Aktif</span>
                    </label>
                    <label className="md:col-span-5 flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50">
                      <input type="checkbox" name="confirm_code_migration" className="w-4 h-4 mt-0.5" />
                      <span className="text-xs text-amber-800">
                        Centang jika Anda mengubah kode segmen. Sistem akan memigrasikan relasi BOM + mapping kategori secara otomatis.
                      </span>
                    </label>
                    <div className="md:col-span-5 flex gap-2">
                      <button type="submit" className="btn btn-primary btn-sm">Simpan Segmen</button>
                    </div>
                  </form>
                </details>
                <form action={deleteHppSection} className="mt-3">
                  <input type="hidden" name="code" value={section.code} />
                  <button type="submit" className="btn btn-outline-danger btn-sm">Hapus Segmen</button>
                </form>
              </div>
            ))}
            {sectionRows.length === 0 && (
              <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-md p-4">
                Belum ada segmen HPP.
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'categories' && (
      <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tambah Kategori Katalog</h2>
        </div>
        <form action={createCatalogCategory} className="p-5 grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="label">Kode</label>
            <input name="code" className="input" placeholder="kanopi_baja" required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Nama</label>
            <input name="name" className="input" placeholder="Kanopi Baja" required />
          </div>
          <div className="md:col-span-1">
            <label className="label">Urutan</label>
            <input name="sort_order" type="number" className="input" defaultValue={100} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="require_atap" className="w-4 h-4" />
            <span className="text-sm">Wajib Atap</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="require_rangka" className="w-4 h-4" defaultChecked />
            <span className="text-sm">Wajib Rangka</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="require_finishing" className="w-4 h-4" defaultChecked />
            <span className="text-sm">Wajib Finishing</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="require_isian" className="w-4 h-4" />
            <span className="text-sm">Wajib Isian</span>
          </label>
          <label className="md:col-span-7 flex items-center gap-2">
            <input type="checkbox" name="is_active" className="w-4 h-4" defaultChecked />
            <span className="text-sm">Aktif</span>
          </label>
          <div className="md:col-span-7">
            <button type="submit" className="btn btn-primary btn-sm">Simpan Kategori</button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Kategori & Relasi Segmen ({rows.length})</h2>
        </div>
        <div className="p-5 space-y-4">
          {rows.map((row) => {
            const selected = mapped.get(row.code) ?? new Set<string>()
            return (
              <div key={row.code} className="border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500">Kode: {row.code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">Edit Kategori</summary>
                  <form action={updateCatalogCategory} className="mt-3 grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                    <input type="hidden" name="original_code" value={row.code} />
                    <div className="md:col-span-1">
                      <label className="label">Kode</label>
                      <input name="code" className="input" defaultValue={row.code} required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Nama</label>
                      <input name="name" className="input" defaultValue={row.name} required />
                    </div>
                    <div className="md:col-span-1">
                      <label className="label">Urutan</label>
                      <input name="sort_order" type="number" className="input" defaultValue={row.sort_order} />
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="require_atap" className="w-4 h-4" defaultChecked={row.require_atap} />
                      <span className="text-sm">Wajib Atap</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="require_rangka" className="w-4 h-4" defaultChecked={row.require_rangka} />
                      <span className="text-sm">Wajib Rangka</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="require_finishing" className="w-4 h-4" defaultChecked={row.require_finishing} />
                      <span className="text-sm">Wajib Finishing</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="require_isian" className="w-4 h-4" defaultChecked={row.require_isian} />
                      <span className="text-sm">Wajib Isian</span>
                    </label>
                    <label className="md:col-span-7 flex items-center gap-2">
                      <input type="checkbox" name="is_active" className="w-4 h-4" defaultChecked={row.is_active} />
                      <span className="text-sm">Aktif</span>
                    </label>
                    <div className="md:col-span-7">
                      <button type="submit" className="btn btn-primary btn-sm">Simpan Kategori</button>
                    </div>
                  </form>
                </details>

                <form action={saveCategorySectionMapping} className="space-y-2">
                  <input type="hidden" name="category_code" value={row.code} />
                  <p className="text-sm font-semibold text-gray-700">Segmen HPP untuk kategori ini</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {activeSectionRows.map((section) => (
                      <label key={section.code} className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2">
                        <input
                          type="checkbox"
                          name="section_code"
                          value={section.code}
                          defaultChecked={selected.has(section.code)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{section.name}</span>
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-outline-dark btn-sm">Simpan Relasi Segmen</button>
                </form>

                <form action={deleteCatalogCategory}>
                  <input type="hidden" name="code" value={row.code} />
                  <button type="submit" className="btn btn-outline-danger btn-sm">Hapus Kategori</button>
                </form>
              </div>
            )
          })}
          {rows.length === 0 && (
            <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-md p-4">
              Belum ada kategori katalog.
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
