'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import type { PaymentTerm, Zone } from './types'

interface MetadataSectionProps {
  isMetadataLoading: boolean
  isLocked: boolean
  entityType: 'quotation' | 'contract' | 'invoice'
  customerName: string
  customerPhoneState: string
  customerEmail: string
  customerAddress: string
  selectedZone: Zone | undefined
  selectedZoneId: string
  isZoneSearchOpen: boolean
  zoneSearchQuery: string
  filteredZones: Zone[]
  selectedTerm: PaymentTerm | undefined
  selectedPaymentTermId: string
  isTermSearchOpen: boolean
  termSearchQuery: string
  filteredTerms: PaymentTerm[]
  onSetCustomerName: (value: string) => void
  onSetCustomerPhoneState: (value: string) => void
  onSetCustomerEmail: (value: string) => void
  onSetCustomerAddress: (value: string) => void
  onToggleZoneSearchOpen: () => void
  onSetZoneSearchQuery: (value: string) => void
  onSelectZone: (zoneId: string) => void
  onCloseZoneSearch: () => void
  onToggleTermSearchOpen: () => void
  onSetTermSearchQuery: (value: string) => void
  onSelectTerm: (termId: string) => void
  onCloseTermSearch: () => void
}

export default function MetadataSection({
  isMetadataLoading,
  isLocked,
  entityType,
  customerName,
  customerPhoneState,
  customerEmail,
  customerAddress,
  selectedZone,
  selectedZoneId,
  isZoneSearchOpen,
  zoneSearchQuery,
  filteredZones,
  selectedTerm,
  selectedPaymentTermId,
  isTermSearchOpen,
  termSearchQuery,
  filteredTerms,
  onSetCustomerName,
  onSetCustomerPhoneState,
  onSetCustomerEmail,
  onSetCustomerAddress,
  onToggleZoneSearchOpen,
  onSetZoneSearchQuery,
  onSelectZone,
  onCloseZoneSearch,
  onToggleTermSearchOpen,
  onSetTermSearchQuery,
  onSelectTerm,
  onCloseTermSearch,
}: MetadataSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
      {isMetadataLoading ? (
        <div className="p-8 flex items-center justify-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-widest">
          <Loader2 size={20} className="animate-spin text-[#E30613]" />
          Memuat Data Lead...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-4 space-y-3 bg-gray-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onSetCustomerName(e.target.value)}
                  readOnly={isLocked}
                  placeholder="Nama..."
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isLocked
                      ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                      : 'bg-white border-gray-200 text-gray-800 focus:ring-1 focus:ring-[#E30613]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <input
                  type="text"
                  value={customerPhoneState}
                  onChange={(e) => onSetCustomerPhoneState(e.target.value)}
                  readOnly={isLocked}
                  placeholder="0812..."
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isLocked
                      ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                      : 'bg-white border-gray-200 text-gray-800 focus:ring-1 focus:ring-[#E30613]'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => onSetCustomerEmail(e.target.value)}
                  readOnly={isLocked}
                  placeholder="email@..."
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isLocked
                      ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                      : 'bg-white border-gray-200 text-gray-800 focus:ring-1 focus:ring-[#E30613]'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Alamat Proyek</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => onSetCustomerAddress(e.target.value)}
                  readOnly={isLocked}
                  placeholder="Alamat..."
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none ${
                    isLocked
                      ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                      : 'bg-white border-gray-200 text-gray-800 focus:ring-1 focus:ring-[#E30613]'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Zonasi</label>
                <div className="relative">
                  <div
                    onClick={() => !isLocked && onToggleZoneSearchOpen()}
                    className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                      isLocked
                        ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                        : 'bg-gray-50 border-gray-200 text-gray-800 cursor-pointer hover:border-gray-300'
                    }`}
                  >
                    <span className={selectedZone ? (isLocked ? 'text-gray-500' : 'text-gray-800') : 'text-gray-400'}>
                      {selectedZone ? selectedZone.name : 'Pilih Zona...'}
                    </span>
                    {!isLocked && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
                  </div>
                  <AnimatePresence>
                    {isZoneSearchOpen && !isLocked && (
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
                              onChange={(e) => onSetZoneSearchQuery(e.target.value)}
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
                                onSelectZone(z.id)
                                onCloseZoneSearch()
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
                      onClick={() => !isLocked && onToggleTermSearchOpen()}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                        isLocked
                          ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                          : 'bg-gray-50 border-gray-200 text-gray-800 cursor-pointer hover:border-gray-300'
                      }`}
                    >
                      <span className={selectedTerm ? (isLocked ? 'text-gray-500' : 'text-gray-800') : 'text-gray-400'}>
                        {selectedTerm ? selectedTerm.name : 'Pilih Terms...'}
                      </span>
                      {!isLocked && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
                    </div>
                    <AnimatePresence>
                      {isTermSearchOpen && !isLocked && (
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
                                onChange={(e) => onSetTermSearchQuery(e.target.value)}
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
                                  onSelectTerm(pt.id)
                                  onCloseTermSearch()
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
  )
}
