import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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
    if (actual !== expected) throw new Error(`Expected "${expected}", got "${actual}"`)
  },
  toBeTrue: () => {
    if (!actual) throw new Error(`Expected truthy, got "${actual}"`)
  }
})

const helperPath = path.join(process.cwd(), 'src', 'lib', 'quotation-pdf-helpers.js')
const helpers = await import(pathToFileURL(helperPath).href)

console.log('Running Quotation PDF rules tests...')

test('nomor penawaran tidak hard-coded dan mengikuti input terkini', () => {
  expect(helpers.normalizeQuotationNumber('QTN-20260304-ABCD', 'fallback-id')).toBe('QTN-20260304-ABCD')
  expect(helpers.normalizeQuotationNumber('', '1234567890abcdef')).toBe('QTN-12345678')
})

test('alamat fallback menjadi "tempat" saat kosong', () => {
  expect(helpers.normalizeAddressForSalutation('')).toBe('tempat')
  expect(helpers.normalizeAddressForSalutation('Jl. Raya Serpong')).toBe('Jl. Raya Serpong')
})

test('validasi URL gambar item sebelum rendering', () => {
  expect(helpers.normalizeImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  expect(helpers.normalizeImageUrl('/storage/a.jpg')).toBe('/storage/a.jpg')
  expect(helpers.normalizeImageUrl('invalid-url')).toBe(null)
})

test('urutan section PDF konsisten A lalu B lalu C', () => {
  const pdfFilePath = path.join(process.cwd(), 'src', 'components', 'calculator', 'QuotationPDF.tsx')
  const source = fs.readFileSync(pdfFilePath, 'utf8')
  const idxA = source.indexOf('A. RINCIAN SPESIFIKASI & INVESTASI')
  const idxB = source.indexOf('B. REKAPITULASI BIAYA')
  const idxC = source.indexOf('C. KETENTUAN (T&C)')
  expect(idxA > -1 && idxB > idxA && idxC > idxB).toBeTrue()
})

if (!passed) process.exit(1)
console.log('All Quotation PDF rules tests passed!')
