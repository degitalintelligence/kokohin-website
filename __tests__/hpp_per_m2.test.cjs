/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Helper untuk membaca file
function readFile(filePath) {
  return readFileSync(filePath, 'utf-8')
}

let allPassed = true

// Test 1: Migrasi catalogs/hpp_log harus mengandung kolom yang benar
try {
  const migrationPath = join(__dirname, '../supabase/migrations/20260224_add_std_calculation_to_catalogs.sql')
  if (!existsSync(migrationPath)) {
    throw new Error(`File migrasi tidak ditemukan: ${migrationPath}`)
  }
  const migrationContent = readFile(migrationPath)
  
  if (!migrationContent.includes('std_calculation numeric DEFAULT 1.00')) {
    throw new Error('Migrasi harus menambahkan kolom std_calculation')
  }
  if (!migrationContent.includes('use_std_calculation boolean DEFAULT false')) {
    throw new Error('Migrasi harus menambahkan kolom use_std_calculation')
  }
  if (!migrationContent.includes('CREATE TABLE public.catalog_hpp_log')) {
    throw new Error('Migrasi harus membuat tabel catalog_hpp_log')
  }
  
  console.log('✅ Test 1 passed: Migrasi HPP per m2 valid')
} catch (error) {
  console.error('❌ Test 1 failed:', error.message)
  allPassed = false
}

// Test 2: updateHppPerUnit harus menggunakan std_calculation jika use_std_calculation aktif
try {
  const actionsPath = join(__dirname, '../src/app/actions/catalogs.ts')
  const actionsContent = readFile(actionsPath)
  
  if (!actionsContent.includes('catalog.use_std_calculation && catalog.std_calculation')) {
    throw new Error('updateHppPerUnit tidak mengecek use_std_calculation atau std_calculation')
  }
  if (!actionsContent.includes('totalCost / catalog.std_calculation')) {
    throw new Error('updateHppPerUnit tidak membagi total cost dengan std_calculation')
  }
  
  console.log('✅ Test 2 passed: Logic updateHppPerUnit sudah mendukung pembagian m2')
} catch (error) {
  console.error('❌ Test 2 failed:', error.message)
  allPassed = false
}

// Test 3: catalog/id/page.tsx harus menampilkan warning HPP
try {
  const pagePath = join(__dirname, '../src/app/admin/(dashboard)/catalogs/[id]/page.tsx')
  const pageContent = readFile(pagePath)
  
  if (!pageContent.includes('hppRatio > 75')) {
    throw new Error('Halaman detail tidak memiliki logic warning HPP > 75%')
  }
  if (!pageContent.includes('hppRatio > 80')) {
    throw new Error('Halaman detail tidak memiliki logic warning HPP > 80%')
  }
  if (!pageContent.includes('isHppWarning && (')) {
    throw new Error('Halaman detail tidak merender UI warning HPP')
  }
  
  console.log('✅ Test 3 passed: UI detail katalog sudah memiliki warning margin/HPP')
} catch (error) {
  console.error('❌ Test 3 failed:', error.message)
  allPassed = false
}

// Test 4: updateHppPerUnit harus menyimpan audit log
try {
  const actionsPath = join(__dirname, '../src/app/actions/catalogs.ts')
  const actionsContent = readFile(actionsPath)
  
  if (!actionsContent.includes(".from('catalog_hpp_log').insert(")) {
    throw new Error('updateHppPerUnit tidak menyimpan data ke catalog_hpp_log')
  }
  
  console.log('✅ Test 4 passed: Audit trail HPP terverifikasi')
} catch (error) {
  console.error('❌ Test 4 failed:', error.message)
  allPassed = false
}

// Test 5: API route harus mengembalikan hpp_per_m2 dan total_cost
try {
  const apiPath = join(__dirname, '../src/app/api/public/catalogs/route.ts')
  const apiContent = readFile(apiPath)
  
  if (!apiContent.includes('hpp_per_m2:')) {
    throw new Error('API route tidak mengembalikan hpp_per_m2')
  }
  if (!apiContent.includes('total_cost:')) {
    throw new Error('API route tidak mengembalikan total_cost')
  }
  
  console.log('✅ Test 5 passed: API public catalogs sudah diupdate')
} catch (error) {
  console.error('❌ Test 5 failed:', error.message)
  allPassed = false
}

if (allPassed) {
  console.log('🎉 Semua test HPP per m2 passed!')
  process.exit(0)
} else {
  console.log('❌ Beberapa test HPP per m2 failed')
  process.exit(1)
}
