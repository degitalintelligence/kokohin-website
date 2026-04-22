import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../../page.module.css'
import { updateMaterial } from '@/app/actions/materials'
import DeleteMaterialButton from '../components/DeleteMaterialButton'
import CatalogSaveButton from '../../catalogs/components/CatalogSaveButton'

export default async function AdminMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch material by ID
  const { data: material, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .single()

  const { data: categoriesRaw } = await supabase
    .from('material_categories')
    .select('code, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const { data: parentOptionsRaw } = await supabase
    .from('materials')
    .select('id, name, variant_name')
    .neq('id', id)
    .is('parent_material_id', null)
    .eq('category', material?.category ?? '')
    .order('name', { ascending: true })

  const categories = categoriesRaw ?? []
  const parentOptions = parentOptionsRaw ?? []
  const variantRootId = material?.parent_material_id ?? material?.id ?? id
  const { data: variantRowsRaw } = await supabase
    .from('materials')
    .select('id, name, variant_name, base_price_per_unit, is_active, parent_material_id')
    .or(`id.eq.${variantRootId},parent_material_id.eq.${variantRootId}`)
    .order('created_at', { ascending: true })
  const variantRows = variantRowsRaw ?? []
  const variantRoot =
    variantRows.find((row) => row.id === variantRootId) ?? null
  const childVariants = variantRows.filter((row) => row.parent_material_id === variantRootId)

  const [directCatalogRefsResult, hppCatalogRefsResult, addonCatalogRefsResult] = await Promise.all([
    supabase
      .from('catalogs')
      .select('id, title, category, atap_id, rangka_id, finishing_id, isian_id')
      .or(`atap_id.eq.${id},rangka_id.eq.${id},finishing_id.eq.${id},isian_id.eq.${id}`)
      .order('title', { ascending: true }),
    supabase
      .from('catalog_hpp_components')
      .select('catalog_id, catalog:catalog_id(id, title, category)')
      .eq('material_id', id),
    supabase
      .from('catalog_addons')
      .select('catalog_id, catalog:catalog_id(id, title, category)')
      .eq('material_id', id),
  ])

  type CatalogUsage = {
    id: string
    title: string
    category: string | null
    usages: Set<string>
  }
  const catalogUsageMap = new Map<string, CatalogUsage>()
  const ensureUsageEntry = (catalogId: string, title: string, category: string | null) => {
    const existing = catalogUsageMap.get(catalogId)
    if (existing) return existing
    const created: CatalogUsage = { id: catalogId, title, category, usages: new Set<string>() }
    catalogUsageMap.set(catalogId, created)
    return created
  }

  ;(directCatalogRefsResult.data ?? []).forEach((catalog) => {
    const entry = ensureUsageEntry(catalog.id, catalog.title, catalog.category ?? null)
    if (catalog.atap_id === id) entry.usages.add('Material Atap')
    if (catalog.rangka_id === id) entry.usages.add('Material Rangka')
    if (catalog.finishing_id === id) entry.usages.add('Material Finishing')
    if (catalog.isian_id === id) entry.usages.add('Material Isian')
  })

  ;(hppCatalogRefsResult.data ?? []).forEach((row) => {
    const catalog = row.catalog as { id?: string; title?: string; category?: string | null } | null
    const catalogId = catalog?.id ?? row.catalog_id
    const title = catalog?.title ?? row.catalog_id
    const category = catalog?.category ?? null
    if (!catalogId) return
    ensureUsageEntry(catalogId, title, category).usages.add('Komponen HPP')
  })

  ;(addonCatalogRefsResult.data ?? []).forEach((row) => {
    const catalog = row.catalog as { id?: string; title?: string; category?: string | null } | null
    const catalogId = catalog?.id ?? row.catalog_id
    const title = catalog?.title ?? row.catalog_id
    const category = catalog?.category ?? null
    if (!catalogId) return
    ensureUsageEntry(catalogId, title, category).usages.add('Addon')
  })

  const catalogUsages = Array.from(catalogUsageMap.values())
    .map((item) => ({ ...item, usageList: Array.from(item.usages) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'id'))

  if (error) {
    console.error('Error fetching material:', error)
    return (
      <div className={`${styles.main} flex-1 h-full`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Material Tidak Ditemukan</h1>
            <p className={styles.sub}>Material dengan ID {id} tidak ditemukan atau telah dihapus</p>
          </div>
          <Link href="/admin/materials" className="btn btn-primary">
            ← Kembali ke Daftar Material
          </Link>
        </div>
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
            <strong>Error:</strong> {error.message}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Material</h1>
          <p className={styles.sub}>Ubah detail material {material.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/materials" className="btn btn-outline-dark">
            ← Kembali
          </Link>
          <DeleteMaterialButton id={material.id} />
          <CatalogSaveButton formId="editMaterialForm" />
        </div>
      </div>

      {/* Material Info */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Informasi Material</h2>
        </div>
        <form id="editMaterialForm" action={updateMaterial} className="p-6 space-y-6">
          <input type="hidden" name="id" value={material.id} />
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Kode Material</label>
              <input
                type="text"
                name="code"
                defaultValue={material.code}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Nama Material</label>
              <input
                type="text"
                name="name"
                defaultValue={material.name}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Kategori</label>
              <select
                name="category"
                defaultValue={material.category}
                className="input"
                required
              >
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nama Varian</label>
              <input
                type="text"
                name="variant_name"
                defaultValue={material.variant_name ?? 'Default'}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Satuan</label>
              <select
                name="unit"
                defaultValue={material.unit}
                className="input"
                required
              >
                <option value="batang">Batang</option>
                <option value="lembar">Lembar</option>
                <option value="m1">Meter Lari (m1)</option>
                <option value="m2">Meter Persegi (m2)</option>
                <option value="hari">Hari</option>
                <option value="unit">Unit</option>
              </select>
            </div>
            <div>
              <label className="label">Parent Material (opsional)</label>
              <select
                name="parent_material_id"
                defaultValue={material.parent_material_id ?? ''}
                className="input"
              >
                <option value="">Tidak ada (material utama)</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.variant_name ?? 'Default'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Parent hanya boleh material utama dalam kategori yang sama.
              </p>
            </div>
            <div>
              <label className="label">Harga Dasar (Rp)</label>
              <input
                type="number"
                name="base_price_per_unit"
                defaultValue={material.base_price_per_unit}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Panjang per Unit (meter)</label>
              <input
                type="number"
                name="length_per_unit"
                defaultValue={material.length_per_unit ?? 1}
                min={0.01}
                step={0.01}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={material.is_active}
                  className="w-4 h-4"
                />
                <span className="text-sm">Aktifkan Material ini</span>
              </label>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_laser_cut"
                  defaultChecked={Boolean(material.is_laser_cut)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Material Plat Laser Cut</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="requires_sealant"
                  defaultChecked={Boolean(material.requires_sealant)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Butuh Sealant (mis. kaca tempered)</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Varian Material</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600">
              {variantRoot
                ? `Material utama: ${variantRoot.name} (Varian: ${childVariants.length})`
                : 'Daftar varian material'}
            </p>
            <Link
              href={`/admin/materials/new?variant_of=${variantRootId}`}
              className="btn btn-outline-dark btn-sm"
            >
              + Tambah Varian
            </Link>
          </div>
          {childVariants.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada varian untuk material ini.</p>
          ) : (
            <div className="space-y-2">
              {childVariants.map((variant) => (
                <div
                  key={variant.id}
                  className={`rounded-lg border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between ${
                    variant.id === id ? 'border-[#E30613] bg-[#fff5f5]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {variant.variant_name || 'Default'}
                      {variant.id === id ? ' (Sedang Dibuka)' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Harga: Rp {(Number(variant.base_price_per_unit || 0)).toLocaleString('id-ID')} •{' '}
                      {variant.is_active ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                  <Link href={`/admin/materials/${variant.id}`} className="btn btn-outline-dark btn-sm w-fit">
                    Buka Varian
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Dipakai di Katalog</h2>
        </div>
        <div className="p-6">
          {catalogUsages.length === 0 ? (
            <p className="text-sm text-gray-500">
              Material ini belum dipakai di katalog manapun.
            </p>
          ) : (
            <div className="space-y-3">
              {catalogUsages.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-4 bg-white flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {item.category ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                          {item.category}
                        </span>
                      ) : null}
                      {item.usageList.map((usage) => (
                        <span
                          key={`${item.id}-${usage}`}
                          className="inline-flex items-center rounded-full bg-[#E30613]/10 px-2 py-0.5 text-[#E30613] font-semibold"
                        >
                          {usage}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/admin/catalogs/${item.id}`}
                    className="btn btn-outline-dark btn-sm w-fit"
                  >
                    Buka Katalog
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
