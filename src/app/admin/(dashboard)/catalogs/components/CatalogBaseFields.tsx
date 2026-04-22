'use client'

import { useMemo, useState } from 'react'
import SearchDropdown, { type SearchDropdownOption } from './SearchDropdown'

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

  const categoryDropdownOptions = useMemo<SearchDropdownOption[]>(
    () =>
      categoryOptions.map((item) => ({
        value: item.code,
        label: item.name,
        keywords: item.code,
      })),
    [categoryOptions],
  )

  const buildMaterialCategories = (list: Option[]) => {
    const unique = new Set(
      list
        .map((item) => String(item.category ?? '').trim())
        .filter((item) => item.length > 0),
    )
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }

  const buildMaterialOptions = (list: Option[], materialCategory: string): SearchDropdownOption[] => {
    const normalizedCategory = materialCategory.toLowerCase()
    return list
      .filter((item) => {
        if (!normalizedCategory) return true
        return String(item.category ?? '').toLowerCase() === normalizedCategory
      })
      .map((item) => ({
        value: item.id,
        label: toOptionLabel(item),
        group: item.category ?? 'lainnya',
        keywords: `${item.name} ${item.variant_name ?? ''} ${item.unit ?? ''} ${item.category ?? ''}`,
      }))
  }

  const initialAtapCategory = useMemo(
    () => atapList.find((item) => item.id === initialAtapId)?.category ?? '',
    [atapList, initialAtapId],
  )
  const initialRangkaCategory = useMemo(
    () => rangkaList.find((item) => item.id === initialRangkaId)?.category ?? '',
    [rangkaList, initialRangkaId],
  )
  const initialIsianCategory = useMemo(
    () => isianList.find((item) => item.id === initialIsianId)?.category ?? '',
    [isianList, initialIsianId],
  )
  const initialFinishingCategory = useMemo(
    () => finishingList.find((item) => item.id === initialFinishingId)?.category ?? '',
    [finishingList, initialFinishingId],
  )

  const [atapCategory, setAtapCategory] = useState(initialAtapCategory)
  const [rangkaCategory, setRangkaCategory] = useState(initialRangkaCategory)
  const [isianCategory, setIsianCategory] = useState(initialIsianCategory)
  const [finishingCategory, setFinishingCategory] = useState(initialFinishingCategory)

  const atapCategoryOptions = useMemo<SearchDropdownOption[]>(
    () =>
      buildMaterialCategories(atapList).map((item) => ({
        value: item,
        label: item,
      })),
    [atapList],
  )
  const rangkaCategoryOptions = useMemo<SearchDropdownOption[]>(
    () =>
      buildMaterialCategories(rangkaList).map((item) => ({
        value: item,
        label: item,
      })),
    [rangkaList],
  )
  const isianCategoryOptions = useMemo<SearchDropdownOption[]>(
    () =>
      buildMaterialCategories(isianList).map((item) => ({
        value: item,
        label: item,
      })),
    [isianList],
  )
  const finishingCategoryOptions = useMemo<SearchDropdownOption[]>(
    () =>
      buildMaterialCategories(finishingList).map((item) => ({
        value: item,
        label: item,
      })),
    [finishingList],
  )

  const atapMaterialOptions = buildMaterialOptions(atapList, atapCategory)
  const rangkaMaterialOptions = buildMaterialOptions(rangkaList, rangkaCategory)
  const isianMaterialOptions = buildMaterialOptions(isianList, isianCategory)
  const finishingMaterialOptions = buildMaterialOptions(finishingList, finishingCategory)

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">Kategori *</label>
        <SearchDropdown
          name="category"
          required
          options={categoryDropdownOptions}
          value={category}
          onChange={onCategoryChange}
          placeholder="Pilih Kategori..."
          searchPlaceholder="Cari kategori..."
        />
      </div>

      {showAtap ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-2">Material Atap</label>
          <SearchDropdown
            options={atapCategoryOptions}
            value={atapCategory}
            onChange={(value) => {
              setAtapCategory(value)
              setAtapId('')
            }}
            placeholder="Pilih Kategori Material Atap..."
            searchPlaceholder="Cari kategori material..."
          />
          <SearchDropdown
            name="atap_id"
            required={showAtap}
            options={atapMaterialOptions}
            value={atapId}
            onChange={setAtapId}
            placeholder="Pilih Atap..."
            searchPlaceholder="Cari material atap..."
            disabled={atapMaterialOptions.length === 0}
          />
        </div>
      ) : (
        <input type="hidden" name="atap_id" value="" />
      )}

      {showRangka ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-2">Material Rangka *</label>
          <SearchDropdown
            options={rangkaCategoryOptions}
            value={rangkaCategory}
            onChange={(value) => {
              setRangkaCategory(value)
              setRangkaId('')
            }}
            placeholder="Pilih Kategori Material Rangka..."
            searchPlaceholder="Cari kategori material..."
          />
          <SearchDropdown
            name="rangka_id"
            required={showRangka}
            options={rangkaMaterialOptions}
            value={rangkaId}
            onChange={setRangkaId}
            placeholder="Pilih Rangka..."
            searchPlaceholder="Cari material rangka..."
            disabled={rangkaMaterialOptions.length === 0}
          />
        </div>
      ) : (
        <input type="hidden" name="rangka_id" value="" />
      )}

      {showIsian ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-2">Material Isian *</label>
          <SearchDropdown
            options={isianCategoryOptions}
            value={isianCategory}
            onChange={(value) => {
              setIsianCategory(value)
              setIsianId('')
            }}
            placeholder="Pilih Kategori Material Isian..."
            searchPlaceholder="Cari kategori material..."
          />
          <SearchDropdown
            name="isian_id"
            required={showIsian}
            options={isianMaterialOptions}
            value={isianId}
            onChange={setIsianId}
            placeholder="Pilih Isian..."
            searchPlaceholder="Cari material isian..."
            disabled={isianMaterialOptions.length === 0}
          />
        </div>
      ) : (
        <input type="hidden" name="isian_id" value="" />
      )}

      {showFinishing ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-2">Jenis Finishing *</label>
          <SearchDropdown
            options={finishingCategoryOptions}
            value={finishingCategory}
            onChange={(value) => {
              setFinishingCategory(value)
              setFinishingId('')
            }}
            placeholder="Pilih Kategori Material Finishing..."
            searchPlaceholder="Cari kategori material..."
          />
          <SearchDropdown
            name="finishing_id"
            required={showFinishing}
            options={finishingMaterialOptions}
            value={finishingId}
            onChange={setFinishingId}
            placeholder="Pilih Finishing..."
            searchPlaceholder="Cari material finishing..."
            disabled={finishingMaterialOptions.length === 0}
          />
        </div>
      ) : (
        <input type="hidden" name="finishing_id" value="" />
      )}
    </>
  )
}
