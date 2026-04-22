import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ALLOWED_MATERIALS_ROLES, isRoleAllowed } from '@/lib/rbac'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Kategori Material',
}

type MaterialCategoryRow = {
  id: string
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

function normalizeCategoryCode(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function createMaterialCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const code = normalizeCategoryCode(String(formData.get('code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 0) || 0
  const isActive = formData.get('is_active') === 'on'

  if (!code) {
    redirect('/admin/material-categories?error=' + encodeURIComponent('Kode kategori wajib diisi'))
  }
  if (!name) {
    redirect('/admin/material-categories?error=' + encodeURIComponent('Nama kategori wajib diisi'))
  }

  const { error } = await supabase.from('material_categories').insert({
    code,
    name,
    sort_order: sortOrder,
    is_active: isActive,
  })

  if (error) {
    redirect('/admin/material-categories?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/material-categories')
  revalidatePath('/admin/materials')
  redirect('/admin/material-categories?notice=created')
}

async function updateMaterialCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const id = String(formData.get('id') ?? '').trim()
  const code = normalizeCategoryCode(String(formData.get('code') ?? ''))
  const name = String(formData.get('name') ?? '').trim()
  const sortOrder = Number(formData.get('sort_order') ?? 0) || 0
  const isActive = formData.get('is_active') === 'on'

  if (!id) {
    redirect('/admin/material-categories?error=' + encodeURIComponent('ID kategori tidak valid'))
  }
  if (!code || !name) {
    redirect('/admin/material-categories?error=' + encodeURIComponent('Kode dan nama kategori wajib diisi'))
  }

  const { error } = await supabase
    .from('material_categories')
    .update({
      code,
      name,
      sort_order: sortOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    redirect('/admin/material-categories?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/material-categories')
  revalidatePath('/admin/materials')
  redirect('/admin/material-categories?notice=updated')
}

async function deleteMaterialCategory(formData: FormData) {
  'use server'
  const supabase = await ensureAuthorized()
  const id = String(formData.get('id') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim()

  if (!id || !code) {
    redirect('/admin/material-categories?error=' + encodeURIComponent('Data kategori tidak valid'))
  }

  const { count } = await supabase
    .from('materials')
    .select('id', { count: 'exact', head: true })
    .eq('category', code)

  if ((count ?? 0) > 0) {
    redirect(
      '/admin/material-categories?error=' +
        encodeURIComponent('Kategori masih digunakan oleh material. Pindahkan material terlebih dahulu.'),
    )
  }

  const { error } = await supabase.from('material_categories').delete().eq('id', id)
  if (error) {
    redirect('/admin/material-categories?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/admin/material-categories')
  revalidatePath('/admin/materials')
  redirect('/admin/material-categories?notice=deleted')
}

export default async function MaterialCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const { error, notice } = await searchParams
  const supabase = await ensureAuthorized()

  const { data: categories } = await supabase
    .from('material_categories')
    .select('id, code, name, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: materialsRows } = await supabase.from('materials').select('category')
  const countMap = new Map<string, number>()
  ;(materialsRows ?? []).forEach((item) => {
    const key = (item as { category?: string }).category
    if (!key) return
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  })

  const rows = (categories ?? []) as MaterialCategoryRow[]

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kategori Material</h1>
          <p className={styles.sub}>Kelola kategori material secara dinamis tanpa hardcode enum.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/materials" className="btn btn-outline-dark">
            ← Kembali ke Material
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
          {!error && notice === 'created' && (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
              Kategori berhasil ditambahkan
            </div>
          )}
          {!error && notice === 'updated' && (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
              Kategori berhasil diperbarui
            </div>
          )}
          {!error && notice === 'deleted' && (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
              Kategori berhasil dihapus
            </div>
          )}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tambah Kategori</h2>
        </div>
        <form action={createMaterialCategory} className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="label">Kode</label>
            <input name="code" className="input" placeholder="contoh: kaca" required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Nama</label>
            <input name="name" className="input" placeholder="Contoh: Kaca" required />
          </div>
          <div className="md:col-span-1">
            <label className="label">Urutan</label>
            <input name="sort_order" type="number" className="input" defaultValue={100} />
          </div>
          <label className="md:col-span-1 flex items-center gap-2 pb-2">
            <input type="checkbox" name="is_active" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Aktif</span>
          </label>
          <div className="md:col-span-5">
            <button type="submit" className="btn btn-primary btn-sm">
              Simpan Kategori
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Daftar Kategori ({rows.length})</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Urutan</th>
                <th>Material</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.bold}>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.sort_order}</td>
                  <td>{countMap.get(row.code) ?? 0}</td>
                  <td>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {row.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <details className="group">
                        <summary className="btn btn-outline-dark btn-sm cursor-pointer">Edit</summary>
                        <div className="mt-2 p-3 rounded-md border border-gray-200 bg-white w-[360px]">
                          <form action={updateMaterialCategory} className="space-y-2">
                            <input type="hidden" name="id" value={row.id} />
                            <div>
                              <label className="label">Kode</label>
                              <input name="code" className="input" defaultValue={row.code} required />
                            </div>
                            <div>
                              <label className="label">Nama</label>
                              <input name="name" className="input" defaultValue={row.name} required />
                            </div>
                            <div>
                              <label className="label">Urutan</label>
                              <input
                                name="sort_order"
                                type="number"
                                className="input"
                                defaultValue={row.sort_order}
                              />
                            </div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={row.is_active}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">Aktif</span>
                            </label>
                            <button type="submit" className="btn btn-primary btn-sm">
                              Simpan Perubahan
                            </button>
                          </form>
                        </div>
                      </details>
                      <form action={deleteMaterialCategory}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="code" value={row.code} />
                        <button
                          type="submit"
                          className="btn btn-outline-danger btn-sm"
                          title="Hanya bisa dihapus jika tidak dipakai material"
                        >
                          Hapus
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Belum ada kategori material.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
