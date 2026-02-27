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

// import styles from '../../page.module.css'
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
  const finishingList = allMaterials?.filter(m => m.category === 'finishing') ?? [];
  const isianList = allMaterials?.filter(m => m.category === 'isian') ?? [];

  // Fetch catalog-specific data
  const [{ data: addons }, { data: hppComponentRows }] = await Promise.all([
    supabase
      .from('catalog_addons')
      .select('id, material_id, basis, qty_per_basis, is_optional, material:material_id(id, name, base_price_per_unit, unit, category)')
      .eq('catalog_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('catalog_hpp_components')
      .select('id, material_id, quantity, section')
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

  const basePrice = (catalog as { base_price_per_m2?: number | null }).base_price_per_m2 ?? 0
  const hppPerUnit = (catalog as { hpp_per_unit?: number | null }).hpp_per_unit ?? 0
  
  // Recalculate HPP Ratio carefully
  const hppRatio = basePrice > 0 ? (Number(hppPerUnit) / basePrice) * 100 : 0
  const isHppTooHigh = hppRatio > 80
  const isHppWarning = hppRatio > 75

  const unit = ((catalog as { base_price_unit?: 'm2'|'m1'|'unit' | null }).base_price_unit ?? 'm2') as 'm2'|'m1'|'unit'

  interface CatalogFormMetadata {
    title: string
    category: string
    atap_id: string
    rangka_id: string
    finishing_id: string
    isian_id: string
    base_price_per_m2: number
    base_price_unit: string
    margin_percentage: number
    use_std_calculation: boolean
    std_calculation: number
    labor_cost: number
    transport_cost: number
    is_active: boolean
  }

  const catalogMetadata = catalog as unknown as CatalogFormMetadata

  const autosaveBaseline: Record<string, string> = {
    title: catalogMetadata.title ?? '',
    category: catalogMetadata.category ?? '',
    atap_id: catalogMetadata.atap_id ?? '',
    rangka_id: catalogMetadata.rangka_id ?? '',
    base_price_per_m2: String(catalogMetadata.base_price_per_m2 ?? ''),
    base_price_unit: unit,
    margin_percentage: String(catalogMetadata.margin_percentage ?? 0),
    use_std_calculation: catalogMetadata.use_std_calculation ? 'on' : '',
    std_calculation: String(catalogMetadata.std_calculation ?? 1),
    labor_cost: String(catalogMetadata.labor_cost ?? 0),
    transport_cost: String(catalogMetadata.transport_cost ?? 0),
    is_active: catalogMetadata.is_active ? 'on' : '',
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    Informasi Katalog
                  </h2>
                </div>
                
                {errorMessage && (
                  <div className="mx-6 mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {decodeURIComponent(errorMessage)}
                  </div>
                )}
                {importResult && (
                  <div className="mx-6 mt-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {decodeURIComponent(importResult)}
                  </div>
                )}
                {importDetail && (
                  <div className="mx-6 mt-2 p-4 border border-gray-200 rounded-xl bg-gray-50 text-sm">
                    <div className="font-bold text-gray-700 mb-2">Detil Import:</div>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
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
                          className="inline-flex items-center px-4 py-2 rounded-lg text-white font-medium text-xs hover:bg-red-700 transition-colors"
                          style={{ backgroundColor: '#E30613' }}
                        >
                          Download Log (JSON)
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CatalogTitleField defaultValue={catalog.title} />

                    <CatalogBaseFields
                      key={`${catalog.id}-${catalog.atap_id}-${catalog.rangka_id}-${catalogMetadata.finishing_id || ''}-${catalogMetadata.isian_id || ''}`}
                      atapList={atapList ?? []}
                      rangkaList={rangkaList ?? []}
                      finishingList={finishingList ?? []}
                      isianList={isianList ?? []}
                      initialCategory={catalog.category ?? ''}
                      initialAtapId={catalog.atap_id || ''}
                      initialRangkaId={catalog.rangka_id || ''}
                      initialFinishingId={catalogMetadata.finishing_id || ''}
                      initialIsianId={catalogMetadata.isian_id || ''}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-red-50 rounded-lg">
                      <Info className="w-4 h-4 text-[#E30613]" />
                    </div>
                    Formulasi HPP
                  </h2>
                </div>
                <div className="p-6 space-y-8">
                  <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Panduan Pengisian HPP</p>
                      <p className="text-blue-600/80">
                        Susun komponen material dan kuantitas di sini untuk menghitung HPP per satuan secara otomatis. 
                        Nilai HPP per Satuan akan terisi dan tampil di tab Harga Jual.
                      </p>
                    </div>
                  </div>
                  
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-3 border-b border-gray-100">
                        <Info className="w-4 h-4 text-gray-400" /> Pengaturan Dasar HPP
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        <label className="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                          <input
                            type="checkbox"
                            name="use_std_calculation"
                            defaultChecked={!!(catalog as { use_std_calculation?: boolean }).use_std_calculation}
                            className="w-5 h-5 text-[#E30613] border-gray-300 rounded focus:ring-[#E30613]"
                          />
                          <div>
                            <span className="text-sm font-bold text-gray-800 block">Gunakan Standar Luas</span>
                            <span className="text-xs text-gray-500 block">Bagi total biaya dengan luas standar</span>
                          </div>
                        </label>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Luas Standar (m²)</label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              name="std_calculation"
                              step="0.01"
                              min="0.01"
                              defaultValue={(catalog as { std_calculation?: number }).std_calculation ?? 1}
                              className="w-full px-3 py-2 border border-gray-200 rounded-l-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                            />
                            <span className="px-3 py-2 bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg text-sm text-gray-500 font-medium">m²</span>
                          </div>
                        </div>

                        <div className="space-y-4 border-l border-gray-100 pl-6">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Biaya Tukang (Labor)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
                              <input
                                type="number"
                                name="labor_cost"
                                step="1000"
                                min="0"
                                defaultValue={(catalog as { labor_cost?: number }).labor_cost ?? 0}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Biaya Transport</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
                              <input
                                type="number"
                                name="transport_cost"
                                step="1000"
                                min="0"
                                defaultValue={(catalog as { transport_cost?: number }).transport_cost ?? 0}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  <CatalogHppEditor
                    materials={allMaterials ?? []}
                    initialComponents={hppComponents ?? []}
                  />
                </div>
              </div>
            </div>

            <div id="biaya">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    Harga Jual & Margin
                  </h2>
                </div>
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Harga Jual per Satuan (Rp) *</label>
                        <p className="text-xs text-gray-500 mb-2">
                          Harga final ke customer (termasuk HPP & Margin).
                        </p>
                        <div className="relative">
                          <span className="absolute left-4 top-3.5 text-gray-400 font-bold">Rp</span>
                          <input
                            type="number"
                            name="base_price_per_m2"
                            defaultValue={catalog.base_price_per_m2}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                            placeholder="0"
                            min={0}
                            step={1000}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Satuan</label>
                        <p className="text-xs text-gray-500 mb-2">
                          Unit perhitungan harga.
                        </p>
                        <select
                          name="base_price_unit"
                          defaultValue={catalog.base_price_unit || 'm2'}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                        >
                          <option value="m2">m² (Per Meter Persegi)</option>
                          <option value="m1">m¹ (Per Meter Lari)</option>
                          <option value="unit">unit (Per Unit/Pcs)</option>
                        </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">HPP per Satuan (Kalkulasi)</label>
                        <div className={`w-full px-4 py-3 rounded-xl border flex justify-between items-center ${
                          isHppTooHigh 
                            ? 'bg-red-50 border-red-200 text-red-700' 
                            : isHppWarning 
                              ? 'bg-orange-50 border-orange-200 text-orange-700' 
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}>
                            <span className="font-mono font-bold text-lg">
                              {typeof (catalog as { hpp_per_unit?: number | null }).hpp_per_unit === 'number'
                                ? `Rp ${(Number((catalog as { hpp_per_unit?: number | null }).hpp_per_unit) || 0).toLocaleString('id-ID')}`
                                : '-'}
                            </span>
                            {isHppWarning && (
                              <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-white/50 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                {hppRatio.toFixed(1)}%
                              </div>
                            )}
                        </div>
                        
                        {isHppWarning && (
                          <p className={`text-xs mt-1.5 font-medium flex items-center gap-1.5 ${isHppTooHigh ? 'text-red-600' : 'text-orange-600'}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {isHppTooHigh 
                              ? `Bahaya: HPP memakan ${hppRatio.toFixed(1)}% dari Harga Jual!` 
                              : `Perhatian: HPP memakan ${hppRatio.toFixed(1)}% dari Harga Jual.`}
                          </p>
                        )}

                        <div className="mt-3">
                          <details className="group">
                            <summary className="text-xs flex items-center gap-1 cursor-pointer select-none text-gray-500 hover:text-[#E30613] transition-colors font-medium">
                              <Info className="w-3 h-3" />
                              Lihat Rincian Perhitungan HPP
                            </summary>
                            <div className="mt-2 p-4 border border-gray-100 rounded-xl bg-gray-50/50 text-xs space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                              <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Total Material:</span>
                                <span className="font-mono font-medium">Rp {(hppComponents.reduce((sum, c) => sum + (c.material?.base_price_per_unit || 0) * (c.quantity || 0), 0)).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Biaya Tukang (Labor):</span>
                                <span className="font-mono font-medium">Rp {(catalog.labor_cost || 0).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Biaya Transport:</span>
                                <span className="font-mono font-medium">Rp {(catalog.transport_cost || 0).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between pt-1">
                                <span className="font-bold text-gray-700">Total Biaya Dasar:</span>
                                <span className="font-mono font-bold text-gray-900">Rp {((hppComponents.reduce((sum, c) => sum + (c.material?.base_price_per_unit || 0) * (c.quantity || 0), 0)) + (catalog.labor_cost || 0) + (catalog.transport_cost || 0)).toLocaleString('id-ID')}</span>
                              </div>
                              {catalog.use_std_calculation && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                                  <div className="flex justify-between text-blue-700 font-medium">
                                    <span>HPP per Unit (÷ {catalog.std_calculation} m²):</span>
                                    <span className="font-mono font-bold">Rp {(((hppComponents.reduce((sum, c) => sum + (c.material?.base_price_per_unit || 0) * (c.quantity || 0), 0)) + (catalog.labor_cost || 0) + (catalog.transport_cost || 0)) / (catalog.std_calculation || 1)).toLocaleString('id-ID')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target Margin (%)</label>
                         <p className="text-xs text-gray-500 mb-2">
                          Profit margin yang diharapkan.
                        </p>
                        <div className="relative">
                          <input
                            type="number"
                            name="margin_percentage"
                            defaultValue={(catalog as { margin_percentage?: number }).margin_percentage ?? 0}
                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] transition-all"
                            placeholder="0"
                            min={0}
                            step={1}
                          />
                          <span className="absolute right-4 top-3.5 text-gray-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 italic">
                          * Margin hanya sebagai referensi, harga jual final tetap mengikuti input &quot;Harga Jual per Satuan&quot;.
                        </p>
                      </div>
                    </div>
                </div>
              </div>
            </div>

            <div id="addons">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <Wrench className="w-4 h-4 text-purple-600" />
                    </div>
                    Komponen Tambahan (Opsional)
                  </h2>
                </div>
                <div className="p-6 space-y-8">
                  <div className="flex items-start gap-3 p-4 bg-purple-50/50 border border-purple-100 rounded-lg text-sm text-purple-800">
                    <Wrench className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Panduan Addons</p>
                      <p className="text-purple-600/80">
                        Item di sini bersifat opsional dan dapat dipilih oleh sales/customer di kalkulator.
                        Contoh: upgrade bahan atap, tambahan aksesoris, dll.
                      </p>
                    </div>
                  </div>

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
                </div>
              </div>
            </div>

            <div id="import">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <UploadCloud className="w-4 h-4 text-gray-600" />
                    </div>
                    Import Addons dari CSV
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200 border-dashed">
                    <input type="hidden" name="catalog_id" value={catalog.id} />
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload File CSV</label>
                      <input 
                        type="file" 
                        name="file" 
                        accept=".csv" 
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-[#E30613]/10 file:text-[#E30613]
                          hover:file:bg-[#E30613]/20
                          cursor-pointer" 
                      />
                    </div>
                    
                    <div className="w-full md:w-auto">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mode Import</label>
                      <select name="mode" defaultValue="replace" className="w-full px-3 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:border-[#E30613]">
                        <option value="replace">Replace (Hapus lama & Ganti baru)</option>
                        <option value="append">Append (Tambah ke yang sudah ada)</option>
                        <option value="upsert">Upsert (Update jika ada, Tambah jika baru)</option>
                      </select>
                    </div>

                    <div className="w-full md:w-auto pt-6">
                      <label className="inline-flex items-center gap-2 text-sm bg-white px-3 py-2 border rounded-lg cursor-pointer hover:border-gray-300 transition-colors w-full md:w-auto justify-center">
                        <input type="checkbox" name="preview" value="1" className="text-[#E30613] focus:ring-[#E30613] rounded" />
                        <span>Preview Data Saja</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <a href="/templates/catalog_addons_template.csv" className="text-sm font-medium text-[#E30613] hover:underline flex items-center gap-1">
                      <UploadCloud className="w-4 h-4" /> Download Template CSV
                    </a>
                    <button 
                      type="submit" 
                      formAction={importCatalogAddons} 
                      className="px-6 py-2.5 rounded-lg text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2" 
                      style={{ backgroundColor: '#E30613' }}
                    >
                      <UploadCloud className="w-4 h-4" />
                      Proses Import CSV
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-4 italic">
                    * Format kolom wajib: material_id, basis (m2/m1/unit), qty_per_basis, is_optional.
                  </p>
                </div>
              </div>
            </div>

            <div id="preview">
              <div className="mt-6 bg-gradient-to-br from-[#FFF5F6] to-white border border-[#E30613]/20 rounded-xl p-1 shadow-sm">
                <div className="bg-white/50 backdrop-blur-sm p-5 rounded-lg border border-[#E30613]/10">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E30613]/10">
                    <div className="p-2 bg-[#E30613]/10 rounded-full">
                      <Eye className="w-5 h-5 text-[#E30613]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Live Preview Harga</h3>
                      <p className="text-xs text-gray-500">Simulasi perhitungan harga jual real-time</p>
                    </div>
                  </div>
                  <CatalogEstimatePreview formId="editCatalogForm" materials={allMaterials ?? []} />
                </div>
              </div>
            </div>
          </CatalogTabs>
        </form>
      </div>
    </div>
  )
}
