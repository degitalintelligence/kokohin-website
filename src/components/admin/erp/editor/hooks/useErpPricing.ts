import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCostingItems } from '@/lib/utils/costing'
import { toast } from '@/components/ui/toaster'
import type { CatalogCosting, CatalogHppComponent, ErpItem, Zone } from '../types'

interface UseErpPricingParams {
  items: ErpItem[]
  selectedZoneId: string
  zones: Zone[]
}

export function useErpPricing({ items, selectedZoneId, zones }: UseErpPricingParams) {
  const [catalogCache, setCatalogCache] = useState<Record<string, CatalogCosting>>({})
  const [catalogComponentsCache, setCatalogComponentsCache] = useState<Record<string, CatalogHppComponent[]>>({})

  useEffect(() => {
    async function fetchCatalogsAndComponents() {
      const catalogIds = Array.from(new Set(items.map(i => i.catalog_id).filter(Boolean))) as string[]
      const missingCatalogIds = catalogIds.filter(id => !catalogCache[id])
      const missingComponentIds = catalogIds.filter(id => !catalogComponentsCache[id])

      const idsToFetch = Array.from(new Set([...missingCatalogIds, ...missingComponentIds]))
      if (idsToFetch.length === 0) return

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      try {
        if (missingCatalogIds.length > 0) {
          const { data: catalogs, error: catalogError } = await supabase.from('catalogs').select('*').in('id', missingCatalogIds)
          if (catalogError) {
            console.error('Error fetching catalogs:', catalogError)
            toast.error(`Error fetching catalogs: ${catalogError.message}`)
          }
          if (catalogs) {
            setCatalogCache(prev => {
              const next = { ...prev }
              catalogs.forEach((catalog) => {
                next[catalog.id] = catalog as CatalogCosting
              })
              return next
            })
          }
        }

        if (missingComponentIds.length > 0) {
          const { data: components, error: componentError } = await supabase
            .from('catalog_hpp_components')
            .select('id, catalog_id, material_id, quantity, material:material_id(name, unit, base_price_per_unit)')
            .in('catalog_id', missingComponentIds)

          if (componentError) {
            console.error('Error fetching HPP components:', componentError)
            toast.error(`Error fetching HPP components: ${componentError.message}`)
          }

          if (components) {
            setCatalogComponentsCache(prev => {
              const next = { ...prev }
              components.forEach((component) => {
                if (!next[component.catalog_id]) next[component.catalog_id] = []
                next[component.catalog_id].push(component as unknown as CatalogHppComponent)
              })
              missingComponentIds.forEach((id) => {
                if (!next[id]) next[id] = []
              })
              return next
            })
          }
        }
      } catch (error) {
        console.error('Unexpected error in fetchCatalogsAndComponents:', error)
        toast.error('An unexpected error occurred while fetching catalog data.')
      }
    }
    fetchCatalogsAndComponents()
  }, [items, catalogCache, catalogComponentsCache])

  const getItemMinPrice = useCallback((item: ErpItem, index: number) => {
    if (item.type === 'manual' && !item.catalog_id) {
      return 0
    }

    let currentBuilderCosts = item.builder_costs

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
        item.type === 'manual' && !item.catalog_id,
        hppComponents
      )
    }

    if (!currentBuilderCosts || currentBuilderCosts.length === 0) return 0

    const totalHpp = currentBuilderCosts.reduce((acc, cost) => acc + (cost.subtotal || 0), 0)
    const catalogMargin = item.catalog_id && catalogCache[item.catalog_id]
      ? Number(catalogCache[item.catalog_id]?.margin_percentage || 30)
      : 30

    const unit = item.unit === 'm²' ? 'm2' : item.unit === 'm¹' ? 'm1' : 'unit'
    const computedQty = unit === 'm2'
      ? Math.max(1, item.panjang || 0) * Math.max(1, item.lebar || 0)
      : unit === 'm1'
        ? Math.max(1, item.panjang || 0)
        : Math.max(1, item.unit_qty || item.quantity || 1)

    const baseHppPerUnit = totalHpp / (computedQty || 1)
    const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)

    const selectedZone = zones.find(z => z.id === selectedZoneId)
    const markupPercentage = selectedZone ? Number(selectedZone.markup_percentage || 0) : (item.markup_percentage || 0)
    const flatFee = (index === 0 && selectedZone) ? Number(selectedZone.flat_fee || 0) : (index === 0 ? (item.markup_flat_fee || 0) : 0)

    const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))
    return Math.ceil(priceAfterMargin + markupNominalPerUnit)
  }, [catalogCache, catalogComponentsCache, selectedZoneId, zones])

  const totalAmount = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items])
  const totalMinAmount = useMemo(() => items.reduce((acc, item, idx) => acc + (getItemMinPrice(item, idx) * item.quantity), 0), [items, getItemMinPrice])
  const isBelowMinAnyItem = useMemo(() => {
    return items.some((item, idx) => {
      const minPrice = getItemMinPrice(item, idx)
      return minPrice > 0 && item.unit_price < minPrice
    })
  }, [items, getItemMinPrice])

  return {
    catalogCache,
    setCatalogCache,
    catalogComponentsCache,
    totalAmount,
    totalMinAmount,
    isBelowMinAnyItem,
    getItemMinPrice,
  }
}
