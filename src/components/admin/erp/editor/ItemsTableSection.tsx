'use client'

import { motion } from 'framer-motion'
import { Calculator, Image as ImageIcon, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils/costing'
import type { Catalog, CatalogCosting, ErpItem } from './types'

interface ItemsTableSectionProps {
  items: ErpItem[]
  entityType: 'quotation' | 'contract' | 'invoice'
  isLocked?: boolean
  catalogCache: Record<string, CatalogCosting>
  searchResults: Catalog[]
  isSearching: boolean
  activeSearchIdx: number | null
  onChangeItem: (index: number, field: keyof ErpItem, value: string | number | null) => void
  onRemoveItem: (index: number) => void
  onAddItem: () => void
  onSearch: (query: string, index: number) => void
  onSelectCatalog: (catalog: CatalogCosting, index: number) => void
  onOpenBuilder: (index: number) => void
  getItemMinPrice: (item: ErpItem, idx: number) => number
}

export default function ItemsTableSection({
  items,
  entityType,
  isLocked,
  catalogCache,
  searchResults,
  isSearching,
  activeSearchIdx,
  onChangeItem,
  onRemoveItem,
  onAddItem,
  onSearch,
  onSelectCatalog,
  onOpenBuilder,
  getItemMinPrice,
}: ItemsTableSectionProps) {
  return (
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
          <tbody>
            {items.map((item, idx) => (
              <motion.tr
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                onClick={() => item.type === 'catalog' && onOpenBuilder(idx)}
                className={`group bg-white hover:bg-gray-50/50 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl border border-gray-100 ${
                  item.type === 'catalog' ? 'cursor-pointer' : ''
                }`}
              >
                <td className="py-4 px-4 rounded-l-2xl border-y border-l border-gray-100">
                  <div className="flex items-center gap-3">
                    {entityType === 'quotation' && (
                      <div className="relative group/thumb shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenBuilder(idx)
                          }}
                          className={`p-2 rounded-xl transition-all active:scale-95 overflow-hidden border ${
                            item.builder_costs && item.builder_costs.length > 0
                              ? 'bg-blue-50 text-blue-600 border-blue-100'
                              : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-[#E30613] hover:border-red-100 hover:bg-red-50/50'
                          } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={isLocked}
                          title={isLocked ? 'Sudah disetujui (Locked)' : 'Buka Builder Cost'}
                        >
                          {item.catalog_id && catalogCache[item.catalog_id]?.image_url ? (
                            <Image
                              src={catalogCache[item.catalog_id].image_url!}
                              alt="thumb"
                              width={20}
                              height={20}
                              className="w-5 h-5 object-cover rounded-md"
                            />
                          ) : (
                            <Calculator size={16} />
                          )}
                        </button>
                        {item.catalog_id && catalogCache[item.catalog_id]?.image_url && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-white opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none z-[130] bg-white">
                            <Image
                              src={catalogCache[item.catalog_id].image_url!}
                              alt="preview"
                              width={128}
                              height={128}
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
                        onChange={(e) => onChangeItem(idx, 'name', e.target.value as string)}
                        onFocus={() => {
                          if (!isLocked && item.name.length >= 2) onSearch(item.name, idx)
                        }}
                        readOnly={isLocked}
                        placeholder="Nama material/jasa..."
                        className={`w-full bg-transparent font-bold text-gray-800 placeholder:text-gray-300 focus:outline-none text-sm ${isLocked ? 'cursor-default' : ''}`}
                      />
                      {item.catalog_id && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-blue-400" />
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Katalog Terhubung</span>
                        </div>
                      )}

                      {!isLocked && activeSearchIdx === idx && (searchResults.length > 0 || isSearching) && (
                        <div
                          className={`absolute left-0 w-[400px] bg-white border border-gray-200 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in duration-200 ${
                            idx >= items.length - 2 && items.length > 2
                              ? 'bottom-full mb-2 slide-in-from-bottom-2'
                              : 'top-full mt-2 slide-in-from-top-2'
                          }`}
                        >
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
                                  onClick={() => onSelectCatalog(res as unknown as CatalogCosting, idx)}
                                  className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group/item flex items-start gap-3"
                                >
                                  {res.image_url ? (
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                                      <Image src={res.image_url} alt={res.title} fill className="object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                      <ImageIcon size={16} className="text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 group-hover/item:text-blue-700 text-sm truncate">
                                      {res.title}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                                        Unit: {res.base_price_unit}
                                      </span>
                                      <span className="text-[10px] font-black text-blue-600">
                                        Rp {formatCurrency(res.base_price_per_m2 || 0)}
                                      </span>
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
                    onChange={(e) => onChangeItem(idx, 'unit', e.target.value)}
                    readOnly={isLocked}
                    placeholder="m², unit..."
                    className={`w-full bg-transparent text-center text-gray-500 font-bold text-xs focus:outline-none ${isLocked ? 'cursor-default' : ''}`}
                  />
                </td>
                <td className="py-4 px-2 border-y border-gray-100">
                  <input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => onChangeItem(idx, 'quantity', parseFloat(e.target.value))}
                    readOnly={isLocked}
                    className={`w-full border rounded-xl px-2 py-2 text-center font-black text-gray-900 focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all text-xs ${
                      isLocked
                        ? 'bg-gray-100/50 border-transparent cursor-default'
                        : 'bg-gray-50/50 border-gray-100'
                    }`}
                  />
                </td>
                <td className="py-4 px-2 border-y border-gray-100">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[10px] text-gray-300 font-black">Rp</span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => onChangeItem(idx, 'unit_price', parseFloat(e.target.value))}
                      readOnly={isLocked || item.type === 'catalog'}
                      className={`w-full border rounded-xl px-3 py-2 text-right font-black text-gray-900 focus:ring-2 focus:ring-[#E30613]/10 focus:border-[#E30613] transition-all text-xs ${
                        isLocked || item.type === 'catalog'
                          ? 'bg-gray-100/50 border-transparent cursor-not-allowed'
                          : 'bg-gray-50/50 border-gray-100'
                      } ${
                        !isLocked && getItemMinPrice(item, idx) > 0 && item.unit_price < getItemMinPrice(item, idx)
                          ? 'border-red-200 text-red-600 bg-red-50/30'
                          : ''
                      }`}
                    />
                  </div>
                </td>
                <td className="py-4 px-2 border-y border-gray-100">
                  {getItemMinPrice(item, idx) > 0 ? (
                    <div className="flex flex-col items-end px-2">
                      <span className="text-[10px] font-bold text-gray-400">
                        Rp {formatCurrency(getItemMinPrice(item, idx))}
                      </span>
                      {!isLocked && item.unit_price < getItemMinPrice(item, idx) && (
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
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveItem(idx)
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLocked && (
        <button
          onClick={onAddItem}
          className="mt-6 flex items-center gap-2 text-[10px] font-black text-[#E30613] uppercase tracking-widest hover:text-[#1D1D1B] transition-colors"
        >
          <Plus size={14} /> Tambah Item Baru
        </button>
      )}
    </div>
  )
}
