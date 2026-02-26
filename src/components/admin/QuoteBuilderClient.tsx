'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calculator, 
  PenTool, 
  HardHat, 
  AlertCircle, 
  TrendingUp, 
  ArrowLeft,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
  Package,
  MapPin,
  Globe,
  X,
  CheckCircle2,
  Info,
  History,
  ShieldCheck,
  ShieldAlert,
  ArrowDownCircle,
  ArrowUpCircle,
  Search
} from 'lucide-react'
import { buildCostingItems, formatCurrency } from '@/lib/utils/costing'
import { updateQuotationBuilder } from '@/app/actions/quotations'
import { toast } from '@/components/ui/toaster'

interface QuoteBuilderProps {
  initialData: {
    id?: string
    name: string
    catalog_id?: string
    panjang?: number
    lebar?: number
    unit_qty?: number
    unit_price?: number
    builder_costs?: any[]
    zone_id?: string
    margin_percentage?: number
    markup_percentage?: number
    markup_flat_fee?: number
    type?: string
  }
  parentZoneId?: string
  customerInfo?: {
    name?: string
    phone?: string
    min_price_per_m2?: number
    tier?: string
  }
  disableFlatFee?: boolean
  onSave: (data: any) => void
  onClose: () => void
}

export default function QuoteBuilderClient({
  initialData,
  parentZoneId,
  customerInfo,
  disableFlatFee = false,
  onSave,
  onClose
}: QuoteBuilderProps) {
  // 1. Interactive States
  const [panjang, setPanjang] = useState(Number(initialData.panjang || 0))
  const [lebar, setLebar] = useState(Number(initialData.lebar || 0))
  const [unitQty, setUnitQty] = useState(Number(initialData.unit_qty || 1))
  
  // Zoning & Markup States
  const [zones, setZones] = useState<any[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialData.zone_id || parentZoneId || '')
  const [isZoneSearchOpen, setIsZoneSearchOpen] = useState(false)
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')

  const filteredZones = useMemo(() => {
    return zones.filter(z => z.name.toLowerCase().includes(zoneSearchQuery.toLowerCase()))
  }, [zones, zoneSearchQuery])

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  
  // Custom Pricing State
  const [activeCatalog, setActiveCatalog] = useState<any>(null)

  // Default unit price from catalog
  const defaultUnitPrice = Number(activeCatalog?.base_price_per_m2 || 0)
  
  // Initialize unitPrice correctly
  const initialQty = Number(panjang * lebar || unitQty || 1)
  const [unitPrice, setUnitPrice] = useState(initialData.unit_price || defaultUnitPrice)

  const [isSaving, startSaveTransition] = useTransition()
  const [hppComponents, setHppComponents] = useState<any[]>([])
  const [isLoadingComponents, setIsLoadingComponents] = useState(false)

  // 2. Constants & Derived Data
  const catalogUnit = activeCatalog?.base_price_unit ?? 'm2'
  const isCustom = initialData.type === 'manual' || !initialData.catalog_id
  const productLabel = activeCatalog?.title || initialData.name || 'Katalog tidak ditemukan'
  const unitLabel = catalogUnit === 'm2' ? 'm²' : catalogUnit === 'm1' ? 'm¹' : 'unit'

  // Fetch Catalog & Zones & Components on mount
  useEffect(() => {
    async function fetchData() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // 1. Fetch Zones
      const { data: zonesData } = await supabase.from('zones').select('*').order('name')
      setZones(zonesData || [])

      // 2. Fetch Catalog if present
      if (initialData.catalog_id) {
        const { data: catData } = await supabase
          .from('catalogs')
          .select('*, atap:atap_id(*), rangka:rangka_id(*), finishing:finishing_id(*), isian:isian_id(*)')
          .eq('id', initialData.catalog_id)
          .single()
        setActiveCatalog(catData)
        
        // 3. Fetch HPP Components
        setIsLoadingComponents(true)
        try {
          const { data } = await supabase
            .from('catalog_hpp_components')
            .select('id, material_id, quantity, section, material:material_id(name, unit, base_price_per_unit)')
            .eq('catalog_id', initialData.catalog_id)
          setHppComponents(data || [])
        } catch (err) {
          console.error('Failed to fetch HPP components:', err)
        } finally {
          setIsLoadingComponents(false)
        }
      }
    }
    fetchData()
  }, [initialData.catalog_id])

  // Update unitPrice if activeCatalog changes and initialData has no price
  useEffect(() => {
    if (activeCatalog && !initialData.unit_price) {
      setUnitPrice(Number(activeCatalog.base_price_per_m2 || 0))
    }
  }, [activeCatalog, initialData.unit_price])

  // 3. Dynamic Calculations
  const computedQty = useMemo(() => {
    if (catalogUnit === 'm2') return Math.max(0, panjang) * Math.max(0, lebar)
    if (catalogUnit === 'm1') return Math.max(0, panjang)
    return Math.max(1, unitQty)
  }, [catalogUnit, panjang, lebar, unitQty])

  const { costingItems, totalHpp } = useMemo(() => {
    if (isLoadingComponents && (initialData.builder_costs?.length || 0) > 0) {
        return { costingItems: initialData.builder_costs || [], totalHpp: (initialData.builder_costs || []).reduce((acc: number, item: any) => acc + item.subtotal, 0) }
    }
    const items = buildCostingItems(activeCatalog, { panjang, lebar, unitQty }, isCustom, hppComponents)
    const hpp = items.reduce((acc, item) => acc + item.subtotal, 0)
    return { costingItems: items, totalHpp: hpp }
  }, [activeCatalog, panjang, lebar, unitQty, isCustom, hppComponents, isLoadingComponents, initialData.builder_costs])

  // Pricing Logic
  const matchedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  const markupPercentage = matchedZone?.markup_percentage ?? 0
  const flatFee = disableFlatFee ? 0 : (matchedZone?.flat_fee ?? 0)

  const catalogMargin = Number(activeCatalog?.margin_percentage || 30)
  
  // Calculate Minimum Price with Markup
  const minPricePerUnit = useMemo(() => {
    const baseHppPerUnit = totalHpp / (computedQty || 1)
    const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)
    
    // Static markup only if this is line #1 (we can pass this info via props if needed, 
    // but for now let's assume if flatFee > 0 it's intended)
    // Actually, requirement says static markup ONLY for line #1.
    const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))
    return Math.ceil(priceAfterMargin + markupNominalPerUnit)
  }, [totalHpp, computedQty, catalogMargin, markupPercentage, flatFee])
  
  const currentTotalAmount = Math.ceil(unitPrice * computedQty)
  
  // Use customerInfo for comparison
  const customerMinPrice = customerInfo?.min_price_per_m2 || 0
  const historicalUnitPrice = initialData.unit_price || 0

  // Status Check
  const isBelowMin = unitPrice < minPricePerUnit
  const isBelowCustomerMin = customerMinPrice > 0 && unitPrice < customerMinPrice
  const isNearMin = unitPrice >= minPricePerUnit && unitPrice < minPricePerUnit * 1.05
  
  const priceStatus = useMemo(() => {
    if (isBelowMin || isBelowCustomerMin) return { label: 'DI BAWAH MINIMUM', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldAlert }
    if (isNearMin) return { label: 'MENDEKATI MINIMUM', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertCircle }
    return { label: 'BATAS AMAN', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: ShieldCheck }
  }, [isBelowMin, isBelowCustomerMin, isNearMin])

  // 5. Handlers
  const handleSaveBuilder = async () => {
    if (isBelowMin || isBelowCustomerMin) {
      toast.error('Gagal Simpan', 'Harga satuan yang Anda input berada di bawah ambang batas minimum yang diizinkan.')
      return
    }

    startSaveTransition(async () => {
      try {
        // Prepare line item data
        const updatedLine = {
          ...initialData,
          panjang: panjang || undefined,
          lebar: lebar || undefined,
          unit_qty: unitQty || undefined,
          unit_price: unitPrice,
          subtotal: currentTotalAmount,
          total_hpp: totalHpp,
          builder_costs: costingItems,
          catalog_id: activeCatalog?.id,
          zone_id: selectedZoneId || undefined,
          markup_percentage: markupPercentage,
          markup_flat_fee: flatFee
        }

        onSave(updatedLine)
        toast.success('Sukses', 'Kalkulasi item telah diperbarui.')
        onClose()
      } catch (err: any) {
        toast.error('Gagal', err.message || 'Terjadi kesalahan saat menyimpan.')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#E30613]/10 rounded-xl">
                <Calculator size={24} className="text-[#E30613]" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                Costing Builder
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                <Package size={12} className="text-[#E30613]" />
                {customerInfo?.name || 'Customer'} | {initialData.name}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Input Parameters */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <Package size={16} className="text-[#E30613]" /> Konfigurasi Utama
                  </h4>
                  <span className="text-[10px] font-black bg-[#1D1D1B] text-white px-2 py-0.5 rounded uppercase">
                    {productLabel}
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex justify-between items-center">
                        <span>Volume & Dimensi</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Satuan: {unitLabel}</span>
                    </div>
                    {catalogUnit === 'm2' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Panjang (m)</label>
                          <input 
                            type="number" 
                            value={panjang || ''} 
                            onChange={(e) => setPanjang(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Lebar (m)</label>
                          <input 
                            type="number" 
                            value={lebar || ''} 
                            onChange={(e) => setLebar(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Quantity ({unitLabel})</label>
                        <input 
                          type="number" 
                          value={unitQty || ''} 
                          onChange={(e) => setUnitQty(parseFloat(e.target.value) || 1)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                        />
                      </div>
                    )}
                    
                    {/* Zone Selector (Locked to Parent Editor) */}
                    <div className="space-y-1.5 opacity-80">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" /> Zona Lokasi (Terkunci)
                        </label>
                        <div className="relative">
                            <div 
                                className="w-full px-4 py-2.5 bg-gray-100/50 border border-transparent rounded-xl font-bold text-gray-500 cursor-not-allowed flex items-center justify-between transition-all"
                                title="Zona hanya dapat diubah melalui editor utama"
                            >
                                <span className={selectedZone ? 'text-gray-700' : 'text-gray-400'}>
                                    {selectedZone ? selectedZone.name : 'Zona tidak diset'}
                                </span>
                                <div className="text-gray-300">
                                    <ShieldCheck size={14} />
                                </div>
                            </div>
                        </div>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight ml-1">
                            * Mengikuti pengaturan di editor penawaran
                        </p>
                    </div>

                    <div className="p-4 bg-[#1D1D1B] rounded-2xl flex justify-between items-center shadow-inner">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Volume</div>
                      <div className="text-xl font-black text-white">{formatCurrency(computedQty)} <span className="text-xs text-gray-400">{unitLabel}</span></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Penentuan Harga Satuan</div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Harga Per {unitLabel} (Rp)</label>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">Input Kustom</span>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 group-focus-within:text-[#E30613]">Rp</div>
                            <input 
                                type="number" 
                                value={unitPrice || ''} 
                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                className={`w-full pl-12 pr-4 py-3 bg-white border-2 rounded-2xl font-black text-xl text-gray-900 focus:outline-none transition-all shadow-sm ${isBelowMin ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-[#E30613] focus:ring-[#E30613]/10'}`}
                            />
                        </div>
                    </div>
                    
                    {/* Visual Comparison Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-[9px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><History size={10} /> Estimasi Awal</div>
                            <div className="text-xs font-black text-gray-600">Rp {formatCurrency(historicalUnitPrice)}</div>
                        </div>
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="text-[9px] font-black text-blue-400 uppercase mb-1 flex items-center gap-1"><ShieldCheck size={10} /> Harga Minimum</div>
                            <div className="text-xs font-black text-blue-700">Rp {formatCurrency(minPricePerUnit)}</div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                            <span className="text-gray-400">Rincian Markup Zona:</span>
                            <span className="text-blue-600">+{markupPercentage}% + Rp {formatCurrency(flatFee)}</span>
                        </div>
                        {customerInfo && (
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight border-t border-gray-100 pt-2">
                              <span className="text-gray-400">Harga Minimal Customer ({customerInfo.tier}):</span>
                              <span className="text-orange-600">Rp {formatCurrency(customerMinPrice)}</span>
                          </div>
                        )}
                        <p className="text-[9px] text-gray-400 font-medium leading-tight">
                            * Harga minimum otomatis naik berdasarkan zona lokasi dan profil customer.
                        </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* HPP Reference Breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HardHat size={16} className="text-gray-400" />
                    <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Referensi HPP (Modal Produksi)</h4>
                  </div>
                  <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    MODAL: Rp {formatCurrency(totalHpp)}
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                        <th className="p-4">Komponen Material</th>
                        <th className="p-4 text-center">Volume</th>
                        <th className="p-4 text-right">HPP Satuan</th>
                        <th className="p-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {costingItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-gray-800">{item.name}</div>
                            <div className="text-[9px] text-gray-400 uppercase font-black">{item.type}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-black text-gray-900">{formatCurrency(item.qtyCharged)}</span>
                            <span className="text-[9px] text-gray-400 ml-1 uppercase">{item.unit}</span>
                          </td>
                          <td className="p-4 text-right text-gray-500 font-medium">Rp {formatCurrency(item.hpp)}</td>
                          <td className="p-4 text-right font-black text-gray-900">Rp {formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                      {isLoadingComponents && (
                          <tr>
                              <td colSpan={4} className="p-12 text-center">
                                  <Loader2 className="animate-spin mx-auto text-gray-300" size={32} />
                                  <p className="mt-2 text-xs font-bold text-gray-400 uppercase">Menghitung modal...</p>
                              </td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Price Status & Action Sidebar */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden sticky top-0">
                <div className={`p-6 border-b text-center transition-colors duration-300 ${priceStatus.bg} ${priceStatus.border}`}>
                    <div className="flex justify-center mb-3">
                        <div className={`p-3 rounded-full bg-white shadow-sm ${priceStatus.color}`}>
                            <priceStatus.icon size={28} />
                        </div>
                    </div>
                    <h5 className={`text-[11px] font-black uppercase tracking-[0.2em] ${priceStatus.color}`}>
                        {priceStatus.label}
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium px-4">
                        {isBelowMin 
                            ? "Harga berada di bawah modal + margin + markup zona. Penjualan ini berisiko rugi." 
                            : isNearMin 
                                ? "Harga aman namun tipis. Pastikan volume pekerjaan sudah sesuai." 
                                : "Harga berada dalam batas aman dan menguntungkan."}
                    </p>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Penawaran</p>
                        <h2 className={`text-4xl font-black leading-none transition-colors duration-300 ${priceStatus.color}`}>
                            Rp {formatCurrency(currentTotalAmount)}
                        </h2>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold uppercase">Margin Profit (Est)</span>
                            <span className={`font-black ${isBelowMin ? 'text-red-500' : 'text-green-600'}`}>
                                Rp {formatCurrency(currentTotalAmount - totalHpp)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold uppercase">Deviasi Katalog</span>
                            <div className="flex items-center gap-1 font-black">
                                {unitPrice > defaultUnitPrice ? <ArrowUpCircle size={14} className="text-green-500" /> : <ArrowDownCircle size={14} className="text-red-500" />}
                                <span className={unitPrice > defaultUnitPrice ? 'text-green-600' : 'text-red-600'}>
                                    {defaultUnitPrice > 0 ? Math.round(Math.abs((unitPrice - defaultUnitPrice) / defaultUnitPrice) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/80 space-y-4">
                    <button 
                        onClick={handleSaveBuilder}
                        disabled={isSaving || isLoadingComponents || isBelowMin}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${isBelowMin ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#1D1D1B] text-white hover:bg-gray-800'}`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        {isSaving ? 'Menyimpan...' : 'Finalisasi Penawaran'}
                    </button>
                    
                    {isBelowMin && (
                        <div className="flex items-start gap-2 p-3 bg-red-100/50 border border-red-200 rounded-xl shadow-sm">
                            <ShieldAlert size={16} className="text-red-600 shrink-0" />
                            <p className="text-[9px] font-bold text-red-800 uppercase leading-tight">
                                Sistem mengunci tombol simpan karena harga di bawah ambang batas minimum (HPP + Margin + Markup).
                            </p>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
