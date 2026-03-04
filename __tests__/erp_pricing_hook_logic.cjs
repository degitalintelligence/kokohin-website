let passed = true

const test = (name, fn) => {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
  } catch (error) {
    console.error(`❌ FAIL: ${name}`, error)
    passed = false
  }
}

const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`)
  }
})

const getItemMinPrice = ({ item, index, selectedZone }) => {
  const builderCosts = item.builder_costs || []
  if (builderCosts.length === 0) return 0

  const totalHpp = builderCosts.reduce((acc, cost) => acc + (cost.subtotal || 0), 0)
  const catalogMargin = Number(item.margin_percentage || 30)
  const unit = item.unit === 'm²' ? 'm2' : item.unit === 'm¹' ? 'm1' : 'unit'
  const computedQty = unit === 'm2'
    ? Math.max(1, item.panjang || 0) * Math.max(1, item.lebar || 0)
    : unit === 'm1'
      ? Math.max(1, item.panjang || 0)
      : Math.max(1, item.unit_qty || item.quantity || 1)

  const baseHppPerUnit = totalHpp / (computedQty || 1)
  const priceAfterMargin = baseHppPerUnit * (1 + catalogMargin / 100)
  const markupPercentage = selectedZone ? Number(selectedZone.markup_percentage || 0) : Number(item.markup_percentage || 0)
  const flatFee = index === 0 ? Number(selectedZone?.flat_fee || item.markup_flat_fee || 0) : 0
  const markupNominalPerUnit = (priceAfterMargin * (markupPercentage / 100)) + (flatFee / (computedQty || 1))

  return Math.ceil(priceAfterMargin + markupNominalPerUnit)
}

console.log('Running ERP pricing hook logic tests...')

test('calculates min price with zone percentage and flat fee on first line', () => {
  const result = getItemMinPrice({
    item: {
      unit: 'm²',
      panjang: 2,
      lebar: 5,
      quantity: 10,
      margin_percentage: 30,
      builder_costs: [{ subtotal: 1000000 }]
    },
    index: 0,
    selectedZone: { markup_percentage: 10, flat_fee: 50000 }
  })
  expect(result).toBe(148000)
})

test('does not apply flat fee on non-first line', () => {
  const result = getItemMinPrice({
    item: {
      unit: 'unit',
      quantity: 1,
      margin_percentage: 30,
      builder_costs: [{ subtotal: 100000 }]
    },
    index: 1,
    selectedZone: { markup_percentage: 0, flat_fee: 50000 }
  })
  expect(result).toBe(130000)
})

test('returns zero when builder costs are empty', () => {
  const result = getItemMinPrice({
    item: { unit: 'unit', quantity: 1, builder_costs: [] },
    index: 0,
    selectedZone: { markup_percentage: 20, flat_fee: 100000 }
  })
  expect(result).toBe(0)
})

if (!passed) process.exit(1)
console.log('All ERP pricing hook logic tests passed!')
