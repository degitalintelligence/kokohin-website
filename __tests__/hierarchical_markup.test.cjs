/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

function readFile(filePath) {
  return readFileSync(filePath, 'utf-8')
}

let allPassed = true

// Test 1: Migrasi Hierarchical Builder
try {
  const migrationPath = join(__dirname, '../supabase/migrations/20260226_quotation_hierarchical_builder.sql')
  if (!existsSync(migrationPath)) {
    throw new Error(`File migrasi tidak ditemukan: ${migrationPath}`)
  }
  const migrationContent = readFile(migrationPath)
  
  if (!migrationContent.includes('CREATE TABLE public.erp_customer_profiles')) {
    throw new Error('Migrasi harus membuat tabel erp_customer_profiles')
  }
  if (!migrationContent.includes('ADD COLUMN builder_costs jsonb DEFAULT \'[]\'')) {
    throw new Error('Migrasi harus menambahkan kolom builder_costs ke erp_quotation_items')
  }
  if (!migrationContent.includes('ADD COLUMN markup_flat_fee decimal(15,2) DEFAULT 0')) {
    throw new Error('Migrasi harus menambahkan kolom markup_flat_fee ke erp_quotation_items')
  }
  
  console.log('✅ Test 1 passed: Migrasi Hierarchical Builder valid')
} catch (error) {
  console.error('❌ Test 1 failed:', error.message)
  allPassed = false
}

// Test 2: Logika Server Action Markup (Line #1 Only)
try {
  const actionPath = join(__dirname, '../src/app/actions/quotations.ts')
  const actionContent = readFile(actionPath)
  
  if (!actionContent.includes('markup_flat_fee: idx === 0 ? (item.markup_flat_fee || 0) : 0')) {
    throw new Error('Server action harus membatasi markup_flat_fee hanya pada Line #1 (idx === 0)')
  }
  
  console.log('✅ Test 2 passed: Logika Server Action Markup valid')
} catch (error) {
  console.error('❌ Test 2 failed:', error.message)
  allPassed = false
}

// Test 3: PDF Markup Filtering
try {
  const pdfPath = join(__dirname, '../src/lib/pdf-generator.tsx')
  const pdfContent = readFile(pdfPath)
  
  if (!pdfContent.includes('!name.includes(\'markup\') && !name.includes(\'mark-up\')')) {
    throw new Error('PDF Generator harus memfilter item yang mengandung kata "markup" atau "mark-up"')
  }
  
  // Pastikan HPP dan Margin disembunyikan dari footer
  if (pdfContent.includes('Total HPP Material & Jasa') || pdfContent.includes('Margin ({data.estimation.margin_percentage}%)')) {
    throw new Error('PDF Generator masih menampilkan rincian HPP atau Margin internal di footer')
  }
  
  console.log('✅ Test 3 passed: PDF Markup Filtering valid')
} catch (error) {
  console.error('❌ Test 3 failed:', error.message)
  allPassed = false
}

if (!allPassed) {
  process.exit(1)
}
