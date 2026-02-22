'use client'

import { useEffect, useState } from 'react'
import { Calculator, Ruler, MapPin, Package, AlertCircle, FileDown } from 'lucide-react'
import { calculateCanopyPrice, formatRupiah, formatNumber } from '@/lib/calculator'
import type { CalculatorInput, CalculatorResult, Material, Zone, Catalog, CatalogAddon } from '@/lib/types'
import { createEstimation } from '@/app/actions/estimations'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import QuotationPDF from './QuotationPDF'

function getFriendlySupabaseError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  const lower = message.toLowerCase()

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Kalkulator tidak dapat terhubung ke server data. Periksa koneksi internet Anda atau coba beberapa saat lagi.'
  }

  if (lower.includes('supabase') || lower.includes('fetch')) {
    return 'Terjadi gangguan pada koneksi ke server data. Silakan coba beberapa saat lagi atau hubungi tim Kokohin.'
  }

  return fallback
}

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <button className="btn btn-outline w-full">Loading PDF...</button>,
  }
)

const KOKOHIN_WA = process.env.NEXT_PUBLIC_WA_NUMBER ?? '6281234567890'

export default function CanopyCalculator({ hideTitle = false }: { hideTitle?: boolean }) {
  const searchParams = useSearchParams()
  const [input, setInput] = useState<CalculatorInput>({
    panjang: 5,
    lebar: 3,
    jenis: 'standard'
  })
  
  const [result, setResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [pendingResult, setPendingResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [leadInfo, setLeadInfo] = useState<{ name: string; whatsapp: string }>({ name: '', whatsapp: '' })
  const [isLeadCaptured, setIsLeadCaptured] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [catalogData, setCatalogData] = useState<Catalog | null>(null)
  const [catalogAddons, setCatalogAddons] = useState<(CatalogAddon & { material?: Material })[]>([])
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [dataError, setDataError] = useState<string | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  const handleInputChange = (field: keyof CalculatorInput, value: CalculatorInput[typeof field]) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleCalculate = async () => {
    setLoading(true)
    setCalcError(null)
    try {
      // ESCAPE HATCH: Jika custom, simpan ke pendingResult untuk lead capture
      if (input.jenis === 'custom') {
        setPendingResult({
          luas: input.panjang * input.lebar,
          materialCost: 0,
          wasteCost: 0,
          totalHpp: 0,
          marginPercentage: 0,
          markupPercentage: 0,
          flatFee: 0,
          totalSellingPrice: 0,
          estimatedPrice: 0,
          breakdown: [],
          isCustom: true
        })
        setIsLeadCaptured(false)
        return
      }
      
      const calculation = await calculateCanopyPrice({ ...input, selectedAddonIds })
      setPendingResult(calculation)
      setIsLeadCaptured(false)
    } catch (error) {
      console.error('Error menghitung estimasi:', error)
      const fallback = 'Gagal menghitung estimasi. Silakan coba beberapa saat lagi.'
      const friendly = getFriendlySupabaseError(
        error,
        error instanceof Error ? error.message : fallback
      )
      setCalcError(friendly)
    } finally {
      setLoading(false)
    }
  }

  const handleLeadSubmit = async () => {
    if (!leadInfo.name.trim() || !leadInfo.whatsapp.trim()) {
      setCalcError('Harap isi nama dan nomor WhatsApp')
      return
    }

    // Validasi format WhatsApp (Indonesia)
    const whatsappRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
    if (!whatsappRegex.test(leadInfo.whatsapp.replace(/\s+/g, ''))) {
      setCalcError('Format nomor WhatsApp tidak valid. Gunakan format Indonesia (08xxx)')
      return
    }

    const supabase = createClient()
    let projectIdForRollback: string | null = null
    
    try {
      const { data: project, error: projectError } = await supabase
        .from('erp_projects')
        .insert({
          customer_name: leadInfo.name,
          phone: leadInfo.whatsapp,
          address: '',
          zone_id: input.zoneId || null,
          custom_notes: input.jenis === 'custom' ? input.customNotes || 'Permintaan custom via kalkulator' : null,
          status: input.jenis === 'custom' ? 'Need Manual Quote' : 'New'
        })
        .select()
        .single()

      if (projectError) throw projectError
      
      projectIdForRollback = project.id
      setProjectId(project.id)

      if (input.jenis === 'standard' && pendingResult && !pendingResult.isCustom) {
        await createEstimation(project.id, {
          total_hpp: pendingResult.totalHpp,
          margin_percentage: pendingResult.marginPercentage,
          total_selling_price: pendingResult.totalSellingPrice,
          status: 'draft'
        })
      }

      setResult(pendingResult)
      setIsLeadCaptured(true)
      setCalcError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '')
      const normalized = message.toLowerCase()
      const isDuplicateV1 =
        normalized.includes('estimasi v1 untuk proyek ini sudah ada') ||
        normalized.includes('unique_estimations_project_version') ||
        normalized.includes('duplicate key') ||
        normalized.includes('unique constraint')

      // Rollback: hapus project yang sudah dibuat jika estimation gagal (kecuali duplicate V1)
      if (projectIdForRollback && !isDuplicateV1) {
        try {
          await supabase.from('erp_projects').delete().eq('id', projectIdForRollback)
          console.log('Rollback: deleted orphan project', projectIdForRollback)
        } catch (rollbackError) {
          console.error('Gagal melakukan rollback (menghapus project):', rollbackError)
        }
      }

      if (isDuplicateV1) {
        setCalcError('Estimasi V1 untuk proyek ini sudah pernah dibuat. Silakan cek riwayat estimasi di dashboard admin.')
        return
      }

      console.error('Error menyimpan lead atau estimasi:', error)
      const fallback =
        'Gagal menyimpan data ke sistem. Silakan coba beberapa saat lagi atau hubungi kami via WhatsApp.'
      const friendly = getFriendlySupabaseError(error, fallback)
      setCalcError(friendly)
    }
  }

  const handleLeadChange = (field: 'name' | 'whatsapp', value: string) => {
    setLeadInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleBookSurvey = () => {
    // Nomor WhatsApp admin (bisa diambil dari environment variable atau config)
    const adminPhone = KOKOHIN_WA
    
    // Buat pesan dengan detail project
    const area = result ? formatNumber(result.luas) : 'N/A'
    const price = result ? formatRupiah(result.estimatedPrice) : 'N/A'
    const customerName = leadInfo.name || 'Customer'
    
    let message = `Halo Admin Kokohin, saya mau booking jadwal survei untuk proyek kanopi.%0A%0A`
    message += `Nama: ${customerName}%0A`
    message += `Luas Area: ${area} m²%0A`
    message += `Estimasi Harga: ${price}%0A`
    
    if (projectId) {
      message += `ID Lead: ${projectId}%0A`
    }
    
    message += `%0ASilahkan konfirmasi ketersediaan jadwal survei. Terima kasih!`
    
    // Buka WhatsApp
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank')
  }

  const handleCustomConsultation = () => {
    // Nomor WhatsApp admin (bisa diambil dari environment variable atau config)
    const adminPhone = KOKOHIN_WA
    
    // Buat pesan khusus untuk custom request
    const customerName = leadInfo.name || 'Customer'
    const customNotes = input.customNotes || 'Tidak ada catatan spesifik'
    
    let message = `Halo Admin Kokohin, saya ingin konsultasi untuk desain custom kanopi.%0A%0A`
    message += `Nama: ${customerName}%0A`
    message += `Catatan: ${customNotes}%0A`
    
    if (projectId) {
      message += `ID Lead: ${projectId}%0A`
    }
    
    message += `%0ASilahkan hubungi saya untuk diskusi lebih lanjut. Terima kasih!`
    
    // Buka WhatsApp
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank')
  }
  
  const handleReset = () => {
    setInput({
      panjang: 5,
      lebar: 3,
      jenis: 'standard'
    })
    setResult(null)
    setPendingResult(null)
    setLeadInfo({ name: '', whatsapp: '' })
    setIsLeadCaptured(false)
    setProjectId(null)
    setCalcError(null)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const [
          { data: zonesData, error: zonesError },
          { data: materialsData, error: materialsError },
          { data: logoSetting },
        ] = await Promise.all([
          supabase.from('zones').select('*').order('name'),
          supabase.from('materials').select('*').eq('category', 'frame').eq('is_active', true).order('name'),
          supabase.from('site_settings').select('value').eq('key', 'logo_url').maybeSingle(),
        ])
        if (zonesError || materialsError) {
          throw new Error('Gagal memuat data kalkulator')
        }
        const safeZones = zonesData ?? []
        const safeMaterials = materialsData ?? []
        setZones(safeZones)
        setMaterials(safeMaterials)
         const typedLogo = logoSetting as { value?: string } | null
         setLogoUrl(typedLogo?.value ?? null)
        if (safeMaterials.length > 0) {
          setInput((prev) => ({ ...prev, materialId: prev.materialId ?? safeMaterials[0].id }))
        }
      } catch (error) {
        console.error('Error memuat data kalkulator:', error)
        const fallback = 'Gagal memuat data kalkulator. Silakan coba beberapa saat lagi.'
        const friendly = getFriendlySupabaseError(error, fallback)
        setDataError(friendly)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const catalogParam = searchParams.get('catalog')
    if (catalogParam) {
      setInput((prev) => ({ ...prev, catalogId: catalogParam }))
    }
  }, [searchParams])

  useEffect(() => {
    const fetchCatalogData = async () => {
      if (!input.catalogId) {
        setCatalogData(null)
        setCatalogAddons([])
        setSelectedAddonIds([])
        return
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('catalogs')
          .select('*, atap:atap_id(*), rangka:rangka_id(*), catalog_addons(id, basis, qty_per_basis, is_optional, material:material_id(id, name, base_price_per_unit, unit, category))')
          .eq('id', input.catalogId)
          .eq('is_active', true)
          .maybeSingle()

        if (error || !data) {
          setCatalogData(null)
          setCatalogAddons([])
          setSelectedAddonIds([])
          return
        }

        type CatalogWithAddons = Catalog & {
          catalog_addons?: (CatalogAddon & { material?: Material | Material[] })[]
        }
        const typed = data as CatalogWithAddons
        const normalizedAddons =
          (typed.catalog_addons ?? []).map(a => ({
            ...a,
            material: Array.isArray(a.material) ? a.material[0] : a.material
          }))
        setCatalogData(typed as Catalog)
        setCatalogAddons(normalizedAddons)
        setSelectedAddonIds([])

        if (data.rangka_id) {
          setInput((prev) => ({ ...prev, materialId: data.rangka_id }))
        }

        setTimeout(() => {
          const calculatorElement = document.getElementById('canopy-calculator')
          if (calculatorElement) {
            calculatorElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      } catch {
        setCatalogData(null)
      }
    }

    fetchCatalogData()
  }, [input.catalogId])
  
  const activeZoneName =
    zones.find((zone) => zone.id === input.zoneId)?.name ?? null

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8" id="canopy-calculator">
      {!hideTitle && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calculator className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-dark">
                Kalkulator Harga Kanopi
              </h2>
              <p className="text-gray-600 mt-2">
                Hitung estimasi biaya kanopi Anda secara instan dengan mempertimbangkan waste material dan zona lokasi.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Ruler className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-primary-dark">Dimensi Kanopi</h3>
            </div>
            
            {input.jenis !== 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Panjang (meter)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={input.panjang}
                    onChange={(e) => handleInputChange('panjang', parseFloat(e.target.value) || 0)}
                    className="input"
                    placeholder="Contoh: 5"
                  />
                </div>
                
                <div>
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Lebar (meter)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={input.lebar}
                    onChange={(e) => handleInputChange('lebar', parseFloat(e.target.value) || 0)}
                    className="input"
                    placeholder="Contoh: 3"
                  />
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-200">
              <label className="label">
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Jenis Permintaan
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('jenis', 'standard')
                  }}
                  className={`flex-1 btn ${input.jenis === 'standard' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Package className="w-4 h-4" />
                  Standard (Auto Kalkulasi)
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('jenis', 'custom')
                  }}
                  className={`flex-1 btn ${input.jenis === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Custom (Manual Quote)
                </button>
              </div>
              
              {input.jenis === 'custom' && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Permintaan Custom</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        Untuk permintaan custom dengan spesifikasi khusus, tim kami akan menghubungi Anda untuk memberikan penawaran manual.
                      </p>
                      <textarea
                        value={input.customNotes || ''}
                        onChange={(e) => handleInputChange('customNotes', e.target.value)}
                        className="input mt-3"
                        rows={3}
                        placeholder="Deskripsi Ide"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {input.jenis !== 'custom' && (
              <div className="pt-4 border-t border-gray-200">
                {catalogData && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-blue-800 font-medium">
                          <Package className="w-4 h-4" />
                          Material diisi otomatis dari katalog
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          Katalog: <span className="font-semibold">{catalogData.title}</span>
                          {catalogData.atap && ` • Atap: ${catalogData.atap.name}`}
                          {catalogData.rangka && ` • Rangka: ${catalogData.rangka.name}`}
                        </p>
                        {catalogAddons.some(a => a.is_optional) && (
                          <div className="mt-3">
                            <p className="text-sm text-blue-700 font-medium mb-2">Komponen Tambahan (Opsional)</p>
                            <div className="space-y-2">
                              {catalogAddons.filter(a => a.is_optional).map((a) => {
                                const basis = (a.basis ?? 'm2') as 'm2' | 'm1' | 'unit'
                                const qtyBasis = typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0
                                const pricePerBasis = (a.material?.base_price_per_unit || 0) * qtyBasis
                                const checked = selectedAddonIds.includes(a.id)
                                return (
                                  <label key={a.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded border">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = e.target.checked
                                            ? [...selectedAddonIds, a.id]
                                            : selectedAddonIds.filter(id => id !== a.id)
                                          setSelectedAddonIds(next)
                                        }}
                                      />
                                      <span className="text-sm">{a.material?.name}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-blue-700 font-semibold">
                                        + {formatRupiah(pricePerBasis)}/{basis}
                                      </div>
                                      <div className="text-[11px] text-gray-500">
                                        {basis === 'm2' ? 'mengikuti luas (p×l)' : basis === 'm1' ? 'mengikuti panjang (p)' : 'per unit'}
                                      </div>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInput(prev => ({ ...prev, catalogId: undefined, materialId: undefined }))
                          setCatalogData(null)
                          setCatalogAddons([])
                          setSelectedAddonIds([])
                        }}
                        className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
                <label className="label">
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Material Rangka (Opsional)
                  </span>
                </label>
                <select
                  value={input.materialId || ''}
                  onChange={(e) => handleInputChange('materialId', e.target.value || undefined)}
                  className="input mb-4"
                >
                  <option value="">Pilih material rangka...</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.unit})
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Zona Lokasi (Opsional)
                  </span>
                </label>
                <select
                  value={input.zoneId || ''}
                  onChange={(e) => handleInputChange('zoneId', e.target.value || undefined)}
                  className="input"
                >
                  <option value="">Pilih zona lokasi...</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} (+{zone.markup_percentage}%{zone.flat_fee > 0 ? `, +${formatRupiah(zone.flat_fee)}` : ''})
                    </option>
                  ))}
                </select>
                {dataError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {dataError}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex-1 btn btn-primary text-lg py-4"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Menghitung...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Hitung Estimasi
                  </>
                )}
              </button>
              
              <button
                onClick={handleReset}
                type="button"
                className="btn btn-outline py-4"
              >
                Reset
              </button>
            </div>
            {calcError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {calcError}
              </div>
            )}
          </div>
          
          {/* Information Panel */}
          <div className="card bg-primary-light/30 border-primary/20">
            <h4 className="font-bold text-primary-dark mb-4 text-lg">Catatan Penting:</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  <span className="font-semibold">Waste Calculation:</span> Perhitungan menggunakan <code className="bg-gray-100 px-1.5 py-0.5 rounded">Math.ceil()</code> untuk pembulatan ke atas material batangan/lembaran.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  <span className="font-semibold">Escape Hatch:</span> Permintaan custom akan langsung ditandai <span className="font-semibold text-primary">&quot;Need Manual Quote&quot;</span> dan bypass auto-kalkulasi.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <span className="text-gray-700">
                  Harga merupakan estimasi awal. Survey lapangan mungkin diperlukan untuk akurasi maksimal.
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="card bg-gradient-to-br from-primary-dark to-primary-dark/90 text-white">
              <h3 className="text-2xl font-bold mb-6">Hasil Perhitungan</h3>
              
              {pendingResult && !isLeadCaptured ? (
                /* LEAD CAPTURE FORM */
                <div className="space-y-6">
                  <div className="p-4 bg-white/10 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-yellow-300" />
                      <h4 className="text-lg font-bold">Lengkapi Data Anda</h4>
                    </div>
                    <p className="text-white/90 mb-4">
                      Untuk melihat estimasi harga, harap lengkapi data kontak Anda terlebih dahulu.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Nama Lengkap *</label>
                        <input
                          type="text"
                          value={leadInfo.name}
                          onChange={(e) => handleLeadChange('name', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Nama lengkap Anda"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Nomor WhatsApp *</label>
                        <input
                          type="tel"
                          value={leadInfo.whatsapp}
                          onChange={(e) => handleLeadChange('whatsapp', e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="08xxx (format Indonesia)"
                        />
                        <p className="text-white/60 text-xs mt-2">
                          Contoh: 081234567890
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLeadSubmit}
                    disabled={!leadInfo.name.trim() || !leadInfo.whatsapp.trim()}
                    className="w-full btn bg-primary text-white hover:bg-primary/90 font-bold py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lihat Estimasi Harga
                  </button>
                  
                  {calcError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">{calcError}</p>
                    </div>
                  )}
                </div>
              ) : result ? (
                result.isCustom ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-white/10 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-yellow-300" />
                        <h4 className="text-lg font-bold">Ide Anda Unik!</h4>
                      </div>
                      <p className="text-white/90">
                        Tim Engineer kami perlu menghitung material secara spesifik. Tim sales akan menghubungi Anda untuk memberikan penawaran manual berdasarkan ide custom yang Anda minta.
                      </p>
                      {input.customNotes && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg">
                          <p className="text-sm font-medium mb-1">Catatan Anda:</p>
                          <p className="text-white/80 text-sm">{input.customNotes}</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleCustomConsultation}
                      className="w-full btn bg-white text-primary-dark hover:bg-white/90 font-bold py-4"
                    >
                      Konsultasi Custom
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(result.warnings && result.warnings.length > 0) && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-yellow-800">Rekomendasi Teknis</h4>
                            <ul className="mt-2 space-y-1">
                              {result.warnings.map((warning, idx) => (
                                <li key={idx} className="text-sm text-yellow-700 list-disc list-inside">
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.suggestedItems && result.suggestedItems.length > 0 && (
                      <div className="p-4 bg-white/10 border border-white/20 rounded-lg">
                        <h4 className="font-semibold mb-2 text-white">Item Tambahan yang Direkomendasikan</h4>
                        <ul className="space-y-2 text-sm">
                          {result.suggestedItems.map((item, idx) => (
                            <li key={idx} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">{item.name}</span>
                                <span className="text-white/80">{formatRupiah(item.estimatedCost)}</span>
                              </div>
                              <p className="text-white/80 text-xs leading-snug">{item.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-white/20">
                        <span>Luas Area</span>
                        <span className="font-bold">{formatNumber(result.luas)} m²</span>
                      </div>
                      
                      <div className="pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg">Estimasi Harga</span>
                          <span className="text-2xl font-bold">{formatRupiah(result.estimatedPrice)}</span>
                        </div>
                        <p className="text-white/70 text-sm mt-2">
                          *Harga sudah termasuk PPN 11%
                        </p>
                      </div>
                    </div>
                    
                    {/* Disclaimer Text */}
                    <div className="pt-6 border-t border-white/20">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-white/80 text-sm italic">
                          &quot;Estimasi Harga Transparan, Tanpa Biaya Siluman. Angka simulasi di atas adalah perkiraan awal berdasarkan ukuran dan spesifikasi material yang kamu pilih. Harga final yang fixed akan kami kunci ke dalam kontrak kerja setelah tim Kokohin melakukan survei ke lokasimu secara langsung.&quot;
                        </p>
                      </div>
                    </div>
                    
                    {/* CTA Buttons */}
                    <div className="space-y-3 pt-6">
                      <button
                        onClick={handleBookSurvey}
                        className="w-full btn bg-primary text-white hover:bg-primary/90 font-bold py-4"
                      >
                        Book Jadwal Survei
                      </button>

                      {/* PDF Download Button */}
                      <PDFDownloadLink
                        document={
                          <QuotationPDF 
                            result={result} 
                            leadInfo={leadInfo} 
                            projectId={projectId}
                            zoneName={activeZoneName}
                            logoUrl={logoUrl}
                            specifications={result.breakdown?.map(item => item.name).join(', ') || 'Paket Pekerjaan Kanopi'}
                            projectArea={result.luas}
                            projectType={'Pekerjaan Pembuatan Kanopi'}
                            areaUnit="m²"
                          />
                        }
                        fileName={`Penawaran_Kokohin_${leadInfo.name.replace(/\s+/g, '_')}.pdf`}
                        className="w-full btn bg-white/20 text-white hover:bg-white/30 font-bold py-4 flex items-center justify-center gap-2"
                      >
                        {({ loading }) => (
                          <>
                            <FileDown className="w-5 h-5" />
                            {loading ? 'Menyiapkan PDF...' : 'Download Penawaran PDF'}
                          </>
                        )}
                      </PDFDownloadLink>

                      <button
                        onClick={() => window.location.href = '/katalog'}
                        className="w-full btn bg-transparent border border-white/30 text-white hover:bg-white/10 font-bold py-4"
                      >
                        Lihat Katalog Paket
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                    <Calculator className="w-8 h-8 text-white/60" />
                  </div>
                  <p className="text-white/80">
                    Masukkan dimensi kanopi Anda dan klik &quot;Hitung Estimasi&quot; untuk melihat perhitungan detail.
                  </p>
                </div>
              )}
            </div>
            
            {/* Quick Info */}
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <h4 className="font-bold text-primary-dark mb-2">Garansi & Layanan</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Garansi material 1 tahun</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Survey & konsultasi gratis</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Free maintenance 1 tahun</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
