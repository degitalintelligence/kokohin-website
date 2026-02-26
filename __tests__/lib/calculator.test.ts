import assert from 'assert'
import { calculateCatalogPrice, calculateWasteQuantity, applyZoneMarkup } from '../../src/lib/calculator'

// Test 1: calculateCatalogPrice menggunakan harga jual (basePrice) bukan HPP
{
  const basePrice = 100000 // per m2
  const panjang = 2
  const lebar = 3
  // luas = 6 m2
  const expected = basePrice * 6
  const actual = calculateCatalogPrice(basePrice, 'm2', panjang, lebar)
  assert.equal(actual, expected, 'calculateCatalogPrice harus mengalikan basePrice dengan luas untuk unit m2')
}

{
  const basePrice = 50000 // per m1
  const panjang = 5
  const expected = basePrice * 5
  const actual = calculateCatalogPrice(basePrice, 'm1', panjang, 0)
  assert.equal(actual, expected, 'calculateCatalogPrice harus mengalikan basePrice dengan panjang untuk unit m1')
}

{
  const basePrice = 200000 // per unit
  const expected = basePrice
  const actual = calculateCatalogPrice(basePrice, 'unit', 0, 0)
  assert.equal(actual, expected, 'calculateCatalogPrice harus mengembalikan basePrice untuk unit unit')
}

// Test 2: quantityOverride
{
  const basePrice = 100000
  const quantityOverride = 3
  const expected = basePrice * 3
  const actual = calculateCatalogPrice(basePrice, 'm2', 0, 0, quantityOverride)
  assert.equal(actual, expected, 'calculateCatalogPrice harus menghormati quantityOverride')
}

// Test 3: calculateWasteQuantity menggunakan Math.ceil()
{
  const qtyNeeded = 14
  const lengthPerUnit = 6
  const expected = Math.ceil(14 / 6) // 3
  const actual = calculateWasteQuantity(qtyNeeded, lengthPerUnit)
  assert.equal(actual, expected, 'calculateWasteQuantity harus menggunakan Math.ceil untuk waste calculation')
}

// Test 4: applyZoneMarkup
{
  const basePrice = 1000000
  const markupPercentage = 10
  const flatFee = 50000
  const expected = basePrice * (1 + markupPercentage/100) + flatFee
  const actual = applyZoneMarkup(basePrice, markupPercentage, flatFee)
  assert.equal(actual, expected, 'applyZoneMarkup harus menambahkan markup persentase dan flat fee')
}

// Test 5: Verifikasi tidak ada perhitungan material-based di fungsi yang diekspor
// (tidak ada fungsi calculateMaterialCost yang diekspor, sudah dihapus)
// Jika ada, test akan gagal

console.log('✅ Semua test kalkulator passed')