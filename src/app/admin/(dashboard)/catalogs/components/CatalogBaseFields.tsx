'use client'

import { useMemo, useState } from 'react'

type Option = {
  id: string
  name: string
  variant_name?: string | null
  unit?: string | null
  category?: string | null
}
type CatalogCategoryOption = {
  code: string
  name: string
  require_atap?: boolean
  require_rangka?: boolean
  require_isian?: boolean
  require_finishing?: boolean
}

export default function CatalogBaseFields({
  atapList,
  rangkaList,
  finishingList,
  isianList,
  categoryOptions,
  initialCategory = '',
  initialAtapId = '',
  initialRangkaId = '',
  initialFinishingId = '',
  initialIsianId = ''
}: {
  atapList: Option[]
  rangkaList: Option[]
  finishingList: Option[]
  isianList: Option[]
  categoryOptions: CatalogCategoryOption[]
  initialCategory?: string
  initialAtapId?: string
  initialRangkaId?: string
  initialFinishingId?: string
  initialIsianId?: string
}) {
  const [category, setCategory] = useState<string>(initialCategory || '')
  const [atapId, setAtapId] = useState(initialAtapId || '')
  const [rangkaId, setRangkaId] = useState(initialRangkaId || '')
  const [finishingId, setFinishingId] = useState(initialFinishingId || '')
  const [isianId, setIsianId] = useState(initialIsianId || '')

  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.code === category) ?? null,
    [categoryOptions, category],
  )
  const showAtap = !!selectedCategory?.require_atap
  const showRangka = !!selectedCategory?.require_rangka
  const showIsian = !!selectedCategory?.require_isian
  const showFinishing = !!selectedCategory?.require_finishing

  const onCategoryChange = (next: string) => {
    setCategory(next)
    const nextCategory = categoryOptions.find((item) => item.code === next)
    if (!nextCategory?.require_atap) setAtapId('')
    if (!nextCategory?.require_rangka) setRangkaId('')
    if (!nextCategory?.require_isian) setIsianId('')
    if (!nextCategory?.require_finishing) setFinishingId('')
  }

  const toOptionLabel = (option: Option) => {
    const variant =
      option.variant_name && option.variant_name.toLowerCase() !== 'default'
        ? ` - ${option.variant_name}`
        : ''
    const unit = option.unit ? ` (${option.unit})` : ''
    return `${option.name}${variant}${unit}`
  }

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Kategori *</label>
        <select
          name="category"
          className="w-full px-4 py-2 border rounded-md"
          required
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">Pilih Kategori...</option>
          {categoryOptions.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {showAtap ? (
        <div>
          <label className="block text-sm font-medium mb-2">Material Atap</label>
          <select
            name="atap_id"
            className="w-full px-4 py-2 border rounded-md"
            value={atapId}
            onChange={(e) => setAtapId(e.target.value)}
            required={showAtap}
          >
            <option value="">Pilih Atap...</option>
            {atapList?.map((m) => (
              <option key={m.id} value={m.id}>{toOptionLabel(m)}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="atap_id" value="" />
      )}

      {showRangka ? (
        <div>
          <label className="block text-sm font-medium mb-2">Material Rangka *</label>
          <select
            name="rangka_id"
            className="w-full px-4 py-2 border rounded-md"
            value={rangkaId}
            onChange={(e) => setRangkaId(e.target.value)}
            required={showRangka}
          >
            <option value="">Pilih Rangka...</option>
            {rangkaList?.map((m) => (
              <option key={m.id} value={m.id}>{toOptionLabel(m)}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="rangka_id" value="" />
      )}

      {showIsian ? (
        <div>
          <label className="block text-sm font-medium mb-2">Material Isian *</label>
          <select
            name="isian_id"
            className="w-full px-4 py-2 border rounded-md"
            value={isianId}
            onChange={(e) => setIsianId(e.target.value)}
            required={showIsian}
          >
            <option value="">Pilih Isian...</option>
            {isianList?.map((m) => (
              <option key={m.id} value={m.id}>{toOptionLabel(m)}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="isian_id" value="" />
      )}

      {showFinishing ? (
        <div>
          <label className="block text-sm font-medium mb-2">Jenis Finishing *</label>
          <select
            name="finishing_id"
            className="w-full px-4 py-2 border rounded-md"
            value={finishingId}
            onChange={(e) => setFinishingId(e.target.value)}
            required={showFinishing}
          >
            <option value="">Pilih Finishing...</option>
            {finishingList?.map((m) => (
              <option key={m.id} value={m.id}>{toOptionLabel(m)}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="finishing_id" value="" />
      )}
    </>
  )
}
