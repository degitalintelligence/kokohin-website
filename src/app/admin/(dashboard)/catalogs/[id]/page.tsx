import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, CheckCircle, Info, DollarSign, Wrench, Eye, UploadCloud } from 'lucide-react'
import DeleteCatalogButton from '../components/DeleteCatalogButton'
import CatalogAddonsEditor from '../components/CatalogAddonsEditor'
import CatalogBaseFields from '../components/CatalogBaseFields'
import CatalogEstimatePreview from '../components/CatalogEstimatePreview'
import CatalogTabs from '../components/CatalogTabs'
import CatalogHppEditor from '../components/CatalogHppEditor'
import CatalogSaveButton from '../components/CatalogSaveButton'
import CatalogEditUXController from '../components/CatalogEditUXController'
import CatalogDetailAnchorNav from '../components/CatalogDetailAnchorNav'
import CatalogTitleField from '../components/CatalogTitleField'
import CatalogAutosaveIndicator from '../components/CatalogAutosaveIndicator'

import styles from '../../page.module.css'
import { updateCatalog, importCatalogAddons } from '@/app/actions/catalogs'

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

  // Fetch all active materials in one go for efficiency
  const { data: allMaterials } = await supabase
    .from('materials')
    .select('id, name, category, base_price_per_unit, unit')
    .eq('is_active', true)
    .order('name');

  // Process materials in-memory
  const atapList = allMaterials?.filter(m => m.category === 'atap') ?? [];
  const rangkaList = allMaterials?.filter(m => m.category === 'frame') ?? [];

  // Fetch catalog-specific data
  const [{ data: addons }, { data: hppComponentRows }] = await Promise.all([
    supabase
      .from('catalog_addons')
      .select('id, material_id, basis, qty_per_basis, is_optional, material:material_id(id, name, base_price_per_unit, unit, category)')
      .eq('catalog_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('catalog_hpp_components')
      .select('id, material_id, quantity')
      .eq('catalog_id', id)
      .order('created_at', { ascending: true })
  ]);

  const hppMaterialIds = (hppComponentRows ?? []).map(c => c.material_id).filter(Boolean)
  const { data: hppMaterials } = await supabase.from('materials').select('id, name, base_price_per_unit, unit, category').in('id', hppMaterialIds)
  const hppMaterialMap = new Map((hppMaterials ?? []).map(m => [m.id, m]))
  const hppComponents = (hppComponentRows ?? []).map(c => ({
    ...c,
    material: hppMaterialMap.get(c.material_id)
  }))

  if (error || !catalog) {
    return (
      <div className="flex-1 h-full p-6">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Katalog Tidak Ditemukan</h1>
            <p className="text-gray-500 mt-1">Katalog dengan ID {id} tidak ditemukan</p>
          </div>
          <Link href="/admin/catalogs" className="mt-4 inline-block px-4 py-2 bg-[#E30613] text-white rounded-md hover:bg-[#c50511] transition-colors">
            ← Kembali ke Daftar Katalog
          </Link>
        </div>
      </div>
    )
  }

  const unit = ((catalog as { base_price_unit?: 'm2'|'m1'|'unit' | null }).base_price_unit ?? 'm2') as 'm2'|'m1'|'unit'

  const autosaveBaseline: Record<string, string> = {
    title: (catalog as { title?: string }).title ?? '',
    category: (catalog as { category?: string | null }).category ?? '',
    atap_id: (catalog as { atap_id?: string | null }).atap_id ?? '',
    rangka_id: (catalog as { rangka_id?: string | null }).rangka_id ?? '',
    base_price_per_m2: String((catalog as { base_price_per_m2?: number | null }).base_price_per_m2 ?? ''),
    base_price_unit: unit,
    margin_percentage: String((catalog as { margin_percentage?: number | null }).margin_percentage ?? 0),
    is_active: (catalog as { is_active?: boolean | null }).is_active ? 'on' : '',
  }

  return (
    <div className="flex-1 h-full pb-28 scroll-smooth">
      <div className="bg-white shadow-md rounded-lg p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Katalog</h1>
          <p className="text-gray-500 mt-1">Ubah detail paket {catalog.title}</p>
          <p className="mt-1 text-xs text-gray-500">Katalog &raquo; {catalog.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
          <Link href="/admin/catalogs" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center">
            ← Kembali
          </Link>
          <DeleteCatalogButton id={catalog.id} />
          <CatalogSaveButton formId="editCatalogForm" />
          </div>
          <CatalogAutosaveIndicator catalogId={catalog.id} formId="editCatalogForm" baseline={autosaveBaseline} />
        </div>
      </div>

      <div className="mt-6">
        <CatalogDetailAnchorNav />
        <CatalogEditUXController
          formId="editCatalogForm"
          errorMessage={errorMessage ?? null}
          importResult={importResult ?? null}
        />
        <form id="editCatalogForm" action={updateCatalog}>
          <input type="hidden" name="id" value={catalog.id} />
          <CatalogTabs>
            <div id="info">
              <div className="bg-white rounded-lg shadow-md mt-4">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4 text-[#E30613]" /> Informasi Katalog</h2>
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

                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CatalogTitleField defaultValue={catalog.title} />

                    <CatalogBaseFields
                      key={`${catalog.id}-${catalog.atap_id}-${catalog.rangka_id}`}
                      atapList={atapList ?? []}
                      rangkaList={rangkaList ?? []}
                      initialCategory={catalog.category ?? ''}
                      initialAtapId={catalog.atap_id || ''}
                      initialRangkaId={catalog.rangka_id || ''}
                    />

                    <div id="gambar" className={`md:col-span-2`}>
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
                        className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                      />
                      <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika tidak ingin mengubah gambar.</p>
                    </div>

                    <div id="status" className={`md:col-span-2`}>
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
                </div>
              </div>
            </div>

            <div id="hpp">
              <div className={`${styles.section}`}>
                <div className={styles.sectionHeader}>
                  <h2 className={`${styles.sectionTitle} flex items-center gap-2`}><Info className="w-4 h-4 text-[#E30613]" /> Formulasi HPP</h2>
                </div>
                <div className="p-6 space-y-8">
                  <p className="text-xs text-gray-500">
                    Susun komponen material dan kuantitas di sini untuk menghitung HPP per satuan secara otomatis. 
                    Nilai HPP per Satuan akan terisi dan tampil di tab Harga Jual.
                  </p>
                  <CatalogHppEditor
                    materials={allMaterials ?? []}
                    initialComponents={hppComponents ?? []}
                  />
                </div>
              </div>
            </div>

            <div id="biaya">
              <div className={`${styles.section}`}>
                <div className={styles.sectionHeader}>
                  <h2 className={`${styles.sectionTitle} flex items-center gap-2`}><DollarSign className="w-4 h-4 text-[#E30613]" /> Harga Jual & Margin</h2>
                </div>
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Harga Jual per Satuan (Rp) *</label>
                        <p className="text-[11px] text-gray-500 mb-1">
                          Nilai ini adalah harga jual ke customer per m²/m¹/unit, sudah termasuk semua biaya HPP dan margin.
                        </p>
                        <input
                          type="number"
                          name="base_price_per_m2"
                          defaultValue={catalog.base_price_per_m2}
                          className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
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
                          className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613] bg-white"
                        >
                          <option value="m2">m²</option>
                          <option value="m1">m¹</option>
                          <option value="unit">unit</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium mb-2">HPP per Satuan (otomatis)</label>
                        <div className="w-full px-4 py-3 rounded-md border border-gray-200 bg-gray-50">
                          {typeof (catalog as { hpp_per_unit?: number | null }).hpp_per_unit === 'number'
                            ? `Rp ${(Number((catalog as { hpp_per_unit?: number | null }).hpp_per_unit) || 0).toLocaleString('id-ID')}`
                            : '-'}
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs flex items-center gap-1 cursor-pointer select-none">
                            <Info className="w-4 h-4 text-[#E30613]" />
                            <span className="text-[#E30613] font-medium">Lihat Rincian HPP</span>
                          </summary>
                          <div className="mt-2 p-3 border rounded-md bg-white text-xs">
                            {/* This will be populated by the new HPP logic */}
                            <p>Rincian akan muncul di sini setelah formulasi HPP diisi.</p>
                          </div>
                        </details>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1">Margin (%)</label>
                        <p className="text-[11px] text-gray-500 mb-1">
                          Persentase keuntungan di atas total HPP per satuan. Atur dengan bijak agar tetap kompetitif.
                        </p>
                        <input
                          type="number"
                          name="margin_percentage"
                          defaultValue={(catalog as { margin_percentage?: number }).margin_percentage ?? 0}
                          className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:ring-0 focus:border-[#E30613]"
                          placeholder="0"
                          min={0}
                          step={1}
                        />
                      </div>
                    </div>
                </div>
              </div>
            </div>

            <div id="addons">
              <div className="bg-white rounded-lg shadow-md mt-4">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Wrench className="w-4 h-4 text-[#E30613]" /> Komponen Tambahan (Opsional)</h2>
                </div>
                <div className="p-6 space-y-8">
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
                    Item di sini bersifat opsional dan dapat dipilih oleh sales/customer di kalkulator.
                  </p>
                </div>
              </div>
            </div>

            <div id="import">
              <div className="bg-white rounded-lg shadow-md mt-4">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><UploadCloud className="w-4 h-4 text-[#E30613]" /> Import Addons dari CSV</h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3">
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
                    <button type="submit" formAction={importCatalogAddons} className="px-4 py-2 rounded-md text-white" style={{ backgroundColor: '#E30613' }}>
                      Import CSV
                    </button>
                    <a href="/templates/catalog_addons_template.csv" className="text-sm underline">
                      Download Template
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Kolom: material_id, basis (m2/m1/unit), qty_per_basis, is_optional.
                  </p>
                </div>
              </div>
            </div>

            <div id="preview">
              <div className="rounded-lg border-2 border-[#E30613] bg-[#FFF5F6] p-4">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <Eye className="w-5 h-5 text-[#E30613]" />
                  <span className="text-base font-bold text-[#E30613]">Perkiraan Harga Jual</span>
                </div>
                <CatalogEstimatePreview formId="editCatalogForm" />
              </div>
            </div>
          </CatalogTabs>
        </form>
      </div>
    </div>
  )
}
