/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.substring(0, eqIndex).trim()
    const value = trimmed.substring(eqIndex + 1).trim()
    env[key] = value.replace(/^['"]|['"]$/g, '')
  }
  return env
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  let envFile = {}
  if (fs.existsSync(envPath)) {
    envFile = parseEnvFile(envPath)
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envFile.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envFile.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || (!anonKey && !serviceKey)) {
    throw new Error('Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY')
  }
  const key = serviceKey || anonKey
  return { supabaseUrl, key }
}

async function fetchDbSets(supabase) {
  const { data: all } = await supabase.from('materials').select('id,code,name,category,unit,base_price_per_unit,length_per_unit,is_active').order('created_at', { ascending: false })
  const { data: calc } = await supabase.from('materials').select('id,code,name,category,unit,base_price_per_unit,length_per_unit,is_active').eq('category', 'frame').eq('is_active', true).order('name')
  const { data: catalogs } = await supabase.from('catalogs').select('id,title,atap_id,rangka_id')
  return { all: all || [], calc: calc || [], catalogs: catalogs || [] }
}

function listFiles(dir) {
  const out = []
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    const entries = fs.readdirSync(cur, { withFileTypes: true })
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const p = path.join(cur, e.name)
      if (e.isDirectory()) {
        if (p.includes('node_modules') || p.includes('.next')) continue
        stack.push(p)
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        out.push(p)
      }
    }
  }
  return out
}

function extractSnippet(text, idx, radiusLines = 3) {
  let start = idx
  let end = idx
  let linesBefore = 0
  let linesAfter = 0
  while (start > 0 && linesBefore < radiusLines) {
    if (text[start] === '\n') linesBefore++
    start--
  }
  while (end < text.length && linesAfter < radiusLines) {
    if (text[end] === '\n') linesAfter++
    end++
  }
  return text.slice(start, end).trim()
}

function scanHardcodedMaterials(rootDir) {
  const results = []
  const files = listFiles(rootDir)
  const patterns = [
    /const\s+[A-Za-z0-9_]*[Mm]aterials[A-Za-z0-9_]*\s*=\s*\[/,
    /name\s*:\s*['"][^'"]+['"][\s\S]{0,200}category\s*:\s*['"](atap|frame|aksesoris|lainnya)['"][\s\S]{0,200}unit\s*:\s*['"][a-z0-9]+['"]/i,
    /\bbase_price_per_unit\b/
  ]
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    const snippets = []
    for (const pat of patterns) {
      const m = text.match(pat)
      if (m) {
        const idx = m.index || 0
        const sn = extractSnippet(text, idx, 4)
        snippets.push({ pattern: pat.toString(), snippet: sn })
      }
    }
    if (snippets.length > 0) {
      results.push({ file, snippets })
    }
  }
  return results
}

function compareSets(dbAll, uiCalc) {
  const dbMap = new Map(dbAll.map(m => [m.id, m]))
  const calcIds = new Set(uiCalc.map(m => m.id))
  const missingInDb = []
  const extraInCalc = []
  for (const id of calcIds) {
    if (!dbMap.has(id)) extraInCalc.push(id)
  }
  for (const id of dbMap.keys()) {
    if (!calcIds.has(id) && dbMap.get(id).category === 'frame' && dbMap.get(id).is_active) {
      missingInDb.push(id)
    }
  }
  return { missingInDb, extraInCalc }
}

function validateCatalogRefs(catalogs, dbAll) {
  const ids = new Set(dbAll.map(m => m.id))
  const missing = []
  for (const c of catalogs) {
    const miss = []
    if (c.atap_id && !ids.has(c.atap_id)) miss.push({ field: 'atap_id', value: c.atap_id })
    if (c.rangka_id && !ids.has(c.rangka_id)) miss.push({ field: 'rangka_id', value: c.rangka_id })
    if (miss.length > 0) missing.push({ catalogId: c.id, title: c.title, missing })
  }
  return missing
}

async function main() {
  const start = Date.now()
  const { supabaseUrl, key } = loadEnv()
  const supabase = createClient(supabaseUrl, key)
  const { all, calc, catalogs } = await fetchDbSets(supabase)
  const hardcoded = scanHardcodedMaterials(path.join(__dirname, '..', 'src'))
  const compare = compareSets(all, calc)
  const broken = validateCatalogRefs(catalogs, all)
  const report = {
    timestamp: new Date().toISOString(),
    dbMaterialsCount: all.length,
    uiCalculatorMaterialsCount: calc.length,
    dbVsUiDiff: compare,
    catalogBrokenReferences: broken,
    hardcodedCandidates: hardcoded.map(h => ({ file: path.relative(path.join(__dirname, '..'), h.file), matches: h.snippets })),
    sampleDbMaterials: all.slice(0, 5).map(m => ({ id: m.id, code: m.code, name: m.name, category: m.category, unit: m.unit }))
  }
  const outPath = path.join(process.cwd(), 'materials-verification-report.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  console.log('=== Materials Verification Summary ===')
  console.log(`DB materials: ${report.dbMaterialsCount}`)
  console.log(`UI calculator materials: ${report.uiCalculatorMaterialsCount}`)
  console.log(`Broken catalog refs: ${report.catalogBrokenReferences.length}`)
  console.log(`Hardcoded candidates: ${report.hardcodedCandidates.length} files`)
  console.log(`Report written to: ${outPath}`)
  console.log('=====================================')
  console.log(JSON.stringify(report, null, 2))
  console.log(`Done in ${Date.now() - start}ms`)
}

main().catch((e) => {
  console.error('Verification failed:', e.message || String(e))
  process.exit(1)
})
