'use client'

import { useEffect, useReducer, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calculator, Ruler, MapPin, Package, AlertCircle } from 'lucide-react'
import { calculateCanopyPrice, formatRupiah, formatNumber } from '@/lib/calculator'
import type { CalculatorInput, CalculatorResult, Material, Zone, Catalog, CatalogAddon } from '@/lib/types'
import { createProjectWithEstimation } from '@/app/actions/createProjectWithEstimation'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { generateWhatsAppLink } from '@/utils/generateWhatsAppLink'
import ResultPanel from './ResultPanel'

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

const FALLBACK_WA = '628000000000'

export default function CanopyCalculator({ hideTitle = false }: { hideTitle?: boolean }) {
  const searchParams = useSearchParams()
  type LeadState = { name: string; whatsapp: string }
  type LeadAction = { type: 'name'; value: string } | { type: 'whatsapp'; value: string } | { type: 'reset' }
  const leadReducer = (state: LeadState, action: LeadAction): LeadState => {
    if (action.type === 'name') return { ...state, name: action.value }
    if (action.type === 'whatsapp') return { ...state, whatsapp: action.value }
    return { name: '', whatsapp: '' }
  }
  const [input, setInput] = useState<CalculatorInput>({
    panjang: 5,
    lebar: 3,
    jenis: 'standard'
  })
  
  const [result, setResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [pendingResult, setPendingResult] = useState<(CalculatorResult & { isCustom?: boolean }) | null>(null)
  const [leadInfo, dispatchLead] = useReducer(leadReducer, { name: '', whatsapp: '' })
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
  const [waNumber, setWaNumber] = useState<string>(FALLBACK_WA)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadModalAnim, setLeadModalAnim] = useState(false)
  const [modalStep, setModalStep] = useState<'form' | 'result'>('form')
  const [portalReady, setPortalReady] = useState(false)
  const [savingLead, setSavingLead] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    if (modalStep === 'result' && !result && pendingResult) {
      setResult(pendingResult)
    }
  }, [modalStep, pendingResult, result])
  const nameValid = leadInfo.name.trim().length > 0
  const whatsappValid = /^(\+62|62|0)8[1-9][0-9]{6,9}$/.test(leadInfo.whatsapp.replace(/\s+/g, ''))
  const canContinue = nameValid && whatsappValid && !loading
  
  const handleInputChange = (field: keyof CalculatorInput, value: CalculatorInput[typeof field]) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const openLeadModalAndCalculate = () => {
    setShowLeadModal(true)
    setModalStep('form')
    setTimeout(() => setLeadModalAnim(true), 0)
  }

  const closeLeadModal = () => {
    setLeadModalAnim(false)
    setTimeout(() => {
      setShowLeadModal(false)
      setModalStep('form')
    }, 200)
  }

  const handleContinueFromModal = async () => {
    if (!canContinue) return
    const calc = await handleCalculate()
    if (!calc) return
    setResult(calc)
    setModalStep('result')
    if (input.jenis !== 'custom') {
      void handleLeadSubmit()
    }
  }
  
  const handleCalculate = async (): Promise<(CalculatorResult & { isCustom?: boolean }) | null> => {
    setLoading(true)
    setCalcError(null)
    try {
      // ESCAPE HATCH: Jika custom, simpan ke pendingResult untuk lead capture
      if (input.jenis === 'custom') {
        const customResult: CalculatorResult & { isCustom?: boolean } = {
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
        }
        setPendingResult(customResult)
        setResult(customResult)
        return customResult
      }
      
      const calculation = await calculateCanopyPrice({ ...input, selectedAddonIds })
      setPendingResult(calculation)
      setResult(calculation)
      return calculation
    } catch (error) {
      console.error('Error menghitung estimasi:', error)
      const fallback = 'Gagal menghitung estimasi. Silakan coba beberapa saat lagi.'
      const friendly = getFriendlySupabaseError(
        error,
        error instanceof Error ? error.message : fallback
      )
      setCalcError(friendly)
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleLeadSubmit = async () => {
    if (!leadInfo.name.trim() || !leadInfo.whatsapp.trim()) {
      setCalcError('Harap isi nama dan nomor WhatsApp')
      return
    }
    const whatsappRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
    if (!whatsappRegex.test(leadInfo.whatsapp.replace(/\s+/g, ''))) {
      setCalcError('Format nomor WhatsApp tidak valid. Gunakan format Indonesia (08xxx)')
      return
    }
    try {
      setSavingLead(true)
      const zoneName = zones.find((z) => z.id === input.zoneId)?.name ?? null
      const inferredAddress = zoneName ? `Zona ${zoneName}` : 'Alamat belum diisi'
      const dto = {
        customer_name: leadInfo.name,
        phone: leadInfo.whatsapp,
        address: inferredAddress,
        zone_id: input.zoneId || null,
        custom_notes: input.jenis === 'custom' ? (input.customNotes || 'Permintaan custom via kalkulator') : null,
        status: input.jenis === 'custom' ? 'Need Manual Quote' as const : 'New' as const,
        estimation: (input.jenis === 'standard' && pendingResult && !pendingResult.isCustom) ? {
          total_hpp: pendingResult.totalHpp,
          margin_percentage: pendingResult.marginPercentage,
          total_selling_price: pendingResult.totalSellingPrice,
          status: 'draft' as const
        } : null
      }
      const res = await createProjectWithEstimation(dto)
      setProjectId(res.project_id)
      setResult(pendingResult)
      setCalcError(null)
    } catch (error) {
      const fallback = 'Gagal menyimpan data ke sistem. Silakan coba beberapa saat lagi atau hubungi kami via WhatsApp.'
      const code = (error as { code?: unknown } | null)?.code
      const isDuplicateV1 = String(code) === '23505'
      if (isDuplicateV1) {
        setCalcError('Data penawaran Anda sudah tersimpan sebelumnya. Silakan buka rincian estimasi atau cek riwayat penawaran.')
      } else {
        const friendly = getFriendlySupabaseError(error, fallback)
        setCalcError(friendly)
      }
    } finally {
      setSavingLead(false)
    }
  }

  const handleLeadChange = (field: 'name' | 'whatsapp', value: string) => {
    dispatchLead({ type: field, value })
  }

  const handleBookSurvey = () => {
    const adminPhone = waNumber
    const area = result ? formatNumber(result.luas) : null
    const price = result ? formatRupiah(result.estimatedPrice) : null
    const url = generateWhatsAppLink('survey', {
      adminPhone,
      customerName: leadInfo.name || 'Customer',
      area,
      price,
      projectId
    })
    window.open(url, '_blank')
  }

  const handleCustomConsultation = () => {
    const adminPhone = waNumber
    const url = generateWhatsAppLink('consultation', {
      adminPhone,
      customerName: leadInfo.name || 'Customer',
      customNotes: input.customNotes || 'Tidak ada catatan spesifik',
      projectId
    })
    window.open(url, '_blank')
  }
  
  const handleReset = () => {
    setInput({
      panjang: 5,
      lebar: 3,
      jenis: 'standard'
    })
    setResult(null)
    setPendingResult(null)
    dispatchLead({ type: 'reset' })
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
          supabase.from('zones').select('*').eq('is_active', true).order('name'),
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
        try {
          const res = await fetch('/api/site-settings/wa-number', { cache: 'no-store' })
          if (res.ok) {
            const json = await res.json() as { wa_number?: string | null }
            if (json.wa_number) setWaNumber(json.wa_number)
          }
        } catch {
          // ignore
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
      
      <div className="grid grid-cols-1 gap-8">
        {/* Input Section */}
        <div className="space-y-8">
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
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-200">
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
            
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={openLeadModalAndCalculate}
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
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-gray-700">
                  <span className="font-semibold">Permintaan Khusus:</span> Untuk permintaan custom, tuliskan detail kebutuhan di kolom keterangan. Tim kami akan menghubungi Anda untuk penawaran manual.
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
      </div>
      {showLeadModal && portalReady &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
            <div
              className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${leadModalAnim ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => !loading && closeLeadModal()}
            />
            <div className={`relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-h-[90svh] overflow-y-auto transform transition-all duration-200 ${leadModalAnim ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              {modalStep === 'form' ? (
                <>
                  <h3 className="text-xl font-bold text-[#1D1D1B] mb-4">Data Kontak</h3>
                  <p className="text-gray-600 text-sm mb-6">Masukkan nama lengkap dan nomor WhatsApp Anda untuk melanjutkan perhitungan.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Nama Lengkap *</label>
                      <input
                        type="text"
                        value={leadInfo.name}
                        onChange={(e) => handleLeadChange('name', e.target.value)}
                        className={`input ${!nameValid && leadInfo.name ? 'border-red-300' : ''}`}
                        placeholder="Nama lengkap Anda"
                      />
                      {!nameValid && leadInfo.name !== '' && (
                        <p className="text-red-600 text-xs mt-1">Nama wajib diisi.</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Nomor WhatsApp *</label>
                      <input
                        type="tel"
                        value={leadInfo.whatsapp}
                        onChange={(e) => handleLeadChange('whatsapp', e.target.value)}
                        className={`input ${!whatsappValid && leadInfo.whatsapp ? 'border-red-300' : ''}`}
                        placeholder="08xxx (format Indonesia)"
                      />
                      {!whatsappValid && leadInfo.whatsapp !== '' && (
                        <p className="text-red-600 text-xs mt-1">Gunakan format Indonesia, contoh: 081234567890.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      className="btn btn-outline flex-1"
                      onClick={closeLeadModal}
                      disabled={loading}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary flex-1"
                      onClick={handleContinueFromModal}
                      disabled={!canContinue}
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                          Memproses...
                        </span>
                      ) : (
                        'Lanjutkan'
                      )}
                    </button>
                  </div>
                  {calcError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{calcError}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="card bg-gradient-to-br from-primary-dark to-primary-dark/90 text-white">
                    <h3 className="text-2xl font-bold mb-6">Hasil Perhitungan</h3>
                    {calcError ? (
                      <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                        <p className="text-red-100 text-sm">{calcError}</p>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            className="btn btn-outline flex-1"
                            onClick={() => { setModalStep('form'); setCalcError(null) }}
                          >
                            Kembali
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary flex-1"
                            onClick={async () => {
                              const calc = await handleCalculate()
                              if (calc) {
                                setResult(calc)
                                setCalcError(null)
                              }
                            }}
                          >
                            Coba Lagi
                          </button>
                        </div>
                      </div>
                    ) : result ? (
                      <ResultPanel
                        result={result}
                        leadName={leadInfo.name}
                        projectId={projectId}
                        zoneName={activeZoneName}
                        logoUrl={logoUrl}
                        customNotes={input.customNotes || null}
                        onBookSurvey={result.isCustom ? handleCustomConsultation : handleBookSurvey}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                          <span className="animate-spin h-6 w-6 rounded-full border-b-2 border-white" />
                        </div>
                        <p className="text-white/80">{loading ? 'Menghitung...' : 'Menyiapkan hasil...'}</p>
                      </div>
                    )}
                  </div>
                  {savingLead && (
                    <div className="mt-3 text-center text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 rounded-full border-b-2 border-gray-600" />
                        Menyimpan data ke sistem...
                      </span>
                    </div>
                  )}
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn btn-outline w-full"
                      onClick={closeLeadModal}
                    >
                      Tutup
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      }
    </div>
  )
}
