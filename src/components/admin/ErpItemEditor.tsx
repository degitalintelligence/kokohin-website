'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Calculator,
  AlertCircle,
  Search,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  ExternalLink
} from 'lucide-react'
import { formatCurrency, buildCostingItems } from '@/lib/utils/costing'
import { updateQuotationItems } from '@/app/actions/quotations'
import { updateContractItems, updateInvoiceItems, updateCustomerProfile } from '@/app/actions/erp'
import { searchCatalogs } from '@/app/actions/catalogs'
import { toast } from '@/components/ui/toaster'

import Link from 'next/link'

import QuoteBuilderClient from '@/components/admin/QuoteBuilderClient'

interface ErpItem {
  id?: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  subtotal: number
  type: string
  // Hierarchical Builder Fields
  builder_costs?: any[]
  catalog_id?: string
  zone_id?: string
  panjang?: number
  lebar?: number
  unit_qty?: number
  markup_percentage?: number
  markup_flat_fee?: number
  atap_id?: string | null
  rangka_id?: string | null
  finishing_id?: string | null
  isian_id?: string | null
}

interface ErpItemEditorProps {
  entityId: string
  entityType: 'quotation' | 'contract' | 'invoice'
  initialItems: ErpItem[]
  customerPhone?: string 
  signatories?: any[] // Added for contracts
  onClose: () => void
}

export default function ErpItemEditor({ entityId, entityType, initialItems, customerPhone, signatories, onClose }: ErpItemEditorProps) {
  const [items, setItems] = useState<ErpItem[]>(initialItems.length > 0 ? initialItems : [
    { name: '', unit: '', quantity: 0, unit_price: 0, subtotal: 0, type: 'manual', builder_costs: [] }
  ])
  const [isPending, startTransition] = useTransition()
  
  // Customer Profile State for Editing
  const [customerProfile, setCustomerProfile] = useState<any>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhoneState, setCustomerPhoneState] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [attachments, setAttachments] = useState<any[]>([])
  
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    if (customerProfile) {
      setCustomerName(customerProfile.name || '')
      setCustomerPhoneState(customerProfile.phone || '')
      setCustomerEmail(customerProfile.email || '')
      setCustomerAddress(customerProfile.address || '')
    }
  }, [customerProfile])

  // Sync profile state back to Supabase (debounce)
  useEffect(() => {
    // Skip if it's still the initial data fetch
    if (isInitialLoadRef.current) return

    if (customerProfile?.phone || customerPhone) {
      const phoneToUse = customerProfile?.phone || customerPhone
      const timer = setTimeout(async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          
          await supabase
            .from('erp_customer_profiles')
            .update({
              name: customerName,
              phone: customerPhoneState,
              email: customerEmail,
              address: customerAddress
            })
            .eq('phone', phoneToUse)
          
          console.log('Customer profile updated')
        } catch (err) {
          console.error('Failed to auto-save customer profile:', err)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [customerName, customerPhoneState, customerEmail, customerAddress, customerProfile?.phone, customerPhone])

  // Catalog Cache for Min Price Calculation
  const [catalogCache, setCatalogCache] = useState<Record<string, any>>({})
  const [catalogComponentsCache, setCatalogComponentsCache] = useState<Record<string, any[]>>({})
  
  // Catalog lookup states
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Contract Metadata
  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('')
  const [clientKtp, setClientKtp] = useState<string>('')
  const [clientAddress, setClientAddress] = useState<string>('')
  const [clientEmail, setClientEmail] = useState<string>('')
  const [leadIdForContract, setLeadIdForContract] = useState<string | null>(null)
  
  // Zoning states
  const [zones, setZones] = useState<any[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')
  const [isZoneSearchOpen, setIsZoneSearchOpen] = useState(false)
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')

  // Payment Terms states
  const [paymentTerms, setPaymentTerms] = useState<any[]>([])
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState<string>('')
  const [isTermSearchOpen, setIsTermSearchOpen] = useState(false)
  const [termSearchQuery, setTermSearchQuery] = useState('')
  const [notes, setNotes] = useState<string>('')

  const filteredZones = useMemo(() => {
    return zones.filter(z => z.name.toLowerCase().includes(zoneSearchQuery.toLowerCase()))
  }, [zones, zoneSearchQuery])

  const filteredTerms = useMemo(() => {
    return paymentTerms.filter(t => t.name.toLowerCase().includes(termSearchQuery.toLowerCase()))
  }, [paymentTerms, termSearchQuery])

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])
  const selectedTerm = useMemo(() => paymentTerms.find(t => t.id === selectedPaymentTermId), [paymentTerms, selectedPaymentTermId])

  useEffect(() => {
    async function fetchMetadata() {
      setIsMetadataLoading(true)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Fetch Zones
      const { data: zonesData } = await supabase.from('zones').select('*').order('name')
      setZones(zonesData || [])
      
      if (entityType === 'contract') {
        const { data: contractData } = await supabase
          .from('erp_contracts')
          .select('*, erp_quotations(leads(*), zone_id), erp_customer_profiles(*)')
          .eq('id', entityId)
          .maybeSingle()
        
        if (contractData) {
          setSelectedSignatoryId(contractData.signatory_id || '')
          setClientKtp(contractData.erp_customer_profiles?.ktp_number || contractData.client_ktp || '')
          setClientAddress(contractData.erp_customer_profiles?.address || '')
          setClientEmail(contractData.erp_customer_profiles?.email || '')
          setLeadIdForContract(contractData.erp_quotations?.leads?.id || null)
          setSelectedZoneId(contractData.erp_quotations?.zone_id || '')
          setNotes(contractData.terms_and_conditions || '')
          setAttachments(contractData.attachments || [])
          
          if (contractData.erp_customer_profiles) {
            setCustomerProfile(contractData.erp_customer_profiles)
          } else if (contractData.erp_quotations?.leads) {
            // Fix TypeScript 'any' type casting for leads
            const lead = contractData.erp_quotations.leads as any
            setCustomerName(lead.name || '')
            setCustomerPhoneState(lead.phone || '')
            setCustomerEmail(lead.email || '')
            setCustomerAddress(lead.location || '')
          }
        }
      }

      if (entityType === 'invoice') {
        const { data: invData } = await supabase
          .from('erp_invoices')
          .select('*, erp_contracts(*, erp_quotations(leads(*), zone_id), erp_customer_profiles(*))')
          .eq('id', entityId)
          .maybeSingle()
        
        if (invData?.erp_contracts?.erp_customer_profiles) {
          setCustomerProfile(invData.erp_contracts.erp_customer_profiles)
        } else if (invData?.erp_contracts?.erp_quotations?.leads) {
          // Fix TypeScript 'any' type casting for leads
          const lead = invData.erp_contracts.erp_quotations.leads as any
          setCustomerName(lead.name || '')
          setCustomerPhoneState(lead.phone || '')
          setCustomerEmail(lead.email || '')
          setCustomerAddress(lead.location || '')
        }

        if (invData?.erp_contracts?.erp_quotations?.zone_id) {
          setSelectedZoneId(invData.erp_contracts.erp_quotations.zone_id)
        }
        setNotes(invData?.notes || '')
        setAttachments(invData?.attachments || [])
      }

      if (entityType === 'quotation') {
        const [termsRes, qtnRes] = await Promise.all([
          supabase.from('erp_payment_terms').select('*').eq('is_active', true),
          supabase.from('erp_quotations').select('payment_term_id, zone_id, notes, attachments, leads(*)').eq('id', entityId).maybeSingle()
        ])
        
        if (termsRes.data) {
          setPaymentTerms(termsRes.data)
          // Auto-seed default payment term if not already set in quotation
          if (qtnRes.data && !qtnRes.data.payment_term_id) {
            const defaultTerm = termsRes.data.find(t => t.is_default)
            if (defaultTerm) setSelectedPaymentTermId(defaultTerm.id)
          }
        }
        if (qtnRes.data) {
          if (qtnRes.data.payment_term_id) setSelectedPaymentTermId(qtnRes.data.payment_term_id)
          setSelectedZoneId(qtnRes.data.zone_id || '')
          setNotes(qtnRes.data.notes || '')
          setAttachments(qtnRes.data.attachments || [])
          
          if (qtnRes.data.leads) {
            // Fix TypeScript 'any' type casting for leads
            const lead = qtnRes.data.leads as any
            setCustomerName(lead.name || '')
            setCustomerPhoneState(lead.phone || '')
            setCustomerEmail(lead.email || '')
            setCustomerAddress(lead.location || '')
          }
        }
      }
      setIsMetadataLoading(false)
      // Allow auto-save after initial data is loaded
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 500)
    }
    fetchMetadata()
  }, [entityId, entityType])

  // Update zone_id in DB (debounce)
  useEffect(() => {
    if (!selectedZoneId || isInitialLoadRef.current) return
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        if (entityType === 'quotation') {
          await supabase.from('erp_quotations').update({ zone_id: selectedZoneId }).eq('id', entityId)
        } else if (entityType === 'contract') {
          // For contracts, we update the linked quotation's zone to maintain consistency
          const { data: contract } = await supabase.from('erp_contracts').select('quotation_id').eq('id', entityId).single()
          if (contract?.quotation_id) {
            await supabase.from('erp_quotations').update({ zone_id: selectedZoneId }).eq('id', contract.quotation_id)
          }
        }
        console.log(`${entityType} zone updated to ${selectedZoneId}`)
      } catch (err) {
        console.error('Failed to update zone:', err)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [selectedZoneId, entityId, entityType])

  // Auto-save customer profile for contracts
  useEffect(() => {
    if (entityType === 'contract' && leadIdForContract) {
      const timer = setTimeout(async () => {
        try {
          await updateCustomerProfile(leadIdForContract, {
            ktp_number: clientKtp,
            address: clientAddress,
            email: clientEmail
          })
          console.log('Customer profile auto-saved')
        } catch (err) {
          console.error('Auto-save error:', err)
        }
      }, 2000) // 2 second debounce
      return () => clearTimeout(timer)
    }
  }, [clientKtp, clientAddress, clientEmail, leadIdForContract, entityType])

  // Builder Modal State
  const [activeBuilderIdx, setActiveBuilderIdx] = useState<number | null>(null)

  useEffect(() => {
    if (customerPhone) {
      async function fetchProfile() {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('erp_customer_profiles')
          .select('*')
          .eq('phone', customerPhone)
          .maybeSingle()
        setCustomerProfile(data)
      }
      fetchProfile()
    }
  }, [customerPhone])

  // Fetch Catalogs & Components for Min Price calculation
  useEffect(() => {
    async function fetchCatalogsAndComponents() {
      const catalogIds = Array.from(new Set(items.map(i => i.catalog_id).filter(Boolean))) as string[]
      const missingCatalogIds = catalogIds.filter(id => !catalogCache[id])
      const missingComponentIds = catalogIds.filter(id => !catalogComponentsCache[id])
      
      const idsToFetch = Array.from(new Set([...missingCatalogIds, ...missingComponentIds]))
      if (idsToFetch.length === 0) return

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // 1. Fetch Catalogs (if any missing)
      if (missingCatalogIds.length > 0) {
        const { data: catalogs } = await supabase.from('catalogs').select('*').in('id', missingCatalogIds)
        if (catalogs) {
          setCatalogCache(prev => {
            const newCache = { ...prev }
            catalogs.forEach(c => { newCache[c.id] = c })
            return newCache
          })
        }
      }
      
      // 2. Fetch Components (if any missing)
      if (missingComponentIds.length > 0) {
        const { data: components } = await supabase
          .from('catalog_hpp_components')
          .select('id, catalog_id, material_id, quantity, material:material_id(name, unit, base_price_per_unit)')
          .in('catalog_id', missingComponentIds)

        if (components) {
          setCatalogComponentsCache(prev => {
            const newCompCache = { ...prev }
            components.forEach(comp => {
              if (!newCompCache[comp.catalog_id]) newCompCache[comp.catalog_id] = []
              newCompCache[comp.catalog_id].push(comp)
            })
            // Ensure even empty components are cached to avoid re-fetch
            missingComponentIds.forEach(id => {
              if (!newCompCache[id]) newCompCache[id] = []
            })
            return newCompCache
          })
        }
      }
    }
    fetchCatalogsAndComponents()
  }, [items, catalogCache, catalogComponentsCache])

  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.subtotal, 0)
  }, [items])

  const getItemMinPrice = (item: ErpItem, index: number) => {
    let currentBuilderCosts = item.builder_costs
    
    // Fallback: Calculate builder_costs on the fly if missing but we have catalog info
    if ((!currentBuilderCosts || currentBuilderCosts.length === 0) && item.catalog_id && catalogCache[item.catalog_id]) {
      const activeCatalog = catalogCache[item.catalog_id]
      const hppComponents = catalogComponentsCache[item.catalog_id] || []
      
      currentBuilderCosts = buildCostingItems(
        activeCatalog, 
        { 
          panjang: Math.max(1, item.panjang || 0), 
          lebar: Math.max(1, item.lebar || 0), 
          unitQty: Math.max(1, item.unit_qty || item.quantity || 1) 
        }, 
        item.type === 'manual', 
        hppComponents
      )
    }

    if (!currentBuilderCosts || currentBuilderCosts.length === 0) return 0
    
    const totalHpp = currentBuilderCosts.reduce((acc, cost) => acc + (cost.subtotal || 0), 0)
    const catalogMargin = 30 // Default margin
    
    const unit = item.unit === 'm²' ? 'm2' : item.unit === 'm¹' ? 'm1' : 'unit'
    const computedQty = unit === 'm2' 
      ? Math.max(1, item.panjang || 0) * Math.max(1, item.lebar || 0) 
      : unit === 'm1' 
        ? Math.max(1, item.panjang || 0) 
        : Math.max(1, item.unit_qty || item.quantity || 1)
    
    const baseHppPerUnit = totalHpp / (computedQty || 1)
    const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)
    
    // Get Markup from Selected Zone
    const selectedZone = zones.find(z => z.id === selectedZoneId)
    const markupPercentage = selectedZone ? Number(selectedZone.markup_percentage || 0) : (item.markup_percentage || 0)
    // Flat fee only applies to the FIRST item (index 0)
    const flatFee = (index === 0 && selectedZone) ? Number(selectedZone.flat_fee || 0) : (index === 0 ? (item.markup_flat_fee || 0) : 0)
    
    const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))
    return Math.ceil(priceAfterMargin + markupNominalPerUnit)
  }

  const totalMinAmount = useMemo(() => {
    return items.reduce((acc, item, idx) => acc + (getItemMinPrice(item, idx) * item.quantity), 0)
  }, [items, catalogCache, catalogComponentsCache, selectedZoneId, zones])

  const isBelowMinAnyItem = useMemo(() => {
    return items.some((item, idx) => {
      const minPrice = getItemMinPrice(item, idx)
      return minPrice > 0 && item.unit_price < minPrice
    })
  }, [items, catalogCache, catalogComponentsCache, selectedZoneId, zones])

  const handleAddItem = () => {
    setItems([...items, { name: '', unit: '', quantity: 0, unit_price: 0, subtotal: 0, type: 'manual' }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleChangeItem = (index: number, field: keyof ErpItem, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      item.subtotal = Math.ceil((item.quantity || 0) * (item.unit_price || 0))
    }
    
    newItems[index] = item
    setItems(newItems)

    // Trigger search if name changes
    if (field === 'name') {
      if (value.length >= 2) {
        handleSearch(value, index)
      } else {
        setSearchResults([])
        setActiveSearchIdx(null)
      }
    }
  }

  const handleSearch = async (query: string, index: number) => {
    setIsSearching(true)
    setActiveSearchIdx(index)
    try {
      const results = await searchCatalogs(query)
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectCatalog = (catalog: any, index: number) => {
    // Update catalog cache immediately
    setCatalogCache(prev => ({ ...prev, [catalog.id]: catalog }))

    const newItems = [...items]
    const unit = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'
    
    newItems[index] = {
      ...newItems[index],
      name: catalog.title,
      unit: unit,
      unit_price: Number(catalog.base_price_per_m2 || 0),
      subtotal: Math.ceil((newItems[index].quantity || 0) * Number(catalog.base_price_per_m2 || 0)),
      type: 'catalog',
      catalog_id: catalog.id, // Store catalog_id for builder
      atap_id: catalog.atap_id || null,
      rangka_id: catalog.rangka_id || null,
      finishing_id: catalog.finishing_id || null,
      isian_id: catalog.isian_id || null,
      panjang: 1, // Default dimension for Min Price calculation
      lebar: 1,
      unit_qty: 1
    }
    
    setItems(newItems)
    setSearchResults([])
    setActiveSearchIdx(null)

    // Automatically open builder for newly selected catalog item
    setActiveBuilderIdx(index)
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSearchResults([])
      setActiveSearchIdx(null)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  // File Upload Handling
  const [isUploading, setIsUploading] = useState(false)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${entityId}/${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('erp-attachments')
        .upload(fileName, file)

      if (error) {
        if (error.message?.includes('bucket_not_found') || error.message?.includes('Bucket not found')) {
          throw new Error('Bucket "erp-attachments" belum dibuat atau tidak dapat diakses. Silakan hubungi admin.')
        }
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('erp-attachments')
        .getPublicUrl(data.path)

      setAttachments([...attachments, { 
        name: file.name, 
        url: publicUrl, 
        type: 'reference',
        created_at: new Date().toISOString()
      }])
      
      toast.success('Berhasil', 'Gambar referensi berhasil diunggah.')
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error('Gagal', 'Gagal mengunggah gambar. Pastikan ukuran file < 5MB.')
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        if (entityType === 'quotation') {
        await updateQuotationItems(entityId, items, totalAmount, selectedPaymentTermId || undefined, notes, attachments)
      } else if (entityType === 'contract') {
        await updateContractItems(entityId, items, totalAmount, {
          signatory_id: selectedSignatoryId || undefined,
          client_ktp: clientKtp || undefined,
          client_address: clientAddress || undefined,
          client_email: clientEmail || undefined,
          terms_and_conditions: notes,
          attachments: attachments
        })
      } else if (entityType === 'invoice') {
          await updateInvoiceItems(entityId, items, totalAmount, notes, attachments)
        }
        toast.success('Berhasil', `Item ${entityType} berhasil diperbarui secara independen.`)
        onClose()
      } catch (error: any) {
        toast.error('Gagal', error.message || 'Terjadi kesalahan saat menyimpan.')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <header className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-gray-50/50">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#E30613]/10 flex items-center justify-center text-[#E30613]">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  Editor Item {entityType === 'quotation' ? 'Penawaran' : entityType === 'contract' ? 'Kontrak' : 'Invoice'}
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">Auto-save aktif untuk profil customer</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900">
              <X size={18} />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {isMetadataLoading ? (
              <div className="p-8 flex items-center justify-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-widest">
                <Loader2 size={20} className="animate-spin text-[#E30613]" />
                Memuat Data Lead...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left Column: Customer Identity */}
              <div className="p-4 space-y-3 bg-gray-50/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <input 
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#E30613] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      type="text"
                      value={customerPhoneState}
                      onChange={(e) => setCustomerPhoneState(e.target.value)}
                      placeholder="0812..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#E30613] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#E30613] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Alamat Proyek</label>
                    <input 
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Alamat..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#E30613] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Project Configuration */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Zonasi</label>
                    <div className="relative">
                      <div 
                        onClick={() => setIsZoneSearchOpen(!isZoneSearchOpen)}
                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 cursor-pointer flex items-center justify-between hover:border-gray-300 transition-all"
                      >
                        <span className={selectedZone ? 'text-gray-800' : 'text-gray-400'}>
                          {selectedZone ? selectedZone.name : 'Pilih Zona...'}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>

                      <AnimatePresence>
                        {isZoneSearchOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[120] overflow-hidden"
                          >
                            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                              <div className="relative">
                                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                  autoFocus
                                  type="text"
                                  value={zoneSearchQuery}
                                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                                  placeholder="Cari zona..."
                                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E30613]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredZones.map(z => (
                                <div 
                                  key={z.id}
                                  onClick={() => {
                                    setSelectedZoneId(z.id)
                                    setIsZoneSearchOpen(false)
                                    setZoneSearchQuery('')
                                  }}
                                  className={`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors ${selectedZoneId === z.id ? 'bg-[#E30613] text-white' : 'text-gray-700 hover:bg-red-50 hover:text-[#E30613]'}`}
                                >
                                  {z.name}
                                </div>
                              ))}
                              {filteredZones.length === 0 && (
                                <div className="px-3 py-4 text-[10px] text-gray-400 italic text-center">Tidak ditemukan</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {entityType === 'quotation' && (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Terms</label>
                      <div className="relative">
                        <div 
                          onClick={() => setIsTermSearchOpen(!isTermSearchOpen)}
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 cursor-pointer flex items-center justify-between hover:border-gray-300 transition-all"
                        >
                          <span className={selectedTerm ? 'text-gray-800' : 'text-gray-400'}>
                            {selectedTerm ? selectedTerm.name : 'Pilih Terms...'}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>

                        <AnimatePresence>
                          {isTermSearchOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[120] overflow-hidden"
                            >
                              <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                <div className="relative">
                                  <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input 
                                    autoFocus
                                    type="text"
                                    value={termSearchQuery}
                                    onChange={(e) => setTermSearchQuery(e.target.value)}
                                    placeholder="Cari terms..."
                                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E30613]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredTerms.map(pt => (
                                  <div 
                                    key={pt.id}
                                    onClick={() => {
                                      setSelectedPaymentTermId(pt.id)
                                      setIsTermSearchOpen(false)
                                      setTermSearchQuery('')
                                    }}
                                    className={`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors ${selectedPaymentTermId === pt.id ? 'bg-[#E30613] text-white' : 'text-gray-700 hover:bg-red-50 hover:text-[#E30613]'}`}
                                  >
                                    {pt.name}
                                  </div>
                                ))}
                                {filteredTerms.length === 0 && (
                                  <div className="px-3 py-4 text-[10px] text-gray-400 italic text-center">Tidak ditemukan</div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>

                  <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center gap-2">
                    <div className="text-orange-600 shrink-0">
                      <AlertCircle size={12} />
                    </div>
                    <p className="text-[9px] leading-tight text-orange-800 font-bold uppercase tracking-tight">
                      Cek kembali alamat & zonasi untuk akurasi PDF.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          {entityType === 'contract' && !isMetadataLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Penanda Tangan (Pihak Kedua)</label>
                <select 
                  value={selectedSignatoryId}
                  onChange={(e) => setSelectedSignatoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                >
                  <option value="">Pilih Penanda Tangan...</option>
                  {signatories?.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.job_title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">No. KTP Client (Pihak Pertama)</label>
                <input 
                  type="text"
                  value={clientKtp}
                  onChange={(e) => setClientKtp(e.target.value)}
                  placeholder="Masukkan nomor KTP customer..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
                />
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="overflow-x-visible">
              <table className="w-full text-left border-separate border-spacing-y-3 min-w-[1000px]">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <th className="pb-2 px-4">Deskripsi Item</th>
                    <th className="pb-2 px-2 w-20 text-center">Unit</th>
                    <th className="pb-2 px-2 w-24 text-center">Quantity</th>
                    <th className="pb-2 px-2 w-36 text-right">Harga Satuan</th>
                    <th className="pb-2 px-2 w-32 text-right">Min. Price</th>
                    <th className="pb-2 px-2 w-40 text-right">Subtotal</th>
                    <th className="pb-2 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {items.map((item, idx) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx} 
                      onClick={() => item.type === 'catalog' && setActiveBuilderIdx(idx)}
                      className={`group bg-white hover:bg-gray-50/50 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl border border-gray-100 ${item.type === 'catalog' ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-4 px-4 rounded-l-2xl border-y border-l border-gray-100">
                        <div className="flex items-center gap-3">
                          {entityType === 'quotation' && (
                            <div className="relative group/thumb shrink-0">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveBuilderIdx(idx)
                                }}
                                className={`p-2 rounded-xl transition-all active:scale-95 overflow-hidden border ${item.builder_costs && item.builder_costs.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-[#E30613] hover:border-red-100 hover:bg-red-50/50'}`}
                                title="Buka Builder Cost"
                              >
                                {item.catalog_id && catalogCache[item.catalog_id]?.image_url ? (
                                  <img 
                                    src={catalogCache[item.catalog_id].image_url} 
                                    alt="thumb" 
                                    className="w-5 h-5 object-cover rounded-md"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image'
                                    }}
                                  />
                                ) : (
                                  <Calculator size={16} />
                                )}
                              </button>
                              {item.catalog_id && catalogCache[item.catalog_id]?.image_url && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-white opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none z-[130] bg-white">
                                  <img 
                                    src={catalogCache[item.catalog_id].image_url} 
                                    alt="preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={(e) => handleChangeItem(idx, 'name', e.target.value)}
                              onFocus={() => {
                                if (item.name.length >= 2) handleSearch(item.name, idx)
                              }}
                              placeholder="Nama material/jasa..."
                              className="w-full bg-transparent font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none text-sm"
                            />
                            {item.catalog_id && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-1 h-1 rounded-full bg-blue-400" />
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Katalog Terhubung</span>
                              </div>
                            )}

                            {/* Search Dropdown */}
                            {activeSearchIdx === idx && (searchResults.length > 0 || isSearching) && (
                              <div className={`absolute left-0 w-[400px] bg-white border border-gray-200 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in duration-200 ${idx >= items.length - 2 && items.length > 2 ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}>
                                {isSearching ? (
                                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-gray-400 font-bold">
                                    <Loader2 size={14} className="animate-spin" />
                                    Mencari di katalog...
                                  </div>
                                ) : (
                                  <div className="max-h-60 overflow-auto">
                                    <div className="p-2 bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Search size={10} /> Hasil dari Katalog
                                    </div>
                                    {searchResults.map((res) => (
                                      <button
                                        key={res.id}
                                        onClick={() => handleSelectCatalog(res, idx)}
                                        className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group/item flex items-start gap-3"
                                      >
                                        {res.image_url ? (
                                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                                            <img src={res.image_url} alt={res.title} className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <ImageIcon size={16} className="text-gray-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-gray-800 group-hover/item:text-blue-700 text-sm truncate">{res.title}</div>
                                          <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Unit: {res.base_price_unit}</span>
                                            <span className="text-[10px] font-black text-blue-600">Rp {formatCurrency(res.base_price_per_m2 || 0)}</span>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 border-y border-gray-100">
                        <input 
                          type="text" 
                          value={item.unit} 
                          onChange={(e) => handleChangeItem(idx, 'unit', e.target.value)}
                          placeholder="m², unit..."
                          className="w-full bg-transparent text-center text-gray-500 font-bold text-xs focus:outline-none"
                        />
                      </td>
                      <td className="py-4 px-2 border-y border-gray-100">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleChangeItem(idx, 'quantity', parseFloat(e.target.value))}
                          readOnly={item.type === 'catalog'}
                          className={`w-full border rounded-xl px-2 py-2 text-center font-black text-gray-900 focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all text-xs ${item.type === 'catalog' ? 'bg-gray-100/50 border-transparent cursor-not-allowed' : 'bg-gray-50/50 border-gray-100'}`}
                        />
                      </td>
                      <td className="py-4 px-2 border-y border-gray-100">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-gray-300 font-black">Rp</span>
                          <input 
                            type="number" 
                            value={item.unit_price} 
                            onChange={(e) => handleChangeItem(idx, 'unit_price', parseFloat(e.target.value))}
                            readOnly={item.type === 'catalog'}
                            className={`w-full border rounded-xl px-3 py-2 text-right font-black text-gray-900 focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all text-xs ${item.type === 'catalog' ? 'bg-gray-100/50 border-transparent cursor-not-allowed' : 'bg-gray-50/50 border-gray-100'} ${getItemMinPrice(item, idx) > 0 && item.unit_price < getItemMinPrice(item, idx) ? 'border-red-200 text-red-600 bg-red-50/30' : ''}`}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-2 border-y border-gray-100">
                        {getItemMinPrice(item, idx) > 0 ? (
                          <div className="flex flex-col items-end px-2">
                            <span className="text-[10px] font-bold text-gray-400">Rp {formatCurrency(getItemMinPrice(item, idx))}</span>
                            {item.unit_price < getItemMinPrice(item, idx) && (
                              <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Under Minimum</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-200 italic block text-right px-2">-</span>
                        )}
                      </td>
                      <td className="py-4 px-2 border-y border-gray-100 text-right font-black text-gray-900 text-sm">
                        Rp {formatCurrency(item.subtotal)}
                      </td>
                      <td className="py-4 px-4 rounded-r-2xl border-y border-r border-gray-100 text-center">
                        <button 
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

          <button 
            onClick={handleAddItem}
            className="mt-6 flex items-center gap-2 text-[10px] font-black text-[#E30613] uppercase tracking-widest hover:text-[#1D1D1B] transition-colors"
          >
            <Plus size={14} /> Tambah Item Baru
          </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} className="text-gray-400" /> Catatan Internal / Syarat & Ketentuan Khusus
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan khusus untuk penawaran ini (akan muncul di PDF)..."
                rows={4}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#E30613] transition-all resize-none"
              />
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-gray-400" /> Gambar Referensi / Lampiran
                </label>
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-[#E30613]/10 text-[#E30613] rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-[#E30613]/20 transition-all">
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Upload Gambar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-all">
                        <ExternalLink size={14} />
                      </a>
                      <button 
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 bg-white rounded-lg text-gray-700 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="col-span-full py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl opacity-40">
                    <ImageIcon size={24} className="text-gray-400 mb-2" />
                    <p className="text-[9px] font-black text-gray-400 uppercase">Belum ada lampiran</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total {entityType === 'quotation' ? 'Penawaran' : entityType === 'contract' ? 'Kontrak' : 'Invoice'}</span>
              <span className="text-2xl font-black text-[#1D1D1B]">Rp {formatCurrency(totalAmount)}</span>
            </div>

            <AnimatePresence>
              {totalAmount < totalMinAmount && (
                <motion.div 
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-2xl shadow-sm animate-pulse"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-tight">Quote Minimum Warning</span>
                    <span className="text-sm font-black text-red-700">Rp {formatCurrency(totalMinAmount)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Batalkan
            </button>
            <button 
              onClick={handleSave}
              disabled={isPending || isBelowMinAnyItem || totalAmount < totalMinAmount}
              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 flex items-center gap-2 ${(isBelowMinAnyItem || totalAmount < totalMinAmount) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#E30613] text-white hover:bg-red-700'}`}
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </footer>
      </div>

      {/* Hierarchical Builder Modal */}
      {activeBuilderIdx !== null && (
        <QuoteBuilderClient 
          initialData={items[activeBuilderIdx]}
          parentZoneId={selectedZoneId}
          disableFlatFee={activeBuilderIdx !== 0}
          customerInfo={customerProfile ? {
            name: customerProfile.name,
            phone: customerProfile.phone,
            min_price_per_m2: Number(customerProfile.min_price_per_m2 || 0),
            tier: customerProfile.tier
          } : undefined}
          onSave={(updatedLine) => {
            const newItems = [...items]
            newItems[activeBuilderIdx] = updatedLine
            setItems(newItems)
          }}
          onClose={() => setActiveBuilderIdx(null)}
        />
      )}
    </div>
  )
}
