'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image' // Import Image component
import { Calculator, Ruler, MapPin, Package, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/calculator'
import type { CalculatorInput, Material, Zone, Catalog, CatalogAddon } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useInputValidation, getFieldError, type ValidationErrors } from './InputValidation'
import { InputField, SelectField, TextAreaField } from './InputField'

interface EnhancedCalculatorInputFormProps {
  input: CalculatorInput
  setInput: React.Dispatch<React.SetStateAction<CalculatorInput>>
  catalogs: Array<Pick<Catalog, 'id' | 'title' | 'base_price_per_m2' | 'category' | 'atap_id'>>
  zones: Array<Pick<Zone, 'id' | 'name' | 'markup_percentage' | 'flat_fee'>>
  catalogData: (Catalog & { base_price_unit?: 'm2' | 'm1' | 'unit' }) | null
  catalogAddons: (CatalogAddon & { material?: Material })[]
  selectedAddonIds: string[]
  setSelectedAddonIds: React.Dispatch<React.SetStateAction<string[]>>
  dataError: string | null
  setDataError: React.Dispatch<React.SetStateAction<string | null>>
  uploading: boolean
  setUploading: React.Dispatch<React.SetStateAction<boolean>>
  attachments: { url: string; type: 'mockup' | 'reference' }[]
  setAttachments: React.Dispatch<React.SetStateAction<{ url: string; type: 'mockup' | 'reference' }[]>>
  setLogoUrl: React.Dispatch<React.SetStateAction<string | null>>
  leadInfo: { name: string; whatsapp: string }
  setLeadInfo: React.Dispatch<React.SetStateAction<{ name: string; whatsapp: string }>>
  setCompanyName: React.Dispatch<React.SetStateAction<string | null>>
  setCompanyAddress: React.Dispatch<React.SetStateAction<string | null>>
  setCompanyPhone: React.Dispatch<React.SetStateAction<string | null>>
  setCompanyEmail: React.Dispatch<React.SetStateAction<string | null>>
  setWaNumber: React.Dispatch<React.SetStateAction<string>>
  setZones: React.Dispatch<React.SetStateAction<Array<Pick<Zone, 'id' | 'name' | 'markup_percentage' | 'flat_fee'>>>>
  setCatalogs: React.Dispatch<React.SetStateAction<Array<Pick<Catalog, 'id' | 'title' | 'base_price_per_m2' | 'category' | 'atap_id'>>>>
  onNextStep?: () => void
  currentStep?: number
  searchParams: URLSearchParams
  handleCatalogChange: (catalogId: string) => Promise<void>
}

const MIN_ORDER_AREA = 10
const MIN_ORDER_LENGTH = 5

const FALLBACK_WA = '628000000000'

export default function EnhancedCalculatorInputForm({
  input,
  setInput,
  catalogs,
  zones,
  catalogData,
  catalogAddons,
  selectedAddonIds,
  setSelectedAddonIds,
  dataError,
  setDataError,
  uploading,
  setUploading,
  attachments,
  setAttachments,
  setLogoUrl,
  leadInfo,
  setLeadInfo,
  setCompanyName,
  setCompanyAddress,
  setCompanyPhone,
  setCompanyEmail,
  setWaNumber,
  setZones,
  setCatalogs,
  onNextStep,
  currentStep = 0,
  searchParams,
  handleCatalogChange,
}: EnhancedCalculatorInputFormProps) {

  const { validation, touchField } = useInputValidation(input, leadInfo, catalogData)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'>('all')

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 300)
    return () => clearTimeout(id)
  }, [searchTerm])

  const filteredCatalogs = catalogs.filter((c) => {
    const matchesSearch = debouncedSearch
      ? c.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.id.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true

    const inferredCategory =
      c.category ?? (c.atap_id ? 'kanopi' : 'pagar')

    const matchesCategory =
      categoryFilter === 'all' ? true : inferredCategory === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleInputChange = (field: keyof CalculatorInput, value: CalculatorInput[typeof field]) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }))
    const validationFieldMap: Partial<Record<keyof CalculatorInput, keyof ValidationErrors>> = {
      panjang: 'panjang',
      lebar: 'lebar',
      unitQty: 'unitQty',
      catalogId: 'catalogId',
    }
    const vField = validationFieldMap[field]
    if (vField) {
      touchField(vField)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'mockup' | 'reference') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB')
      return
    }

    try {
      setUploading(true)
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `leads/attachments/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('projects')
        .getPublicUrl(filePath)

      setAttachments(prev => [...prev, { url: publicUrl, type }])
    } catch (err) {
      console.error('Upload error:', err)
      alert('Gagal mengunggah file. Silakan coba lagi.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setDataError(null)
      try {
        const [zonesRes, catalogsRes, logoRes, basicRes, waRes] =
          await Promise.all([
            fetch('/api/public/zones', { cache: 'no-store' })
              .then((r) =>
                r.json() as Promise<{
                  zones?: Array<
                    Pick<Zone, 'id' | 'name' | 'markup_percentage' | 'flat_fee'>
                  >
                }>
              )
              .catch(() => ({ zones: [] })),
            fetch('/api/public/catalogs', { cache: 'no-store' })
              .then((r) =>
                r.json() as Promise<{
                  catalogs?: Array<
                    Pick<
                      Catalog,
                      'id' | 'title' | 'base_price_per_m2' | 'category' | 'atap_id'
                    >
                  >
                }>
              )
              .catch(() => ({ catalogs: [] })),
            fetch('/api/site-settings/logo-url', { cache: 'no-store' })
              .then((r) =>
                r.ok
                  ? (r.json() as Promise<{ logo_url?: string | null }>)
                  : { logo_url: null }
              )
              .catch(() => ({ logo_url: null })),
            fetch('/api/site-settings/basic-public', { cache: 'no-store' })
              .then((r) =>
                r.ok
                  ? (r.json() as Promise<{
                      site_name?: string
                      contact_address?: string
                      support_phone?: string
                      support_email?: string
                    }>)
                  : {}
              )
              .catch(() => ({})),
            fetch('/api/site-settings/wa-number', { cache: 'no-store' })
              .then((r) =>
                r.ok
                  ? (r.json() as Promise<{ wa_number?: string | null }>)
                  : { wa_number: null }
              )
              .catch(() => ({ wa_number: null })),
          ])

        const safeZones = (zonesRes?.zones ?? []).map((z) => ({
          id: z.id,
          name: z.name,
          markup_percentage: z.markup_percentage ?? 0,
          flat_fee: z.flat_fee ?? 0,
        }))
        const safeCatalogs = (catalogsRes?.catalogs ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          base_price_per_m2: c.base_price_per_m2 ?? 0,
          category: c.category ?? undefined,
          atap_id: c.atap_id ?? null,
        }))
        setZones(safeZones)
        setCatalogs(safeCatalogs)
        setLogoUrl(logoRes?.logo_url ?? null)
        const basic = basicRes ?? {}
        setCompanyName((basic as { site_name?: string }).site_name ?? null)
        setCompanyAddress(
          (basic as { contact_address?: string }).contact_address ?? null
        )
        setCompanyPhone(
          (basic as { support_phone?: string }).support_phone ?? null
        )
        setCompanyEmail(
          (basic as { support_email?: string }).support_email ?? null
        )
        setWaNumber(waRes?.wa_number ?? FALLBACK_WA)

        // Set initial catalog if param exists and not already set
        const catalogParam = searchParams.get('catalog')
        if (catalogParam && !input.catalogId) {
          const foundCatalog = safeCatalogs.find((c) => c.id === catalogParam)
          if (foundCatalog) {
            handleCatalogChange(catalogParam)
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error)
      }
    }

    fetchData()
  }, [
    setDataError,
    setZones,
    setCatalogs,
    setLogoUrl,
    setCompanyName,
    setCompanyAddress,
    setCompanyPhone,
    setCompanyEmail,
    setWaNumber,
    searchParams,
    input.catalogId,
    handleCatalogChange,
  ])

  useEffect(() => {
    if (input.catalogId) {
      handleCatalogChange(input.catalogId)
    }
  }, [input.catalogId, handleCatalogChange])



  const renderDimensionsSection = () => {
    const unit = catalogData?.base_price_unit || 'm2'
    
    if (unit === 'unit') {
      return (
        <div className="space-y-4">
          <InputField
            type="number"
            min="1"
            step="1"
            value={input.unitQty || 1}
            onChange={(e) => handleInputChange('unitQty', Math.max(1, parseInt(e.target.value || '0', 10)))}
            onTouch={() => touchField('unitQty')}
            label="Jumlah Unit"
            icon=<Package className="w-4 h-4" />
            error={getFieldError('unitQty', validation)}
            touched={validation.touched.unitQty}
            helperText="Masukkan jumlah unit yang dibutuhkan"
            required
          />
        </div>
      )
    }
    
    if (unit === 'm1') {
      return (
        <div className="space-y-4">
          <InputField
            type="number"
            min="1"
            step="0.5"
            value={input.panjang}
            onChange={(e) => handleInputChange('panjang', parseFloat(e.target.value) || 0)}
            onTouch={() => touchField('panjang')}
            label="Panjang (meter)"
            icon=<Ruler className="w-4 h-4" />
            error={getFieldError('panjang', validation)}
            touched={validation.touched.panjang}
            helperText={`Minimum order: ${MIN_ORDER_LENGTH} m¹`}
            required
          />
        </div>
      )
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          type="number"
          min="1"
          step="0.5"
          value={input.panjang}
          onChange={(e) => handleInputChange('panjang', parseFloat(e.target.value) || 0)}
          onTouch={() => touchField('panjang')}
          label="Panjang (meter)"
          icon=<Ruler className="w-4 h-4" />
          error={getFieldError('panjang', validation)}
          touched={validation.touched.panjang}
          helperText={`Minimum order: ${MIN_ORDER_AREA} m²`}
          required
        />
        <InputField
          type="number"
          min="1"
          step="0.5"
          value={input.lebar}
          onChange={(e) => handleInputChange('lebar', parseFloat(e.target.value) || 0)}
          onTouch={() => touchField('lebar')}
          label="Lebar (meter)"
          icon=<Ruler className="w-4 h-4" />
          error={getFieldError('lebar', validation)}
          touched={validation.touched.lebar}
          helperText="Masukkan lebar kanopi"
          required
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Main Form */}
      <div className="card space-y-6">
        {/* Step 1: Catalog */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Pilih Paket Katalog
                </h3>
                <p className="text-sm text-gray-600">
                  Pilih paket yang paling sesuai untuk kebutuhan Anda.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cari paket..."
                  className="input w-full sm:w-56"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="input w-full sm:w-40"
                  value={categoryFilter}
                  onChange={(e) => {
                    const val = e.target.value as 'all' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'
                    setCategoryFilter(val)
                  }}
                >
                  <option value="all">Semua Kategori</option>
                  <option value="kanopi">Kanopi</option>
                  <option value="pagar">Pagar</option>
                  <option value="railing">Railing</option>
                  <option value="aksesoris">Aksesoris</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalogs.map((c) => {
                const selected = input.catalogId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setInput(prev => ({ ...prev, jenis: 'standard', catalogId: c.id }))
                      touchField('catalogId')
                      if (currentStep === 1 && onNextStep) {
                        setTimeout(() => {
                          onNextStep()
                        }, 0)
                      }
                    }}
                    className={`text-left bg-white rounded-xl border p-4 transition-all ${
                      selected ? 'border-primary shadow-brand' : 'border-gray-200 hover:border-primary/60 hover:shadow-sm'
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-lg bg-gray-100 mb-3" />
                    <p className="text-sm font-semibold text-primary-dark truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 mb-1">SKU: {c.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-700">
                      Mulai dari <span className="font-bold text-primary">{formatRupiah(c.base_price_per_m2)}</span>/m²
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Zona & Dimensi */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <SelectField
                value={input.zoneId || ''}
                onChange={(e) => {
                  const nextZoneId = e.target.value || undefined
                  const z = zones.find(zz => zz.id === nextZoneId) || null
                  setInput(prev => ({
                    ...prev,
                    zoneId: nextZoneId,
                    zoneMarkupPercentage: z?.markup_percentage ?? 0,
                    zoneFlatFee: z?.flat_fee ?? 0,
                  }))
                  touchField('zoneId')
                }}
                onTouch={() => touchField('zoneId')}
                label="Zona Lokasi"
                icon=<MapPin className="w-4 h-4" />
                error={getFieldError('zoneId', validation)}
                touched={validation.touched.zoneId}
                helperText="Pilih zona untuk perhitungan mark-up lokasi"
                required
              >
                <option value="">Pilih zona lokasi...</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} (+{zone.markup_percentage}%{zone.flat_fee > 0 ? `, +${formatRupiah(zone.flat_fee)}` : ''})
                  </option>
                ))}
              </SelectField>
            </div>

            {input.jenis !== 'custom' && catalogData && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-primary" />
                  Dimensi Kanopi
                </h3>
                {renderDimensionsSection()}
              </div>
            )}

            {input.jenis === 'custom' && (
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-800">Permintaan Custom</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Untuk permintaan custom dengan spesifikasi khusus, tim kami akan menghubungi Anda untuk memberikan penawaran manual.
                    </p>
                  </div>
                </div>
                
                <TextAreaField
                  value={input.customNotes || ''}
                  onChange={(e) => handleInputChange('customNotes', e.target.value)}
                  onTouch={() => touchField('customNotes')}
                  label="Deskripsi Ide"
                  placeholder="Jelaskan konsep atau kebutuhan khusus Anda..."
                  rows={4}
                  error={getFieldError('customNotes', validation)}
                  touched={validation.touched.customNotes}
                  helperText="Semakin detail deskripsi Anda, semakin akurat penawaran yang kami berikan"
                  required
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Upload Mockup (Opsional)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'mockup')}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={uploading}
                      />
                      <div className="btn btn-outline text-xs py-2">
                        {uploading ? 'Uploading...' : 'Pilih Gambar Mockup'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Upload Referensi (Opsional)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'reference')}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={uploading}
                      />
                      <div className="btn btn-outline text-xs py-2">
                        {uploading ? 'Uploading...' : 'Pilih Gambar Referensi'}
                      </div>
                    </div>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="relative w-12 h-12 rounded overflow-hidden border group">
                        <Image src={att.url} alt="Attachment" fill style={{ objectFit: 'cover' }} />
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded uppercase font-bold">
                          {att.type}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.filter(a => a.type === 'mockup').length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {attachments.filter(a => a.type === 'mockup').map((att, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                        <Image src={att.url} alt={`Mockup ${idx + 1}`} fill style={{ objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {input.jenis !== 'custom' && catalogData && catalogAddons.some(a => a.is_optional) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Komponen Tambahan (Opsional)</h3>
                <div className="space-y-2">
                  {catalogAddons.filter(a => a.is_optional).map((a) => {
                    const basis = (a.basis ?? 'm2') as 'm2' | 'm1' | 'unit'
                    const qtyBasis = typeof a.qty_per_basis === 'number' ? a.qty_per_basis : 0
                    const pricePerBasis = (a.material?.base_price_per_unit || 0) * qtyBasis
                    const checked = selectedAddonIds.includes(a.id)
                    
                    return (
                      <label key={a.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded border hover:bg-gray-50 transition-colors">
                        <>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedAddonIds, a.id]
                                  : selectedAddonIds.filter(id => id !== a.id)
                                setSelectedAddonIds(next)
                                setInput(prev => ({ ...prev, selectedAddonIds: next }))
                              }}
                              className="w-4 h-4 text-primary focus:ring-primary/20"
                            />
                            <div>
                              <p className="text-sm font-medium">{a.material?.name}</p>
                              <p className="text-xs text-gray-500">
                                {basis === 'm2' ? 'mengikuti luas (p×l)' : basis === 'm1' ? 'mengikuti panjang (p)' : 'per unit'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-primary font-semibold">+ {formatRupiah(pricePerBasis)}/{basis}</p>
                          </div>
                        </>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Section */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Data Kontak
            </h3>
            <InputField
              type="text"
              value={leadInfo.name}
              onChange={(e) => setLeadInfo(prev => ({ ...prev, name: e.target.value }))}
              label="Nama Lengkap"
              helperText="Masukkan nama lengkap Anda"
              required
            />
            <InputField
              type="tel"
              value={leadInfo.whatsapp}
              onChange={(e) => setLeadInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
              label="Nomor WhatsApp"
              helperText="Gunakan format Indonesia, contoh: 081234567890"
              required
            />
          </div>
        )}

        {/* Error Display */}
        {dataError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{dataError}</p>
          </div>
        )}

        {/* Validation Summary (hanya untuk step dimensi) */}
        {currentStep === 2 && !validation.isValid && (
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Mohon lengkapi semua field yang wajib diisi sebelum melanjutkan.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
