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
  },
  toEqual: (expected) => {
    const a = JSON.stringify(actual)
    const b = JSON.stringify(expected)
    if (a !== b) throw new Error(`Expected ${b}, got ${a}`)
  }
})

const filterZones = (zones, query) => zones.filter((zone) => zone.name.toLowerCase().includes(query.toLowerCase()))
const filterTerms = (terms, query) => terms.filter((term) => term.name.toLowerCase().includes(query.toLowerCase()))
const pickDefaultTermId = (terms) => {
  const found = terms.find((term) => term.is_default)
  return found ? found.id : ''
}

console.log('Running ERP metadata hook logic tests...')

test('filters zones case-insensitively', () => {
  const zones = [{ id: '1', name: 'Jakarta Barat' }, { id: '2', name: 'Bandung Timur' }]
  expect(filterZones(zones, 'jakarta').map((zone) => zone.id)).toEqual(['1'])
})

test('filters payment terms case-insensitively', () => {
  const terms = [{ id: 'a', name: 'Termin 50/50' }, { id: 'b', name: 'Termin 30/70' }]
  expect(filterTerms(terms, '30').map((term) => term.id)).toEqual(['b'])
})

test('picks default payment term when available', () => {
  const terms = [{ id: 'a', name: 'Termin A', is_default: false }, { id: 'b', name: 'Termin B', is_default: true }]
  expect(pickDefaultTermId(terms)).toBe('b')
})

test('returns empty default term when none is marked', () => {
  const terms = [{ id: 'a', name: 'Termin A', is_default: false }]
  expect(pickDefaultTermId(terms)).toBe('')
})

if (!passed) process.exit(1)
console.log('All ERP metadata hook logic tests passed!')
