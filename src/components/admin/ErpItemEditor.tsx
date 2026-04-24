'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertCircle, Calculator, X } from 'lucide-react'
import { updateQuotationItems } from '@/app/actions/quotations'
import { updateContractItems, updateInvoiceItems } from '@/app/actions/erp'
import { searchCatalogs } from '@/app/actions/catalogs'
import { toast } from '@/components/ui/toaster'
import QuoteBuilderClient from '@/components/admin/QuoteBuilderClient'
import MetadataSection from '@/components/admin/erp/editor/MetadataSection'
import ContractPartySection from '@/components/admin/erp/editor/ContractPartySection'
import ItemsTableSection from '@/components/admin/erp/editor/ItemsTableSection'
import NotesAttachmentsSection from '@/components/admin/erp/editor/NotesAttachmentsSection'
import EditorFooter from '@/components/admin/erp/editor/EditorFooter'
import { useErpAttachments } from '@/components/admin/erp/editor/hooks/useErpAttachments'
import { useErpMetadata } from '@/components/admin/erp/editor/hooks/useErpMetadata'
import { useErpPricing } from '@/components/admin/erp/editor/hooks/useErpPricing'
import type { Catalog, CatalogCosting, ErpItem } from '@/components/admin/erp/editor/types'

interface ErpItemEditorProps {
  entityId: string
  entityType: 'quotation' | 'contract' | 'invoice'
  initialItems: ErpItem[]
  customerPhone?: string
  status?: string
  version?: number
  signatories?: { id: string; name: string; job_title: string }[]
  onClose: () => void
  onCreateRevision?: () => void
}

export default function ErpItemEditor({
  entityId,
  entityType,
  initialItems,
  customerPhone,
  status,
  version,
  signatories,
  onClose,
  onCreateRevision,
}: ErpItemEditorProps) {
  const [items, setItems] = useState<ErpItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [searchResults, setSearchResults] = useState<Catalog[]>([])
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [activeBuilderIdx, setActiveBuilderIdx] = useState<number | null>(null)
  const isLocked = status === 'approved'

  const resolveBaselineCosts = (item: ErpItem) => {
    if ((item.baseline_costs?.length || 0) > 0) return item.baseline_costs
    if (!item.builder_costs?.length) return []

    return item.builder_costs.map((cost, idx) => ({
      quotation_item_id: item.id || '',
      component_key: String(cost.id || `${item.id || 'item'}-seed-${idx + 1}`),
      component_name: String(cost.name || `Komponen ${idx + 1}`),
      segment: String(cost.type || 'lainnya'),
      unit_snapshot: String(cost.unit || 'unit'),
      qty_snapshot: Number(cost.qtyCharged ?? cost.qtyNeeded ?? 0) || 0,
      hpp_snapshot: Number(cost.hpp || 0) || 0,
      subtotal_snapshot: Number(cost.subtotal || 0) || 0,
      source_type: String((cost.id || '').startsWith('addon-') ? 'addon' : 'catalog'),
    }))
  }

  const {
    attachments,
    setAttachments,
    isUploading,
    handleFileUpload,
    removeAttachment,
  } = useErpAttachments({ entityId })

  const {
    isContracted,
    customerProfile,
    customerName,
    setCustomerName,
    customerPhoneState,
    setCustomerPhoneState,
    customerEmail,
    setCustomerEmail,
    customerAddress,
    setCustomerAddress,
    isMetadataLoading,
    selectedSignatoryId,
    setSelectedSignatoryId,
    clientKtp,
    setClientKtp,
    selectedZoneId,
    setSelectedZoneId,
    zones,
    isZoneSearchOpen,
    setIsZoneSearchOpen,
    zoneSearchQuery,
    setZoneSearchQuery,
    filteredZones,
    selectedZone,
    selectedPaymentTermId,
    setSelectedPaymentTermId,
    isTermSearchOpen,
    setIsTermSearchOpen,
    termSearchQuery,
    setTermSearchQuery,
    filteredTerms,
    selectedTerm,
    notes,
    setNotes,
    clientAddress,
    clientEmail,
  } = useErpMetadata({
    entityId,
    entityType,
    customerPhone,
    setAttachments,
  })

  const {
    catalogCache,
    setCatalogCache,
    totalAmount,
    totalMinAmount,
    isBelowMinAnyItem,
    getItemMinPrice,
  } = useErpPricing({
    items,
    selectedZoneId,
    zones,
  })

  const handleAddItem = () => {
    setItems([...items, { name: '', unit: '', quantity: 0, unit_price: 0, subtotal: 0, type: 'manual' }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
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

  const handleChangeItem = (index: number, field: keyof ErpItem, value: string | number | null) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value } as ErpItem

    if (field === 'quantity' || field === 'unit_price') {
      item.subtotal = Math.ceil((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))
    }

    newItems[index] = item
    setItems(newItems)

    if (field === 'name' && typeof value === 'string') {
      if (value.length >= 2) {
        handleSearch(value, index)
      } else {
        setSearchResults([])
        setActiveSearchIdx(null)
      }
    }
  }

  const handleSelectCatalog = (catalog: CatalogCosting, index: number) => {
    setCatalogCache(prev => ({ ...prev, [catalog.id]: catalog }))

    const newItems = [...items]
    const unit = catalog.base_price_unit === 'm2' ? 'm²' : catalog.base_price_unit === 'm1' ? 'm¹' : 'unit'

    newItems[index] = {
      ...newItems[index],
      name: catalog.title || '',
      unit,
      unit_price: Number(catalog.base_price_per_m2 || 0),
      quantity: 1,
      subtotal: Math.ceil(1 * Number(catalog.base_price_per_m2 || 0)),
      type: 'catalog',
      catalog_id: catalog.id,
      atap_id: catalog.atap_id || null,
      rangka_id: catalog.rangka_id || null,
      finishing_id: catalog.finishing_id || null,
      isian_id: catalog.isian_id || null,
      builder_costs: [],
      panjang: 1,
      lebar: 1,
      unit_qty: 1
    }

    setItems(newItems)
    setSearchResults([])
    setActiveSearchIdx(null)
    setActiveBuilderIdx(index)
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setSearchResults([])
      setActiveSearchIdx(null)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

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
            attachments
          })
        } else {
          await updateInvoiceItems(entityId, items, totalAmount, notes, attachments)
        }
        toast.success('Berhasil', `Item ${entityType} berhasil diperbarui secara independen.`)
        onClose()
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan.'
        toast.error('Gagal', errorMessage)
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
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  Editor Item {entityType === 'quotation' ? 'Penawaran' : entityType === 'contract' ? 'Kontrak' : 'Invoice'}
                  {version && version > 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md uppercase tracking-wider">
                      V{version}
                    </span>
                  )}
                  {isLocked && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle size={10} /> Approved
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">Auto-save aktif untuk profil customer</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-900">
              <X size={18} />
            </button>
          </div>

          <MetadataSection
            isMetadataLoading={isMetadataLoading}
            isLocked={isLocked}
            entityType={entityType}
            customerName={customerName}
            customerPhoneState={customerPhoneState}
            customerEmail={customerEmail}
            customerAddress={customerAddress}
            selectedZone={selectedZone}
            selectedZoneId={selectedZoneId}
            isZoneSearchOpen={isZoneSearchOpen}
            zoneSearchQuery={zoneSearchQuery}
            filteredZones={filteredZones}
            selectedTerm={selectedTerm}
            selectedPaymentTermId={selectedPaymentTermId}
            isTermSearchOpen={isTermSearchOpen}
            termSearchQuery={termSearchQuery}
            filteredTerms={filteredTerms}
            onSetCustomerName={setCustomerName}
            onSetCustomerPhoneState={setCustomerPhoneState}
            onSetCustomerEmail={setCustomerEmail}
            onSetCustomerAddress={setCustomerAddress}
            onToggleZoneSearchOpen={() => setIsZoneSearchOpen((prev) => !prev)}
            onSetZoneSearchQuery={setZoneSearchQuery}
            onSelectZone={setSelectedZoneId}
            onCloseZoneSearch={() => {
              setIsZoneSearchOpen(false)
              setZoneSearchQuery('')
            }}
            onToggleTermSearchOpen={() => setIsTermSearchOpen((prev) => !prev)}
            onSetTermSearchQuery={setTermSearchQuery}
            onSelectTerm={setSelectedPaymentTermId}
            onCloseTermSearch={() => {
              setIsTermSearchOpen(false)
              setTermSearchQuery('')
            }}
          />
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          {entityType === 'contract' && !isMetadataLoading && (
            <ContractPartySection
              selectedSignatoryId={selectedSignatoryId}
              clientKtp={clientKtp}
              signatories={signatories}
              onSetSelectedSignatoryId={setSelectedSignatoryId}
              onSetClientKtp={setClientKtp}
            />
          )}

          <ItemsTableSection
            items={items}
            entityType={entityType}
            isLocked={isLocked}
            catalogCache={catalogCache}
            searchResults={searchResults}
            isSearching={isSearching}
            activeSearchIdx={activeSearchIdx}
            onChangeItem={handleChangeItem}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddItem}
            onSearch={handleSearch}
            onSelectCatalog={handleSelectCatalog}
            onOpenBuilder={(idx) => setActiveBuilderIdx(idx)}
            getItemMinPrice={getItemMinPrice}
          />

          <NotesAttachmentsSection
            notes={notes}
            attachments={attachments}
            isUploading={isUploading}
            isLocked={isLocked}
            onChangeNotes={setNotes}
            onFileUpload={handleFileUpload}
            onRemoveAttachment={removeAttachment}
          />
        </div>

        <EditorFooter
          entityType={entityType}
          totalAmount={totalAmount}
          totalMinAmount={totalMinAmount}
          isBelowMinAnyItem={isBelowMinAnyItem}
          isPending={isPending}
          isLocked={isLocked}
          isContracted={isContracted}
          version={version}
          onClose={onClose}
          onSave={handleSave}
          onCreateRevision={onCreateRevision}
        />
      </div>

      {activeBuilderIdx !== null && (
        <QuoteBuilderClient
          initialData={{
            ...items[activeBuilderIdx],
            baseline_costs: resolveBaselineCosts(items[activeBuilderIdx]),
          }}
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
