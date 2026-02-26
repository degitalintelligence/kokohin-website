'use client'

import { useMemo, useState } from 'react'

type Option = { id: string; name: string }
type Category = '' | 'kanopi' | 'pagar' | 'railing' | 'aksesoris' | 'lainnya'

export default function CatalogBaseFields({
  atapList,
  rangkaList,
  finishingList,
  isianList,
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
  initialCategory?: Category
  initialAtapId?: string
  initialRangkaId?: string
  initialFinishingId?: string
  initialIsianId?: string
}) {
  const [category, setCategory] = useState<Category>(initialCategory || '')
  const [atapId, setAtapId] = useState(initialAtapId || '')
  const [rangkaId, setRangkaId] = useState(initialRangkaId || '')
  const [finishingId, setFinishingId] = useState(initialFinishingId || '')
  const [isianId, setIsianId] = useState(initialIsianId || '')

  const showAtap = useMemo(() => category === 'kanopi', [category])
  const showRangka = useMemo(() => category !== 'aksesoris' && category !== 'lainnya' && category !== '', [category])
  const showIsian = useMemo(() => category === 'pagar' || category === 'railing', [category])
  const showFinishing = useMemo(() => category !== 'aksesoris' && category !== 'lainnya' && category !== '', [category])

  const onCategoryChange = (next: Category) => {
    setCategory(next)
    if (next !== 'kanopi') setAtapId('')
    if (next !== 'pagar' && next !== 'railing') setIsianId('')
    if (next === 'aksesoris' || next === 'lainnya' || next === '') {
      setRangkaId('')
      setFinishingId('')
    }
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
          onChange={(e) => onCategoryChange(e.target.value as Category)}
        >
          <option value="">Pilih Kategori...</option>
          <option value="kanopi">Kanopi</option>
          <option value="pagar">Pagar</option>
          <option value="railing">Railing</option>
          <option value="aksesoris">Aksesoris</option>
          <option value="lainnya">Lainnya</option>
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
              <option key={m.id} value={m.id}>{m.name}</option>
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
              <option key={m.id} value={m.id}>{m.name}</option>
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
              <option key={m.id} value={m.id}>{m.name}</option>
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
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="finishing_id" value="" />
      )}
    </>
  )
}
