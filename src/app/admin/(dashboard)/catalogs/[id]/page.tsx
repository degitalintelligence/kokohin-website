import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { updateCatalog, importCatalogAddons } from '@/app/actions/catalogs'
import styles from '../../page.module.css'
import DeleteCatalogButton from '../components/DeleteCatalogButton'
import CatalogAddonsEditor from '../components/CatalogAddonsEditor'
import CatalogBaseFields from '../components/CatalogBaseFields'
import CatalogEstimatePreview from '../components/CatalogEstimatePreview'

export default async function AdminCatalogDetailPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; import?: string; import_detail?: string; import_detail_url?: string }> 
}) {
  const { id } = await params
  const { error: errorMessage, import: importResult, import_detail: importDetail, import_detail_url: importDetailUrl } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  // Fetch catalog by ID
  const { data: catalog, error } = await supabase
    .from('catalogs')
    .select('*')
    .eq('id', id)
    .single()

  // Fetch materials for dropdowns + addons data
  const [{ data: atapList }, { data: rangkaList }, { data: allMaterials }, { data: addons }] = await Promise.all([
    supabase.from('materials').select('id, name').eq('category', 'atap').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name').eq('category', 'frame').eq('is_active', true).order('name'),
    supabase.from('materials').select('id, name, category, base_price_per_unit, unit').eq('is_active', true).order('name'),
    supabase
      .from('catalog_addons')
      .select('id, material_id, basis, qty_per_basis, is_optional, material:material_id(id, name, base_price_per_unit, unit, category)')
      .eq('catalog_id', id)
      .order('created_at', { ascending: true })
  ])

  if (error || !catalog) {
    return (
      <div className={`${styles.main} flex-1 h-full`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Katalog Tidak Ditemukan</h1>
            <p className={styles.sub}>Katalog dengan ID {id} tidak ditemukan</p>
          </div>
          <Link href="/admin/catalogs" className="btn btn-primary">
            ← Kembali ke Daftar Katalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.main} flex-1 h-full`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Edit Katalog</h1>
          <p className={styles.sub}>Ubah detail paket {catalog.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalogs" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center">
            ← Kembali
          </Link>
          <DeleteCatalogButton id={catalog.id} />
          <button type="submit" form="editCatalogForm" className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors ml-auto">
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Catalog Form */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Informasi Katalog</h2>
        </div>
        
        {errorMessage && (
          <div className="mx-6 mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {decodeURIComponent(errorMessage)}
          </div>
        )}
        {importResult && (
          <div className="mx-6 mt-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {decodeURIComponent(importResult)}
          </div>
        )}
        {importDetail && (
          <div className="mx-6 mt-2 p-4 border border-gray-200 rounded-md bg-white text-sm">
            <div className="font-medium mb-2">Detil:</div>
            <ul className="list-disc pl-5 space-y-1">
              {decodeURIComponent(importDetail).split('|').filter(Boolean).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            {importDetailUrl && (
              <div className="mt-3">
                <a
                  href={decodeURIComponent(importDetailUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md text-white"
                  style={{ backgroundColor: '#E30613' }}
                >
                  Download detil (JSON)
                </a>
              </div>
            )}
          </div>
        )}

        <form id="editCatalogForm" action={updateCatalog} className="p-6 space-y-8">
          <input type="hidden" name="id" value={catalog.id} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Nama Paket *</label>
              <input
                type="text"
                name="title"
                defaultValue={catalog.title}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="Contoh: Paket Minimalis Atap Alderon"
                required
              />
            </div>

            <CatalogBaseFields
              atapList={atapList ?? []}
              rangkaList={rangkaList ?? []}
              initialCategory={catalog.category ?? ''}
              initialAtapId={catalog.atap_id || ''}
              initialRangkaId={catalog.rangka_id || ''}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Harga Dasar (Rp) *</label>
                <input
                  type="number"
                  name="base_price_per_m2"
                  defaultValue={catalog.base_price_per_m2}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min={0}
                  step={1000}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Satuan</label>
                <select
                  name="base_price_unit"
                  defaultValue={catalog.base_price_unit || 'm2'}
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="m2">m²</option>
                  <option value="m1">m¹</option>
                  <option value="unit">unit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-2">Tenaga Kerja (Rp)</label>
                <input
                  type="number"
                  name="labor_cost"
                  defaultValue={(catalog as { labor_cost?: number }).labor_cost ?? 0}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min={0}
                  step={1000}
                />
                <p className="text-xs text-gray-500 mt-1">Mengikuti satuan harga dasar</p>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-2">Transport (Rp)</label>
                <input
                  type="number"
                  name="transport_cost"
                  defaultValue={(catalog as { transport_cost?: number }).transport_cost ?? 0}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min={0}
                  step={1000}
                />
                <p className="text-xs text-gray-500 mt-1">Biaya flat sekali proyek</p>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-2">Margin (%)</label>
                <input
                  type="number"
                  name="margin_percentage"
                  defaultValue={(catalog as { margin_percentage?: number }).margin_percentage ?? 0}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="0"
                  min={0}
                  step={1}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Upload Gambar</label>
              {catalog.image_url && (
                <div className="mb-2">
                  <Image
                    src={catalog.image_url}
                    alt="Preview"
                    width={128}
                    height={128}
                    unoptimized
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <input type="hidden" name="current_image_url" value={catalog.image_url} />
                </div>
              )}
              <input
                type="file"
                name="image_file"
                accept="image/*"
                className="w-full px-4 py-2 border rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengubah gambar.</p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={catalog.is_active}
                  className="w-4 h-4"
                />
                <span className="text-sm">Aktifkan Katalog ini</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t">
            <CatalogAddonsEditor
              materials={allMaterials ?? []}
              initialAddons={(addons ?? []).map((a) => {
                type AddonMaterial = {
                  id: string;
                  name: string;
                  base_price_per_unit: number;
                  unit: 'batang' | 'lembar' | 'm1' | 'm2' | 'hari' | 'unit';
                  category: 'atap' | 'frame' | 'aksesoris' | 'lainnya';
                }
                type RawAddon = {
                  id: string;
                  material_id: string;
                  basis?: 'm2' | 'm1' | 'unit';
                  qty_per_basis?: number;
                  is_optional: boolean;
                  material?: AddonMaterial | AddonMaterial[];
                }
                const ra = a as RawAddon
                const material = Array.isArray(ra.material) ? ra.material[0] : ra.material
                const basis = ra.basis ?? 'm2'
                const qtyPerBasis = ra.qty_per_basis ?? 0
                return { ...ra, material, basis, qty_per_basis: qtyPerBasis }
              })}
            />
            <p className="text-xs text-gray-500 mt-2">
              Item bertanda opsional dapat dicentang oleh sales/customer di kalkulator.
            </p>
          </div>

          <CatalogEstimatePreview formId="editCatalogForm" />
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Import Addons dari CSV</h2>
        </div>
        <div className="p-6">
          <form action={importCatalogAddons} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="catalog_id" value={catalog.id} />
            <input type="file" name="file" accept=".csv" className="text-sm" />
            <select name="mode" defaultValue="replace" className="px-3 py-2 border rounded-md bg-white">
              <option value="replace">replace (hapus & ganti)</option>
              <option value="append">append (tambah baru)</option>
              <option value="upsert">upsert (update jika ada, jika tidak tambah)</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="preview" value="1" />
              <span>Preview saja</span>
            </label>
            <button type="submit" className="px-4 py-2 rounded-md text-white" style={{ backgroundColor: '#E30613' }}>
              Import CSV
            </button>
            <a href="/templates/catalog_addons_template.csv" className="text-sm underline">
              Download Template
            </a>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Kolom: material_id, basis (m2/m1/unit), qty_per_basis, is_optional.
          </p>
        </div>
      </div>
    </div>
  )
}
