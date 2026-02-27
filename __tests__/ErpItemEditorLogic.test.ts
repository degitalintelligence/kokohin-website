
import { describe, it, expect } from 'vitest'

type TestBuilderCost = {
  subtotal?: number
}

type TestItem = {
  unit?: string
  panjang?: number
  lebar?: number
  unit_qty?: number
  quantity?: number
  builder_costs: TestBuilderCost[]
  markup_percentage?: number
  markup_flat_fee?: number
}

type TestZone = {
  markup_percentage?: number | string
  flat_fee?: number | string
} | null

function calculateMinPrice(item: TestItem, selectedZone: TestZone, index: number) {
  const totalHpp = item.builder_costs.reduce((acc: number, cost: TestBuilderCost) => acc + (cost.subtotal || 0), 0)
  const catalogMargin = 30 
  
  const unit = item.unit === 'm²' ? 'm2' : item.unit === 'm¹' ? 'm1' : 'unit'
  const computedQty = unit === 'm2' 
    ? (item.panjang || 0) * (item.lebar || 0) 
    : unit === 'm1' 
      ? (item.panjang || 0) 
      : (item.unit_qty || item.quantity || 1)
  
  const baseHppPerUnit = totalHpp / (computedQty || 1)
  const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)
  
  const markupPercentage = selectedZone ? Number(selectedZone.markup_percentage || 0) : (item.markup_percentage || 0)
  const flatFee = (index === 0 && selectedZone) ? Number(selectedZone.flat_fee || 0) : (index === 0 ? (item.markup_flat_fee || 0) : 0)
  
  const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))
  return Math.ceil(priceAfterMargin + markupNominalPerUnit)
}

describe('ErpItemEditor Min Price Logic', () => {
  it('should calculate min price correctly with zone markup', () => {
    const item = {
      unit: 'm²',
      panjang: 2,
      lebar: 5, // total 10m2
      quantity: 10,
      builder_costs: [
        { subtotal: 1000000 } // Total HPP 1.000.000
      ]
    }
    const selectedZone = {
      markup_percentage: 10,
      flat_fee: 50000
    }

    // baseHppPerUnit = 1.000.000 / 10 = 100.000
    // priceAfterMargin = 100.000 * 1.3 = 130.000
    // markupNominalPerUnit = (130.000 * 0.1) + (50.000 / 10) = 13.000 + 5.000 = 18.000
    // expected = 130.000 + 18.000 = 148.000

    const result = calculateMinPrice(item, selectedZone, 0)
    expect(result).toBe(148000)
  })

  it('should only apply flat fee to the first item (index 0)', () => {
    const item = {
      unit: 'unit',
      quantity: 1,
      builder_costs: [{ subtotal: 100000 }]
    }
    const selectedZone = { markup_percentage: 0, flat_fee: 50000 }

    const priceIdx0 = calculateMinPrice(item, selectedZone, 0)
    const priceIdx1 = calculateMinPrice(item, selectedZone, 1)

    // Index 0: 100k * 1.3 + 50k = 180k
    // Index 1: 100k * 1.3 + 0 = 130k
    expect(priceIdx0).toBe(180000)
    expect(priceIdx1).toBe(130000)
  })
})
