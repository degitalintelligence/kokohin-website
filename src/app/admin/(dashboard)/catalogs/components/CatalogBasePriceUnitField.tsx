'use client'

import { useMemo, useState } from 'react'
import SearchDropdown, { type SearchDropdownOption } from './SearchDropdown'

export default function CatalogBasePriceUnitField({
  initialValue = 'm2',
}: {
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
  const options = useMemo<SearchDropdownOption[]>(
    () => [
      { value: 'm2', label: 'm² (Per Meter Persegi)' },
      { value: 'm1', label: 'm¹ (Per Meter Lari)' },
      { value: 'unit', label: 'unit (Per Unit/Pcs)' },
    ],
    [],
  )

  return (
    <SearchDropdown
      name="base_price_unit"
      options={options}
      value={value}
      onChange={setValue}
      placeholder="Pilih satuan..."
      searchPlaceholder="Cari satuan..."
    />
  )
}
