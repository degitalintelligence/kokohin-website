import fs from 'node:fs'
import path from 'node:path'

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
  toContain: (expected) => {
    if (!String(actual).includes(expected)) throw new Error(`Expected text to contain "${expected}"`)
  },
  toBeTrue: () => {
    if (!actual) throw new Error('Expected truthy value')
  }
})

console.log('Running ERP customer relation unit tests...')

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260304_fix_customer_quote_relations_and_delete_constraints.sql')
const migration = fs.readFileSync(migrationPath, 'utf8')

test('migration mengatur FK lead_id profile menjadi ON DELETE SET NULL', () => {
  expect(migration).toContain('ON DELETE SET NULL')
  expect(migration).toContain('erp_customer_profiles_lead_id_fkey')
})

test('migration menjaga relasi one-to-many customer ke quotation lewat lead_id', () => {
  expect(migration).toContain('idx_erp_quotations_lead_id')
  expect(migration).toContain('erp_customer_profiles_lead_id_unique')
})

test('trigger sinkronisasi lead tidak membalik relasi lead_id saat conflict phone', () => {
  expect(migration).toContain('lead_id = COALESCE(public.erp_customer_profiles.lead_id, EXCLUDED.lead_id)')
  expect(migration).toContain('ON CONFLICT (phone) DO UPDATE')
})

const metadataHookPath = path.join(process.cwd(), 'src', 'components', 'admin', 'erp', 'editor', 'hooks', 'useErpMetadata.ts')
const metadataHook = fs.readFileSync(metadataHookPath, 'utf8')

test('hook metadata menyimpan alamat ke erp_customer_profiles dan leads.location', () => {
  expect(metadataHook).toContain(".from('erp_customer_profiles')")
  expect(metadataHook).toContain(".from('leads')")
  expect(metadataHook).toContain('location: customerAddress || null')
})

if (!passed) process.exit(1)
console.log('All ERP customer relation unit tests passed!')
